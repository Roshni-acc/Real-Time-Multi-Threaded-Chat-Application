import os
from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_socketio import SocketIO, join_room, leave_room, emit
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from server.database import (
    register_user, login_user, save_message, get_chat_history, 
    create_room, get_rooms, get_room_by_code, update_profile_photo,
    add_user_to_room, update_user_details, update_room_name,
    promote_to_admin, remove_user_from_room, update_user_password
)
from server.config import (
    SECRET_KEY, MAIL_SERVER, MAIL_PORT, MAIL_USE_TLS, 
    MAIL_USERNAME, MAIL_PASSWORD, MAIL_DEFAULT_SENDER
)
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer

# Flask app configuration
app = Flask(__name__, template_folder="client/ui/templates", static_folder="client/ui/static")
app.config['SECRET_KEY'] = SECRET_KEY
UPLOAD_FOLDER = 'client/ui/static/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Email Configuration
app.config['MAIL_SERVER'] = MAIL_SERVER
app.config['MAIL_PORT'] = MAIL_PORT
app.config['MAIL_USE_TLS'] = MAIL_USE_TLS
app.config['MAIL_USERNAME'] = MAIL_USERNAME
app.config['MAIL_PASSWORD'] = MAIL_PASSWORD
app.config['MAIL_DEFAULT_SENDER'] = MAIL_DEFAULT_SENDER

mail = Mail(app)
serializer = URLSafeTimedSerializer(SECRET_KEY)
socketio = SocketIO(app)

@app.template_filter('to_ist')
def to_ist(dt):
    if not dt: return ""
    from datetime import timedelta
    # Add 5 hours and 30 minutes for IST
    ist_dt = dt + timedelta(hours=5, minutes=30)
    return ist_dt.strftime('%H:%M')

### ---- UTILS ---- ###

def api_response(status, message, data=None):
    return jsonify({
        "status": status,
        "message": message,
        "data": data or {}
    })

### ---- ROUTES ---- ###

@app.route('/')
def default():
    if session.get('logged_in'):
        return redirect(url_for('chat'))
    return redirect(url_for('login'))


