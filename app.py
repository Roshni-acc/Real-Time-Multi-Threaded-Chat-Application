# import os
# from flask import Flask, render_template, request, redirect, url_for, session
# from flask_socketio import SocketIO, join_room, leave_room
# from werkzeug.utils import secure_filename
# from werkzeug.security import generate_password_hash, check_password_hash
# import json

# from flask import Flask, render_template, request, session
# from flask_socketio import SocketIO, emit
# import threading
# import socket
# from server.database import connect_db  # Ensure server/database.py exists and is configured correctly
# from server.config import SECRET_KEY  # Ensure server/config.py loads SECRET_KEY properly
# from werkzeug.security import generate_password_hash
# from flask import request, redirect, url_for
# from werkzeug.security import check_password_hash, generate_password_hash
# from werkzeug.utils import secure_filename


# # Flask app configuration
# app = Flask(__name__, template_folder="client/ui/templates", static_folder="client/ui/static")
# app.config['SECRET_KEY'] = SECRET_KEY
# UPLOAD_FOLDER = 'client/ui/static/uploads'
# app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
# socketio = SocketIO(app)

# # Store chat history and active rooms
# chat_history = {}

# ### ---- ROUTES ---- ###

# @app.route('/')
# def default():
#     if session.get('logged_in'):
#         return redirect(url_for('chat'))
#     return redirect(url_for('login'))

# @app.route('/register', methods=['GET', 'POST'])
# def register():
#     if request.method == 'POST':
#         username = request.form['username']
#         password = request.form['password']
#         hashed_password = generate_password_hash(password)
#         default_dp = "2.jpg"

#         # Save user details in a dummy database or file (you can replace this with a real database)
#         conn = connect_db()
#         cursor = conn.cursor()
#         try:
#             cursor.execute("INSERT INTO users (username, password_hash, profile_photo) VALUES (%s, %s, %s)", 
#                            (username, hashed_password, default_dp))
#             conn.commit()
#         except Exception as e:
#             conn.rollback()
#             return f"Error: {str(e)}"
#         finally:
#             conn.close()

#         session['logged_in'] = True
#         session['username'] = username
#         session['dp'] = f"/static/uploads/{default_dp}"
#         return redirect(url_for('profile'))
#     return render_template('register.html')

# @app.route('/login', methods=['GET', 'POST'])
# def login():
#     if request.method == 'POST':
#         username = request.form['username']
#         password = request.form['password']
#         session['logged_in'] = True
#         session['username'] = username
#         session['dp'] = f"/static/uploads/{result[1]}"


#         conn = connect_db()
#         cursor = conn.cursor()
#         cursor.execute("SELECT password_hash, profile_photo FROM users WHERE username = %s", (username,))
#         result = cursor.fetchone()
#         conn.close()

#         if result and check_password_hash(result[0], password):
#             session['logged_in'] = True
#             session['username'] = username
#             session['dp'] = f"/static/uploads/{result[1]}"
#             return redirect(url_for('chat'))
#         else:
#             return "Invalid credentials. Please try again."

#     return render_template('login.html')

# @app.route('/chat')
# def chat():
#     if not session.get('logged_in'):
#         return redirect(url_for('login'))

#     username = session['username']
#     room_id = session.get('room_id', 1)  # Default to room 1
#     dp = session.get('dp')

#     conn = connect_db()
#     cursor = conn.cursor()

#     # Fetch all available rooms
#     cursor.execute("SELECT id, room_name FROM chat_rooms ORDER BY created_at DESC")
#     rooms = cursor.fetchall()

#     # Fetch messages for the current room
#     cursor.execute("""
#         SELECT messages.sender, messages.message, messages.timestamp, users.profile_photo
#         FROM messages
#         JOIN users ON messages.sender = users.username
#         WHERE messages.room_id = %s
#         ORDER BY messages.timestamp ASC
#     """, (room_id,))
#     messages = cursor.fetchall()
#     conn.close()

#     return render_template('chat.html', username=username, dp=dp, messages=messages, rooms=rooms, current_room_id=room_id)

# @app.route('/create_room', methods=['GET', 'POST'])
# def create_room():
#     if not session.get('logged_in'):
#         return redirect(url_for('login'))

#     if request.method == 'POST':
#         room_name = request.form['room_name']
#         conn = connect_db()
#         cursor = conn.cursor()
#         cursor.execute("INSERT INTO chat_rooms (room_name, created_at) VALUES (%s, NOW())", (room_name,))
#         conn.commit()
#         conn.close()
#         return redirect(url_for('chat'))
    
#     return render_template('create_room.html')

# @app.route('/logout')
# def logout():
#     session.clear()
#     return redirect(url_for('login'))

# @app.route('/upload_dp', methods=['POST'])
# def upload_dp():
#     if not session.get('logged_in'):
#         return redirect(url_for('login'))

#     file = request.files['profile_photo']
#     if file:
#         filename = secure_filename(file.filename)
#         filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
#         file.save(filepath)

