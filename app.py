import os
import uuid
from datetime import datetime, timezone, timedelta
from flask import (
    Flask, render_template, request, redirect, url_for,
    session, jsonify, send_from_directory
)
from flask_cors import CORS
from flask_socketio import SocketIO, join_room
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

from server.database import (
    register_user, login_user, save_message, get_chat_history,
    create_room, get_rooms, get_room_by_code, update_profile_photo,
    add_user_to_room, update_user_details, update_room_name,
    promote_to_admin, remove_user_from_room, update_user_password,
    get_room_by_id, get_room_members, delete_room
)
from server.config import (
    SECRET_KEY, MAIL_SERVER, MAIL_PORT, MAIL_USE_TLS,
    MAIL_USERNAME, MAIL_PASSWORD, MAIL_DEFAULT_SENDER
)
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer
from server.calls import register_call_events
from server.ai_bot import handle_ai_bot_query, AI_BOT_NAME, AI_BOT_DP

# Flask app configuration
FRONTEND_DIST = os.path.join(
    os.path.dirname(__file__), 'client', 'frontend', 'dist'
)

app = Flask(
    __name__,
    template_folder="client/ui/templates",
    static_folder="client/ui/static",
    static_url_path="/static"
)

app.config['SECRET_KEY'] = SECRET_KEY
UPLOAD_FOLDER = os.path.join(
    app.root_path, 'client', 'ui', 'static', 'uploads'
)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False

CORS(app, supports_credentials=True, origins=[
    "http://localhost:5173", "http://127.0.0.1:5173",
    "http://localhost:5001", "http://127.0.0.1:5001"
])

# Email Configuration
app.config['MAIL_SERVER'] = MAIL_SERVER
app.config['MAIL_PORT'] = MAIL_PORT
app.config['MAIL_USE_TLS'] = MAIL_USE_TLS
app.config['MAIL_USERNAME'] = MAIL_USERNAME
app.config['MAIL_PASSWORD'] = MAIL_PASSWORD
app.config['MAIL_DEFAULT_SENDER'] = MAIL_DEFAULT_SENDER

mail = Mail(app)
serializer = URLSafeTimedSerializer(SECRET_KEY)
socketio = SocketIO(app, cors_allowed_origins="*")
register_call_events(socketio)


@app.template_filter('to_ist')
def to_ist(dt):
    if not dt:
        return ""
    ist_dt = dt + timedelta(hours=5, minutes=30)
    return ist_dt.strftime('%H:%M')


# ---- UTILS ---- #

def get_req_data():
    if request.is_json:
        return request.get_json() or {}
    return request.form or {}


def api_response(status, message, data=None):
    return jsonify({
        "status": status,
        "message": message,
        "data": data or {}
    })


def format_user_data(user):
    if not user:
        return None
    dp = user.get('profile_photo', '2.jpg')
    if not dp.startswith('/static/'):
        dp = f"/static/uploads/{dp}"
    return {
        "username": user.get('username'),
        "full_name": user.get('full_name'),
        "email": user.get('email'),
        "dp": dp
    }


def serve_react_index():
    index_path = os.path.join(FRONTEND_DIST, 'index.html')
    if os.path.exists(index_path):
        return send_from_directory(FRONTEND_DIST, 'index.html')
    return None


def handle_register_logic(data):
    full_name = data.get('full_name', '').strip()
    email = data.get('email', '').strip()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    confirm_password = data.get('confirm_password', '')

    if not all([full_name, email, username, password, confirm_password]):
        return api_response(
            False, "All fields are required. Please fill in everything."
        ), 400

    if password != confirm_password:
        return api_response(
            False, "Passwords do not match. Please re-enter."
        ), 400

    if len(password) < 6:
        return api_response(
            False, "Security check: Password must be at least 6 characters."
        ), 400

    if "@" not in email or "." not in email:
        return api_response(False, "Please enter a valid email address."), 400

    if login_user(username):
        return api_response(
            False, "This username is already taken. Try another?"
        ), 400

    if login_user(email):
        return api_response(
            False, "An account with this email already exists."
        ), 400

    hashed_password = generate_password_hash(password)
    default_dp = "2.jpg"

    try:
        register_user(username, hashed_password, full_name, email, default_dp)
    except Exception:
        return api_response(
            False, "Registration failed due to a server error."
        ), 500

    session['logged_in'] = True
    session['username'] = username
    session['full_name'] = full_name
    session['dp'] = f"/static/uploads/{default_dp}"

    user_info = {
        "username": username,
        "full_name": full_name,
        "email": email,
        "dp": session['dp']
    }

    return api_response(
        True, "Registration successful!",
        {"user": user_info, "redirect": "/chat"}
    ), 200