@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        full_name = request.form.get('full_name')
        email = request.form.get('email')
        username = request.form.get('username')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')

        # Validations
        if not all([full_name, email, username, password, confirm_password]):
            return api_response(False, "All fields are required. Please fill in everything."), 400
        
        if password != confirm_password:
            return api_response(False, "Passwords do not match. Please re-enter."), 400
        
        if len(password) < 6:
            return api_response(False, "Security check: Password must be at least 6 characters."), 400

        if "@" not in email or "." not in email:
            return api_response(False, "Please enter a valid email address."), 400

        # Check for existing user specifically
        db_user = login_user(username)
        if db_user:
            return api_response(False, "This username is already taken. Try another?"), 400
        
        db_email = login_user(email)
        if db_email:
            return api_response(False, "An account with this email already exists."), 400

        hashed_password = generate_password_hash(password)
        default_dp = "2.jpg"

        try:
            register_user(username, hashed_password, full_name, email, default_dp)
        except Exception as e:
            return api_response(False, "Registration failed due to a server error. Please try again later."), 500

        session['logged_in'] = True
        session['username'] = username
        session['full_name'] = full_name
        session['dp'] = f"/static/uploads/{default_dp}"
        
        # Determine if it's an AJAX request or form submission
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return api_response(True, "Registration successful!", {"redirect": url_for('chat')})
        return redirect(url_for('chat'))
        
    return render_template('register.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        identifier = request.form['username'] # Can be username or email
        password = request.form['password']

        user = login_user(identifier)

        if user:
            if check_password_hash(user['password_hash'], password):
                session['logged_in'] = True
                session['username'] = user['username']
                session['full_name'] = user['full_name']
                session['dp'] = f"/static/uploads/{user['profile_photo']}"

                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return api_response(True, "Welcome back! Login successful.", {"redirect": url_for('chat')})
                return redirect(url_for('chat'))
            else:
                return api_response(False, "Incorrect password. Please try again."), 401
        else:
            return api_response(False, "No account found with this username/email."), 404

    return render_template('login.html')



@app.route('/chat')
def chat():
    if not session.get('logged_in'):
        return redirect(url_for('login'))

    username = session.get('username')
    dp = session.get('dp')

    # Fetch rooms where user is a member
    rooms = get_rooms(username)
    for r in rooms:
        r['_id'] = str(r['_id'])

    # Fetch chat history for the current room
    room_id = session.get('room_id')
    
    # If no room selected, but there are rooms, default to the first one
    if not room_id and rooms:
        room_id = rooms[0]['_id']
        session['room_id'] = room_id
    
    messages = []
    members = []
    current_room = None
    if room_id:
        from server.database import get_room_by_id, get_room_members, get_chat_history
        current_room = get_room_by_id(room_id)
        if not current_room:
            session.pop('room_id', None)
            return redirect(url_for('chat'))
            
        current_room['_id'] = str(current_room['_id'])
        if username not in current_room.get('members', []):
            session.pop('room_id', None)
            return redirect(url_for('chat'))

        members = get_room_members(current_room.get('members', []))
        messages = get_chat_history(room_id)
        # Convert ObjectId to string for messages
        for msg in messages:
            msg['_id'] = str(msg['_id'])
            # Fetch sender's profile photo
            user = login_user(msg['sender'])
            msg['profile_photo'] = user['profile_photo'] if user else '2.jpg'

    return render_template('chat.html', 
                         username=username, 
                         dp=dp, 
                         messages=messages, 
                         rooms=rooms, 
                         current_room_id=str(room_id) if room_id else None,
                         members=members,
                         current_room=current_room)


@app.route('/create_room', methods=['GET', 'POST'])
def create_room_route():
    if not session.get('logged_in'):
        return redirect(url_for('login'))

    if request.method == 'POST':
        room_name = request.form.get('room_name', '').strip()
        username = session['username']
        
        if not room_name or len(room_name) < 3:
            return api_response(False, "Room name must be at least 3 characters long."), 400
            
        import uuid
        room_code = str(uuid.uuid4())[:8].upper()
        
        try:
            res = create_room(room_name, room_code, username)
            session['room_id'] = str(res.inserted_id)
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return api_response(True, f"Room '{room_name}' created successfully!", {
                    "room_id": str(res.inserted_id), 
                    "room_code": room_code,
                    "redirect": url_for('chat')
                })
            return redirect(url_for('chat'))
        except Exception as e:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return api_response(False, "Failed to create room. Please try a different name."), 500
            return "Error creating room", 500
    
    return render_template('create_room.html')


@app.route('/join_room_by_code', methods=['POST'])
def join_room_by_code_route():
    if not session.get('logged_in'):
        return api_response(False, "Unauthorized"), 401

    room_code = request.form.get('room_code').upper()
    if not room_code:
        return api_response(False, "Please enter a room code."), 400

    username = session['username']
    room = get_room_by_code(room_code)
    
    if room:
        if username in room.get('members', []):
            session['room_id'] = str(room['_id'])
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return api_response(True, "You are already a member! Opening room...", {"room_id": str(room['_id']), "redirect": url_for('chat')})
            return redirect(url_for('chat'))
        
        add_user_to_room(room_code, username)
        session['room_id'] = str(room['_id'])
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return api_response(True, f"Successfully joined {room['room_name']}!", {"room_id": str(room['_id']), "redirect": url_for('chat')})
        return redirect(url_for('chat'))
    else:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return api_response(False, "Room code not found. Double-check your code?"), 404
        return "Room not found", 404


@app.route('/leave_room/<room_id>')
def leave_room_route_logic(room_id):
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    
    username = session['username']
    from server.database import remove_user_from_room
    remove_user_from_room(room_id, username)
    
    # Notify room
    socketio.emit("message", {
        "username": "System",
        "message": f"{username} has left the chat."
    }, room=room_id)
    
    session.pop('room_id', None)
    return redirect(url_for('chat'))

@app.route('/delete_room/<room_id>')
def delete_room_route_logic(room_id):
    if not session.get('logged_in'):
        return api_response(False, "Unauthorized"), 401
    
    username = session['username']
    from server.database import get_room_by_id, delete_room
    room = get_room_by_id(room_id)
    
    if room and username in room.get('admins', []):
        room_name = room.get('room_name')
        # Notify room deletion before removing data
        socketio.emit("room_deleted", {"room_id": room_id, "message": f"Admin {username} has deleted the group '{room_name}'."}, room=room_id)
        
        delete_room(room_id)
        session.pop('room_id', None)
        return api_response(True, "Room deleted successfully!", {"redirect": url_for('chat')})
    else:
        return api_response(False, "You do not have permission to delete this room."), 403

@app.route('/join_room/<room_id>')
def join_room_route(room_id):
    if not session.get('logged_in'):
        return redirect(url_for('login'))

    session['room_id'] = room_id
    return redirect(url_for('chat'))


@app.route('/update_profile', methods=['POST'])
def update_profile():
    if not session.get('logged_in'):
        return api_response(False, "Unauthorized"), 401
    
    old_username = session['username']
    new_username = request.form.get('username', old_username).strip()
    new_full_name = request.form.get('full_name', session['full_name']).strip()

    if not new_username or not new_full_name:
        return api_response(False, "Username and Full Name are required."), 400

    # If username changed, check if new one exists
    if new_username != old_username:
        if login_user(new_username):
            return api_response(False, "This username is already taken."), 400

    try:
        update_user_details(old_username, new_username, new_full_name)
        session['username'] = new_username
        session['full_name'] = new_full_name
        return api_response(True, "Profile updated successfully!", {"redirect": url_for('profile')})
    except Exception as e:
        return api_response(False, "Failed to update profile."), 500

@app.route('/update_room_name/<room_id>', methods=['POST'])
def update_room_name_route(room_id):
    if not session.get('logged_in'):
        return api_response(False, "Unauthorized"), 401
    
    username = session['username']
    from server.database import get_room_by_id
    room = get_room_by_id(room_id)
    
    if not room or username not in room.get('admins', []):
        return api_response(False, "You don't have permission to rename this room."), 403
    
    new_name = request.form.get('room_name', '').strip()
    if not new_name:
        return api_response(False, "Room name cannot be empty."), 400
        
    update_room_name(room_id, new_name)
    return api_response(True, "Room name updated!", {"new_name": new_name})

@app.route('/promote_member/<room_id>/<member_username>')
def promote_member_route(room_id, member_username):
    if not session.get('logged_in'):
        return api_response(False, "Unauthorized"), 401
        
    username = session['username']
    from server.database import get_room_by_id
    room = get_room_by_id(room_id)
    
    if not room or username not in room.get('admins', []):
        return api_response(False, "Only admins can promote others."), 403
        
    promote_to_admin(room_id, member_username)
    return api_response(True, f"{member_username} is now an admin!")

@app.route('/kick_member/<room_id>/<member_username>')
def kick_member_route(room_id, member_username):
    if not session.get('logged_in'):
        return api_response(False, "Unauthorized"), 401
        
    username = session['username']
    from server.database import get_room_by_id
    room = get_room_by_id(room_id)
    
    if not room or username not in room.get('admins', []):
        return api_response(False, "Only admins can remove members."), 403
        
    if member_username == room.get('creator'):
        return api_response(False, "You cannot remove the room creator."), 403
    
    from server.database import remove_user_from_room
    remove_user_from_room(room_id, member_username)
    
    # Notify room
    socketio.emit("message", {
        "username": "System",
        "message": f"Admin {username} removed {member_username}."
    }, room=room_id)
    
    # Also notify the specific user to redirect if possible (simpler via room broadcast with check)
    socketio.emit("user_kicked", {"username": member_username, "room_id": room_id}, room=room_id)
    
    return api_response(True, f"{member_username} has been removed.")

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        email = request.form.get('email')
        from server.database import get_db
        db = get_db()
        user = db.users.find_one({"email": email})
        
        if user:
            token = serializer.dumps(email, salt='password-reset-salt')
            reset_url = url_for('reset_password', token=token, _external=True)
            
            msg = Message('Password Reset Request', recipients=[email])
            msg.body = f"Hello,\n\nYou requested a password reset. Please click the link below to reset your password (valid for 1 hour):\n\n{reset_url}\n\nIf you did not make this request, simply ignore this email."
            try:
                mail.send(msg)
                return api_response(True, "A reset link has been sent to your email! Please check your inbox.")
            except Exception as e:
                print(f"Mail delivery error: {e}")
                return api_response(False, "Failed to send reset email. Please check your SMTP settings in .env."), 500
        else:
            return api_response(False, "We couldn't find an account with that email address."), 404
            
    return render_template('forgot_password.html')

@app.route('/reset_password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    try:
        # Link expires in 3600 seconds (1 hour)
        email = serializer.loads(token, salt='password-reset-salt', max_age=3600)
    except:
        return "The reset link is invalid or has expired.", 400

    if request.method == 'POST':
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        if not password or len(password) < 6:
            return api_response(False, "Password must be at least 6 characters."), 400
        if password != confirm_password:
            return api_response(False, "Passwords do not match."), 400
            
        hashed_password = generate_password_hash(password)
        update_user_password(email, hashed_password)
        
        return api_response(True, "Your password has been reset successfully!", {"redirect": url_for('login')})

    return render_template('reset_password.html', token=token)

@app.route('/profile', methods=['GET', 'POST'])
def profile():
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    
    username = session['username']
    user = login_user(username)

    if request.method == 'POST':
        # Handled by upload_dp generally, but keeping this for structure
        return redirect(url_for('chat'))

    return render_template('profile.html', username=user['username'], profile_photo=user['profile_photo'], full_name=user['full_name'], email=user['email'])


@app.route('/upload_dp', methods=['POST'])
def upload_dp():
    if not session.get('logged_in'):
        return api_response(False, "Unauthorized"), 401

    if 'profile_photo' not in request.files:
        return api_response(False, "We couldn't find the photo file. Please try selecting it again."), 400
    
    file = request.files['profile_photo']
    if file.filename == '':
        return api_response(False, "It looks like no photo was selected. Please choose a file."), 400

    if file:
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        update_profile_photo(session['username'], filename)
        session['dp'] = f"/static/uploads/{filename}"
        return api_response(True, "Looking good! Your profile photo has been updated.", {"dp": session['dp']})
    
    return api_response(False, "Oops! Something went wrong while saving your photo. Please try again."), 500


### ---- SOCKET.IO EVENTS ---- ###

@socketio.on("join")
def handle_join(data):
    if not session.get('logged_in'):
        return

    username = session['username']
    room = data.get("room") # This is room_id
    if room:
        join_room(room)
        emit("message", {
            "username": "System",
            "message": f"{username} has joined the room."
        }, room=room)
        print(f"User {username} joined room {room}")


@socketio.on("message")
def handle_message(data):
    try:
        username = session.get('username')
        room_id = session.get('room_id')
        message = data.get('message')
        dp = session.get('dp')

        if not all([username, room_id, message]):
            return

        # Insert the message into the database
        save_message(username, message, room_id)

        # Emit the message to the room
        chat_entry = {"username": username, "dp": dp, "message": message}
        socketio.emit("message", chat_entry, room=room_id)
    except Exception as e:
        print(f"Error while handling message: {e}")


### ---- MAIN APP ENTRY POINT ---- ###
if __name__ == "__main__":
    socketio.run(app, port=5001, debug=True)