#         conn = connect_db()
#         cursor = conn.cursor()
#         cursor.execute("UPDATE users SET profile_photo = %s WHERE username = %s", (filename, session['username']))
#         conn.commit()
#         conn.close()

#         session['dp'] = f"/static/uploads/{filename}"
#         return redirect(url_for('profile'))
#     return "Failed to upload photo."

# # @app.route('/join_room/<int:room_id>')
# # def join_room(room_id):
# #     session['room_id'] = room_id  # Store the selected room ID in the session
# #     return redirect(url_for('chat'))


# @app.route('/join_room/<int:room_id>')
# def join_room(room_id):
#     # Check if the user is authenticated
#     if not session.get('logged_in'):
#         return redirect(url_for('login'))  # Redirect to login if not authenticated

#     # Save the room ID in the session
#     session['room_id'] = room_id
#     return redirect(url_for('chat'))  # Redirect to the chat page


# ### ---- SOCKET.IO EVENTS ---- ###

# # @socketio.on("join")
# # def handle_join(data):
# #     username = data.get("username")
# #     room = data.get("room")
# #     join_room(room)

# #     if room not in chat_history:
# #         chat_history[room] = []
# #     socketio.emit("message", {"username": "System", "message": f"{username} has joined the room."}, room=room)

# @socketio.on("join")
# def handle_join(data):
#     # Check if the user is authenticated
#     if not session.get('logged_in'):  # Validate the session
#         print("Unauthorized attempt to join room.")
#         return  # Ignore the event if the user is not authenticated

#     # Extract details from the session and data
#     username = session.get("username")
#     room_id = data.get("room")

#     # Join the specified room
#     join_room(room_id)
#     print(f"{username} joined room {room_id}")

#     # Notify other users in the room
#     socketio.emit("message", {
#         "username": "System",
#         "message": f"{username} has joined the room."
#     }, room=room_id)


# # @socketio.on("message")
# # def handle_message(data):
# #     if isinstance(data, str):
# #      data = json.loads(data) 
# #     username = data.get("username")
# #     dp = data.get("dp")
# #     room = data.get("room")
# #     message = data.get("message")

# #     if not all([username, room, message]):
# #         return

# #     chat_entry = {"username": username, "dp": dp, "message": message}
# #     chat_history.setdefault(room, []).append(chat_entry)
# #     socketio.emit("message", chat_entry, room=room)


# @socketio.on("message")
# def handle_message(data):
#     print(f"Session data: {session}")
#     import json

#     try:
#         # Parse incoming data if it's a string
#         if isinstance(data, str):
#             data = json.loads(data)
        
#         # Extract fields from the data dictionary
#         username = data.get("username")
#         dp = data.get("dp", "/static/uploads/2.jpg")  # Default DP
#         room = data.get("room")
#         message = data.get("message")

#         # Validate fields
#         if not all([username, room, message]):
#             print(f"Error: Missing required fields - {data}")
#             return

#         print(f"Received message: {data}")  # Debug log

#         # Insert message into the database
#         conn = connect_db()
#         cursor = conn.cursor()
#         try:
#             cursor.execute("""
#                 INSERT INTO messages (room_id, sender, message, timestamp)
#                 VALUES (%s, %s, %s, NOW())
#             """, (room, username, message))
#             conn.commit()
#             print(f"Message successfully saved: {message}")
#         except Exception as db_error:
#             conn.rollback()
#             print(f"Database error: {db_error}")
#             return
#         finally:
#             conn.close()

#         # Emit the message to the room
#         chat_entry = {"username": username, "dp": dp, "message": message}
#         socketio.emit("message", chat_entry, room=room)

#     except json.JSONDecodeError as e:
#         print(f"JSON parsing error: {e}")
#     except Exception as e:
#         print(f"Unexpected error: {e}")



# @app.route('/profile', methods=['GET', 'POST'])
# def profile():
#     if not session.get('logged_in'):
#         return redirect(url_for('login'))  # Redirect to login if not authenticated
    
#     username = session['username']
#     conn = connect_db()
#     cursor = conn.cursor()
#     cursor.execute("""
#         SELECT profile_photo, username 
#         FROM users 
#         WHERE username = %s
#     """, (username,))
#     result = cursor.fetchone()
#     conn.close()

#     if request.method == 'POST':
#         # Handle profile update logic here (e.g., updating username or profile picture)
#         session['username'] = request.form['username']
#         session['dp'] = request.form['dp']
#         return redirect(url_for('chat'))  # Redirect to chat after updating profile

#     return render_template('profile.html', username=result[1], profile_photo=result[0])
  

# ### ---- MAIN APP ENTRY POINT ---- ###
# if __name__ == "__main__":
#     socketio.run(app, port=5001, debug=True)











#  second chat given by chat gpt 

import os
from flask import Flask, render_template, request, redirect, url_for, session
from flask_socketio import SocketIO, join_room, leave_room
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from server.database import connect_db  # Database connection utility
from server.config import SECRET_KEY  # Secret key for session management

# Flask app configuration
app = Flask(__name__, template_folder="client/ui/templates", static_folder="client/ui/static")
app.config['SECRET_KEY'] = SECRET_KEY
UPLOAD_FOLDER = 'client/ui/static/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
socketio = SocketIO(app)