def handle_login_logic(data):
    identifier = data.get('username', '').strip() or data.get(
        'identifier', ''
    ).strip()
    password = data.get('password', '')

    if not identifier or not password:
        return api_response(
            False, "Username/Email and Password are required."
        ), 400

    user = login_user(identifier)
    if user:
        if check_password_hash(user['password_hash'], password):
            session['logged_in'] = True
            session['username'] = user['username']
            session['full_name'] = user['full_name']
            session['dp'] = f"/static/uploads/{user['profile_photo']}"

            user_info = format_user_data(user)
            return api_response(
                True, "Welcome back! Login successful.",
                {"user": user_info, "redirect": "/chat"}
            ), 200
        else:
            return api_response(
                False, "Incorrect password. Please try again."
            ), 401
    else:
        return api_response(
            False, "No account found with this username/email."
        ), 404


# ---- AUTH API & PAGE ROUTES ---- #

@app.route('/')
def default_route():
    react = serve_react_index()
    if react:
        return react
    if session.get('logged_in'):
        return redirect(url_for('chat_page'))
    return redirect(url_for('login_page'))


@app.route('/api/auth/me', methods=['GET'])
def api_auth_me():
    if session.get('logged_in') and session.get('username'):
        username = session.get('username')
        user = login_user(username)
        if user:
            return api_response(True, "Authenticated", {
                "user": format_user_data(user),
                "active_room_id": session.get('room_id')
            })
    return api_response(False, "Not authenticated"), 401


@app.route('/api/auth/register', methods=['POST'])
def api_auth_register():
    res, status_code = handle_register_logic(get_req_data())
    return res, status_code


@app.route('/register', methods=['GET', 'POST'])
def register_page():
    if request.method == 'POST':
        res, status_code = handle_register_logic(get_req_data())
        if status_code == 200 and not request.is_json:
            return redirect(url_for('chat_page'))
        return res, status_code
    react = serve_react_index()
    if react:
        return react
    return render_template('register.html')


@app.route('/api/auth/login', methods=['POST'])
def api_auth_login():
    res, status_code = handle_login_logic(get_req_data())
    return res, status_code


@app.route('/login', methods=['GET', 'POST'])
def login_page():
    if request.method == 'POST':
        res, status_code = handle_login_logic(get_req_data())
        if status_code == 200 and not request.is_json:
            return redirect(url_for('chat_page'))
        return res, status_code
    react = serve_react_index()
    if react:
        return react
    return render_template('login.html')


@app.route('/api/auth/logout', methods=['POST', 'GET'])
def api_auth_logout():
    session.clear()
    return api_response(True, "Logged out successfully")


@app.route('/logout')
def logout_page():
    session.clear()
    return redirect(url_for('login_page'))


# ---- ROOM API ROUTES ---- #

@app.route('/api/rooms', methods=['GET'])
def api_get_rooms():
    if not session.get('logged_in'):
        return api_response(False, "Unauthorized"), 401

    username = session.get('username')
    rooms = get_rooms(username)
    for r in rooms:
        r['_id'] = str(r['_id'])
        if 'created_at' in r and r['created_at']:
            r['created_at'] = r['created_at'].isoformat()
    return api_response(True, "Rooms retrieved", {
        "rooms": rooms,
        "active_room_id": session.get('room_id')
    })


@app.route('/api/rooms/<room_id>', methods=['GET'])
def api_get_room_detail(room_id):
    if not session.get('logged_in'):
        return api_response(False, "Unauthorized"), 401

    username = session.get('username')
    current_room = get_room_by_id(room_id)
    if not current_room:
        return api_response(False, "Room not found"), 404

    current_room['_id'] = str(current_room['_id'])
    if username not in current_room.get('members', []):
        return api_response(False, "Not a member of this room"), 403

    session['room_id'] = room_id

    members = get_room_members(current_room.get('members', []))
    for m in members:
        if '_id' in m:
            m['_id'] = str(m['_id'])
        dp = m.get('profile_photo', '2.jpg')
        if not dp.startswith('/static/'):
            dp = f"/static/uploads/{dp}"
        m['dp'] = dp

    messages = get_chat_history(room_id)
    for msg in messages:
        msg['_id'] = str(msg['_id'])
        if 'timestamp' in msg and msg['timestamp']:
            ist_dt = msg['timestamp'] + timedelta(hours=5, minutes=30)
            msg['time_formatted'] = ist_dt.strftime('%H:%M')
            msg['timestamp'] = msg['timestamp'].isoformat()

        user = login_user(msg.get('sender', ''))
        msg['profile_photo'] = user['profile_photo'] if user else '2.jpg'
        dp = msg['profile_photo']
        if not dp.startswith('/static/'):
            dp = f"/static/uploads/{dp}"
        msg['dp'] = dp

    return api_response(True, "Room details", {
        "room": current_room,
        "members": members,
        "messages": messages,
        "is_admin": username in current_room.get('admins', []),
        "is_creator": username == current_room.get('creator')
    })


@app.route('/api/rooms/<room_id>/select', methods=['POST'])
def api_select_room(room_id):
    if not session.get('logged_in'):
        return api_response(False, "Unauthorized"), 401
    session['room_id'] = room_id
    return api_response(True, f"Room set to {room_id}")


@app.route('/api/rooms/create', methods=['POST'])
def api_create_room():
    if not session.get('logged_in'):
        return api_response(False, "Unauthorized"), 401

    data = get_req_data()
    room_name = data.get('room_name', '').strip()
    username = session['username']

    if not room_name or len(room_name) < 3:
        return api_response(
            False, "Room name must be at least 3 characters long."
        ), 400

    room_code = str(uuid.uuid4())[:8].upper()
    try:
        res = create_room(room_name, room_code, username)
        room_id = str(res.inserted_id)
        session['room_id'] = room_id
        return api_response(True, f"Room '{room_name}' created successfully!", {
            "room_id": room_id,
            "room_code": room_code,
            "redirect": "/chat"
        })
    except Exception:
        return api_response(
            False, "Failed to create room. Please try a different name."
        ), 500


@app.route('/create_room', methods=['GET', 'POST'])
def create_room_page():
    if not session.get('logged_in'):
        return redirect(url_for('login_page'))

    if request.method == 'POST':
        data = get_req_data()
        room_name = data.get('room_name', '').strip()
        username = session['username']

        if not room_name or len(room_name) < 3:
            return api_response(
                False, "Room name must be at least 3 characters long."
            ), 400

        room_code = str(uuid.uuid4())[:8].upper()
        try:
            res = create_room(room_name, room_code, username)
            session['room_id'] = str(res.inserted_id)
            return redirect(url_for('chat_page'))
        except Exception:
            return "Error creating room", 500

    react = serve_react_index()
    if react:
        return react
    return render_template('create_room.html')


@app.route('/api/rooms/join', methods=['POST'])
def api_join_room_by_code():
    if not session.get('logged_in'):
        return api_response(False, "Unauthorized"), 401

    data = get_req_data()
    room_code = data.get('room_code', '').strip().upper()
    if not room_code:
        return api_response(False, "Please enter a room code."), 400

    username = session['username']
    room = get_room_by_code(room_code)

    if room:
        room_id = str(room['_id'])
        if username in room.get('members', []):
            session['room_id'] = room_id
            return api_response(
                True, "You are already a member!",
                {"room_id": room_id, "redirect": "/chat"}
            )

        add_user_to_room(room_code, username)
        session['room_id'] = room_id

        join_msg = f"{username} has joined the chat."
        save_message("System", join_msg, room_id, message_type="system")
        socketio.emit(
            "message",
            {"username": "System", "message": join_msg, "message_type": "system"},
            room=room_id
        )

        return api_response(
            True, f"Successfully joined {room['room_name']}!",
            {"room_id": room_id, "redirect": "/chat"}
        )
    else:
        return api_response(False, "Room code not found."), 404


@app.route('/join_room_by_code', methods=['POST'])
def join_room_by_code_page():
    return api_join_room_by_code()


@app.route('/api/rooms/<room_id>/leave', methods=['POST', 'GET'])
def api_leave_room(room_id):
    if not session.get('logged_in'):
        return api_response(False, "Unauthorized"), 401

    username = session['username']
    remove_user_from_room(room_id, username)

    socketio.emit("message", {
        "username": "System",
        "message": f"{username} has left the chat.",
        "message_type": "system"
    }, room=room_id)

    if session.get('room_id') == room_id:
        session.pop('room_id', None)

    return api_response(True, "You have left the room.", {"redirect": "/chat"})