# Store active rooms and chat history
chat_history = {}

### ---- ROUTES ---- ###

@app.route('/')
def default():
    if session.get('logged_in'):
        return redirect(url_for('chat'))
    return redirect(url_for('login'))


@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        hashed_password = generate_password_hash(password)
        default_dp = "2.jpg"

        # Save user details in a dummy database or file (you can replace this with a real database)
        conn = connect_db()
        cursor = conn.cursor()
        try:
            cursor.execute("INSERT INTO users (username, password_hash, profile_photo) VALUES (%s, %s, %s)", 
                           (username, hashed_password, default_dp))
            conn.commit()
        except Exception as e:
            conn.rollback()
            return f"Error: {str(e)}"
        finally:
            conn.close()

        session['logged_in'] = True
        session['username'] = username
        session['dp'] = f"/static/uploads/{default_dp}"
        return redirect(url_for('profile'))
    return render_template('register.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        conn = connect_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, password_hash, profile_photo FROM users WHERE username = %s
        """, (username,))
        result = cursor.fetchone()
        conn.close()

        if result and check_password_hash(result[1], password):
            session['logged_in'] = True
            session['username'] = username
            session['id'] = result[0]  # Store `id` in the session
            session['dp'] = f"/static/uploads/{result[2]}"
            return redirect(url_for('chat'))
        else:
            return "Invalid credentials. Please try again."

    return render_template('login.html')



@app.route('/chat')
def chat():
    if not session.get('logged_in'):
        return redirect(url_for('login'))

    print(f"Session data: {session}")  # Debugging log to inspect session variables

    username = session.get('username')
    user_id = session.get('id')  # Fetch `id` from the session
    dp = session.get('dp')

    conn = connect_db()
    cursor = conn.cursor()

    # Fetch all available rooms
    cursor.execute("SELECT id, room_name FROM chat_rooms ORDER BY created_at DESC")
    rooms = cursor.fetchall()

    # Fetch chat history for the current room
    room_id = session.get('room_id', 1)  # Default to room 1 if no room selected
    cursor.execute("""
        SELECT messages.sender, messages.message, messages.timestamp, users.profile_photo
        FROM messages
        JOIN users ON messages.sender = users.username
        WHERE messages.room_id = %s
        ORDER BY messages.timestamp ASC
    """, (room_id,))
    messages = cursor.fetchall()
    conn.close()

    return render_template('chat.html', username=username, dp=dp, messages=messages, rooms=rooms, current_room_id=room_id)



@app.route('/create_room', methods=['GET', 'POST'])
def create_room():
    if not session.get('logged_in'):
        return redirect(url_for('login'))

    if request.method == 'POST':
        room_name = request.form['room_name']
        conn = connect_db()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO chat_rooms (room_name, created_at) VALUES (%s, NOW())", (room_name,))
        conn.commit()
        conn.close()
        return redirect(url_for('chat'))
    
    return render_template('create_room.html')


@app.route('/join_room/<int:room_id>')
def join_room_route(room_id):
    if not session.get('logged_in'):
        return redirect(url_for('login'))

    session['room_id'] = room_id
    return redirect(url_for('chat'))


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/profile', methods=['GET', 'POST'])
def profile():
    if not session.get('logged_in'):
        return redirect(url_for('login'))  # Redirect to login if not authenticated
    
    username = session['username']
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT profile_photo, username 
        FROM users 
        WHERE username = %s
    """, (username,))
    result = cursor.fetchone()
    conn.close()

    if request.method == 'POST':
        # Handle profile update logic here (e.g., updating username or profile picture)
        session['username'] = request.form['username']
        session['dp'] = request.form['dp']
        return redirect(url_for('chat'))  # Redirect to chat after updating profile

    return render_template('profile.html', username=result[1], profile_photo=result[0])
  


### ---- SOCKET.IO EVENTS ---- ###

@socketio.on("join")
def handle_join(data):
    if not session.get('logged_in'):
        return

    username = session['username']
    room = data.get("room")
    join_room(room)
    socketio.emit("message", {
        "username": "System",
        "message": f"{username} has joined the room."
    }, room=room)


@socketio.on("message")
def handle_message(data):
    try:
        username = session.get('username')
        room_id = session.get('room_id', 1)  # Default to room 1 if not set
        message = data.get('message')
        dp = session.get('dp')

        if not all([username, room_id, message]):
            return

        # Insert the message into the database
        conn = connect_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO messages (room_id, sender, message, timestamp)
            VALUES (%s, %s, %s, NOW())
        """, (room_id, username, message))
        conn.commit()
        conn.close()

        # Emit the message to the room
        chat_entry = {"username": username, "dp": dp, "message": message}
        socketio.emit("message", chat_entry, room=room_id)
    except Exception as e:
        print(f"Error while handling message: {e}")


### ---- MAIN APP ENTRY POINT ---- ###
if __name__ == "__main__":
    socketio.run(app, port=5001, debug=True)