@app.route('/leave_room/<room_id>')
def leave_room_page(room_id):
    api_leave_room(room_id)
    return redirect(url_for('chat_page'))


@app.route('/api/rooms/<room_id>', methods=['DELETE'])
def api_delete_room(room_id):
    if not session.get('logged_in'):
        return api_response(False, "Unauthorized"), 401

    username = session['username']
    room = get_room_by_id(room_id)

    if room and username in room.get('admins', []):
        room_name = room.get('room_name')
        socketio.emit(
            "room_deleted",
            {"room_id": room_id, "message": f"Admin {username} deleted group '{room_name}'."},
            room=room_id
        )

        delete_room(room_id)
        if session.get('room_id') == room_id:
            session.pop('room_id', None)
        return api_response(True, "Room deleted successfully!", {"redirect": "/chat"})
    else:
        return api_response(
            False, "You do not have permission to delete this room."
        ), 403


@app.route('/delete_room/<room_id>')
def delete_room_page(room_id):
    return api_delete_room(room_id)


@app.route('/join_room/<room_id>')
def join_room_page(room_id):
    if not session.get('logged_in'):
        return redirect(url_for('login_page'))

    session['room_id'] = room_id
    react = serve_react_index()
    if react:
        return react
    return redirect(url_for('chat_page'))


@app.route('/api/profile', methods=['POST'])
def api_update_profile():
    if not session.get('logged_in'):
        return api_response(False, "Unauthorized"), 401

    data = get_req_data()
    old_username = session['username']
    new_username = data.get('username', old_username).strip()
    new_full_name = data.get('full_name', session.get('full_name', '')).strip()

    if not new_username or not new_full_name:
        return api_response(False, "Username and Full Name are required."), 400

    if new_username != old_username and login_user(new_username):
        return api_response(False, "This username is already taken."), 400

    try:
        update_user_details(old_username, new_username, new_full_name)
        session['username'] = new_username
        session['full_name'] = new_full_name
        return api_response(True, "Profile updated successfully!", {
            "user": {
                "username": new_username,
                "full_name": new_full_name,
                "dp": session.get('dp')
            }
        })
    except Exception:
        return api_response(False, "Failed to update profile."), 500


@app.route('/update_profile', methods=['POST'])
def update_profile_page():
    return api_update_profile()


@app.route('/api/rooms/<room_id>/rename', methods=['POST'])
def api_update_room_name(room_id):
    if not session.get('logged_in'):
        return api_response(False, "Unauthorized"), 401

    username = session['username']
    room = get_room_by_id(room_id)

    if not room or username not in room.get('admins', []):
        return api_response(
            False, "You don't have permission to rename this room."
        ), 403

    data = get_req_data()
    new_name = data.get('room_name', '').strip()
    if not new_name:
        return api_response(False, "Room name cannot be empty."), 400

    update_room_name(room_id, new_name)
    return api_response(True, "Room name updated!", {"new_name": new_name})


@app.route('/update_room_name/<room_id>', methods=['POST'])
def update_room_name_page(room_id):
    return api_update_room_name(room_id)


@app.route('/api/rooms/<room_id>/promote/<member_username>', methods=['POST', 'GET'])
def api_promote_member(room_id, member_username):
    if not session.get('logged_in'):
        return api_response(False, "Unauthorized"), 401

    username = session['username']
    room = get_room_by_id(room_id)

    if not room or username not in room.get('admins', []):
        return api_response(False, "Only admins can promote others."), 403

    promote_to_admin(room_id, member_username)
    return api_response(True, f"{member_username} is now an admin!")


@app.route('/promote_member/<room_id>/<member_username>')
def promote_member_page(room_id, member_username):
    return api_promote_member(room_id, member_username)


@app.route('/api/rooms/<room_id>/kick/<member_username>', methods=['POST', 'GET'])
def api_kick_member(room_id, member_username):
    if not session.get('logged_in'):
        return api_response(False, "Unauthorized"), 401

    username = session['username']
    room = get_room_by_id(room_id)

    if not room or username not in room.get('admins', []):
        return api_response(False, "Only admins can remove members."), 403

    if member_username == room.get('creator'):
        return api_response(False, "You cannot remove room creator."), 403

    remove_user_from_room(room_id, member_username)

    socketio.emit("message", {
        "username": "System",
        "message": f"Admin {username} removed {member_username}.",
        "message_type": "system"
    }, room=room_id)

    socketio.emit(
        "user_kicked",
        {"username": member_username, "room_id": room_id},
        room=room_id
    )

    return api_response(True, f"{member_username} has been removed.")


@app.route('/kick_member/<room_id>/<member_username>')
def kick_member_page(room_id, member_username):
    return api_kick_member(room_id, member_username)


@app.route('/api/auth/forgot_password', methods=['POST'])
def api_forgot_password():
    data = get_req_data()
    email = data.get('email', '').strip()
    from server.database import get_db
    db = get_db()
    user = db.users.find_one({"email": email})

    if user:
        token = serializer.dumps(email, salt='password-reset-salt')
        reset_url = url_for('reset_password_page', token=token, _external=True)

        msg = Message('Password Reset Request', recipients=[email])
        msg.body = (
            f"Hello,\n\nYou requested a password reset. Click below:\n\n"
            f"{reset_url}\n\nValid for 1 hour."
        )
        try:
            mail.send(msg)
            return api_response(
                True, "Reset link sent! Please check your email inbox."
            )
        except Exception:
            return api_response(
                False, "Failed to send reset email. Check SMTP settings."
            ), 500
    else:
        return api_response(
            False, "We couldn't find an account with that email."
        ), 404


@app.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password_page():
    if request.method == 'POST':
        return api_forgot_password()
    react = serve_react_index()
    if react:
        return react
    return render_template('forgot_password.html')


@app.route('/api/auth/reset_password/<token>', methods=['POST'])
def api_reset_password(token):
    try:
        email = serializer.loads(
            token, salt='password-reset-salt', max_age=3600
        )
    except Exception:
        return api_response(
            False, "The reset link is invalid or has expired."
        ), 400

    data = get_req_data()
    password = data.get('password', '')
    confirm_password = data.get('confirm_password', '')

    if not password or len(password) < 6:
        return api_response(
            False, "Password must be at least 6 characters."
        ), 400
    if password != confirm_password:
        return api_response(False, "Passwords do not match."), 400

    hashed_password = generate_password_hash(password)
    update_user_password(email, hashed_password)

    return api_response(
        True, "Password reset successfully!", {"redirect": "/login"}
    )


@app.route('/reset_password/<token>', methods=['GET', 'POST'])
def reset_password_page(token):
    if request.method == 'POST':
        return api_reset_password(token)
    react = serve_react_index()
    if react:
        return react
    return render_template('reset_password.html', token=token)


@app.route('/profile', methods=['GET', 'POST'])
def profile_page():
    if not session.get('logged_in'):
        return redirect(url_for('login_page'))

    react = serve_react_index()
    if react:
        return react

    username = session['username']
    user = login_user(username)
    return render_template(
        'profile.html',
        username=user['username'],
        profile_photo=user['profile_photo'],
        full_name=user['full_name'],
        email=user['email']
    )


@app.route('/upload_dp', methods=['POST'])
@app.route('/api/upload_dp', methods=['POST'])
def api_upload_dp():
    if not session.get('logged_in'):
        return api_response(False, "Unauthorized"), 401

    if 'profile_photo' not in request.files:
        return api_response(False, "No photo file provided."), 400

    file = request.files['profile_photo']
    if file.filename == '':
        return api_response(False, "No photo selected."), 400

    if file:
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{filename}"

        if not os.path.exists(app.config['UPLOAD_FOLDER']):
            os.makedirs(app.config['UPLOAD_FOLDER'])

        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(filepath)

        update_profile_photo(session['username'], unique_filename)
        session['dp'] = f"/static/uploads/{unique_filename}"
        return api_response(
            True, "Profile photo updated!", {"dp": session['dp']}
        )

    return api_response(False, "Failed to save photo."), 500


@app.route('/upload_chat_file', methods=['POST'])
@app.route('/api/upload_chat_file', methods=['POST'])
def api_upload_chat_file():
    if not session.get('logged_in'):
        return api_response(False, "Unauthorized"), 401

    if 'file' not in request.files:
        return api_response(False, "No file provided."), 400

    file = request.files['file']
    if file.filename == '':
        return api_response(False, "No file selected."), 400

    if file:
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{filename}"

        chat_files_dir = os.path.join(
            app.config['UPLOAD_FOLDER'], 'chat_files'
        )
        if not os.path.exists(chat_files_dir):
            os.makedirs(chat_files_dir)

        filepath = os.path.join(chat_files_dir, unique_filename)
        file.save(filepath)

        return api_response(True, "File uploaded successfully!", {
            "filename": filename,
            "url": f"/static/uploads/chat_files/{unique_filename}"
        })

    return api_response(False, "Failed to upload file."), 500


@app.route('/chat')
def chat_page():
    if not session.get('logged_in'):
        react = serve_react_index()
        if react:
            return react
        return redirect(url_for('login_page'))

    react = serve_react_index()
    if react:
        return react

    username = session.get('username')
    dp = session.get('dp')

    rooms = get_rooms(username)
    for r in rooms:
        r['_id'] = str(r['_id'])

    room_id = session.get('room_id')
    if not room_id and rooms:
        room_id = rooms[0]['_id']
        session['room_id'] = room_id

    messages = []
    members = []
    current_room = None
    if room_id:
        current_room = get_room_by_id(room_id)
        if not current_room:
            session.pop('room_id', None)
            return redirect(url_for('chat_page'))

        current_room['_id'] = str(current_room['_id'])
        if username not in current_room.get('members', []):
            session.pop('room_id', None)
            return redirect(url_for('chat_page'))

        members = get_room_members(current_room.get('members', []))
        messages = get_chat_history(room_id)
        for msg in messages:
            msg['_id'] = str(msg['_id'])
            user = login_user(msg['sender'])
            msg['profile_photo'] = user['profile_photo'] if user else '2.jpg'

    return render_template(
        'chat.html',
        username=username,
        dp=dp,
        messages=messages,
        rooms=rooms,
        current_room_id=str(room_id) if room_id else None,
        members=members,
        current_room=current_room
    )


# ---- SOCKET.IO EVENTS ---- #

@socketio.on("join")
def handle_join(data):
    username = session.get('username') or data.get('username')
    room = data.get("room")
    if room:
        join_room(room)
        print(f"User {username} joined room socket {room}")


@socketio.on("message")
def handle_message(data):
    try:
        username = session.get('username') or data.get('username')
        room_id = session.get('room_id') or data.get('room_id')
        message = data.get('message', '')
        message_type = data.get('message_type', 'text')
        file_info = data.get('file_info')
        dp = session.get('dp') or data.get('dp')

        if not username or not room_id:
            return

        res = save_message(
            username, message, room_id,
            message_type=message_type, file_info=file_info
        )

        now_ist = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
        time_formatted = now_ist.strftime('%H:%M')

        chat_entry = {
            "id": str(res.inserted_id) if hasattr(res, 'inserted_id') else None,
            "username": username,
            "sender": username,
            "dp": dp,
            "message": message,
            "message_type": message_type,
            "file_info": file_info,
            "room_id": room_id,
            "time_formatted": time_formatted
        }
        socketio.emit("message", chat_entry, room=room_id)

        # AI BOT TRIGGER
        if message and '@ai' in message.lower():
            bot_reply = handle_ai_bot_query(message, room_id)
            ai_res = save_message(
                AI_BOT_NAME, bot_reply, room_id, message_type="ai"
            )
            ai_entry = {
                "id": str(ai_res.inserted_id) if hasattr(ai_res, 'inserted_id') else None,
                "username": AI_BOT_NAME,
                "sender": AI_BOT_NAME,
                "dp": AI_BOT_DP,
                "message": bot_reply,
                "message_type": "ai",
                "room_id": room_id,
                "time_formatted": time_formatted
            }
            socketio.emit("message", ai_entry, room=room_id)
    except Exception as e:
        print(f"Error while handling message: {e}")


# ---- SERVE REACT FRONTEND DIST IN PROD ---- #

@app.route('/<path:path>')
def serve_static_or_react(path):
    if path.startswith('static/'):
        rel_path = path.replace('static/', '', 1)
        return send_from_directory(app.static_folder, rel_path)

    dist_file = os.path.join(FRONTEND_DIST, path)
    if os.path.exists(dist_file):
        return send_from_directory(FRONTEND_DIST, path)

    react = serve_react_index()
    if react:
        return react

    return redirect(url_for('login_page'))


# ---- MAIN APP ENTRY POINT ---- #
if __name__ == "__main__":
    socketio.run(app, port=5001, debug=True)
