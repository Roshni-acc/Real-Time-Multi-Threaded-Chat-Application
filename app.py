from flask import Flask, render_template, request, session
from flask_socketio import SocketIO, emit
import threading
import socket
from server.database import connect_db  # Ensure server/database.py exists and is configured correctly
from server.config import SECRET_KEY  # Ensure server/config.py loads SECRET_KEY properly
from werkzeug.security import generate_password_hash
from flask import request, redirect, url_for
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename



# # Initialize Flask app
# app = Flask(__name__, template_folder="client/ui/templates", static_folder="client/ui/static")

# # Set up Flask secret key
# app.config['SECRET_KEY'] = SECRET_KEY

# # Initialize Flask-SocketIO for WebSocket handling
# socketio = SocketIO(app)

# # Dictionary to keep track of connected clients
# clients = {}

# ### ---- ROUTES ---- ###

# # Home route to render the chat interface
# @app.route('/')
# def home():
#     return render_template('chat.html')  # Renders the chat.html page

# # Test route for debugging
# @app.route('/test')
# def test():
#     return "This is a test route!"

# # Route to confirm WebSocket server is running
# @app.route('/socket')
# def socket_test():
#     return "WebSocket server running!"

# ### ---- SOCKET.IO EVENTS ---- ###

# # Handle WebSocket client connection
# @socketio.on('connect')
# def handle_connect():
#     print("A user connected!")

# # Handle incoming WebSocket messages
# @socketio.on('message')
# def handle_message(message):
#     print(f"Received: {message}")
#     emit('message', message, broadcast=True)  # Broadcast message to all connected clients


# @app.route('/register', methods=['GET', 'POST'])
# def register():
#     if request.method == 'POST':
#         username = request.form['username']
#         password = request.form['password']
#         hashed_password = generate_password_hash(password)

#         conn = connect_db()
#         cursor = conn.cursor()
#         try:
#             cursor.execute("INSERT INTO users (username, password_hash) VALUES (%s, %s)", (username, hashed_password))
#             conn.commit()
#         except Exception as e:
#             conn.rollback()
#             return f"Error: {str(e)}"
#         finally:
#             conn.close()

#         return redirect(url_for('login'))  # Redirect to login page after registration
#     return render_template('register.html')  # Render registration form


# @app.route('/login', methods=['GET', 'POST'])
# def login():
#     if request.method == 'POST':
#         username = request.form['username']
#         password = request.form['password']

#         conn = connect_db()
#         cursor = conn.cursor()
#         cursor.execute("SELECT password_hash FROM users WHERE username = %s", (username,))
#         result = cursor.fetchone()
#         conn.close()

#         if result and check_password_hash(result[0], password):
#             session['logged_in'] = True
#             session['username'] = username
#             return redirect(url_for('profile'))  # Redirect to profile page upon successful login
#         else:
#             return "Invalid credentials. Please try again."

#     return render_template('login.html')  # Render login form

# from functools import wraps

# def admin_required(f):
#     @wraps(f)
#     def decorated_function(*args, **kwargs):
#         if not session.get('admin_logged_in'):
#             return redirect(url_for('login'))
#         return f(*args, **kwargs)
#     return decorated_function

# @app.route('/admin', methods=['GET', 'POST'])
# @admin_required
# def admin_dashboard():
#   return render_template('profile.html')


# @app.route('/profile', methods=['GET'])
# def profile():
#     if not session.get('logged_in'):
#         return redirect(url_for('login'))  # Redirect to login if not authenticated
    
#     username = session['username']
#     conn = connect_db()
#     cursor = conn.cursor()
#     cursor.execute("SELECT message, timestamp FROM messages WHERE id = (SELECT id FROM users WHERE username = %s)", (username,))
#     chat_history = cursor.fetchall()
#     conn.close()

#     return render_template('profile.html', username=username, chat_history=chat_history)

# ### ---- MAIN APP ENTRY POINT ---- ###

# if __name__ == "__main__":
#     # Start the Flask app on port 5001
#     socketio.run(app, port=5001, debug=True)






# # from flask import Flask, render_template, request, session
# # from flask_socketio import SocketIO, emit
# # import threading
# # import socket
# # from server.database import connect_db


# # from flask import Flask

# # # app = Flask(__name__)

# # # app = Flask(__name__)
# # app = Flask(__name__, template_folder="client/ui/templates",static_folder="client/ui/static")
# # from server.config import SECRET_KEY

# # app.config['SECRET_KEY'] = "0de557307b0bb839e12f01a6ec1a70b71344373b29ac61bb78ebc33fcffd3d0d"

# # socketio = SocketIO(app)

# # clients = {}

# # @socketio.on('connect')
# # def handle_connect():
# #     print("A user connected!")

# # @socketio.on('message')
# # def handle_message(message):
# #     print(f"Received: {message}")
# #     emit('message', message, broadcast=True)

# # if __name__ == "__main__":
# #     socketio.run(app, debug=True)

# # if __name__ == "__main__":
# #     socketio.run(app, port=5001, debug=True)




# # @app.route('/')
# # def home():
# #     return render_template('chat.html')  # Load the main chat page


# # @app.route('/')
# # def home():
# #     return "Home route is working!"


# @app.route('/socket')
# def socket_test():
#     return "WebSocket server running!"


# # from flask import Flask, render_template
# # from flask_socketio import SocketIO

# # app = Flask(__name__, template_folder="client/ui/templates")  # Specify template folder
# # app.config['SECRET_KEY'] = "your_secret_key"
# # socketio = SocketIO(app)

# # @app.route('/')
# # def home():
# #     return render_template('chat.html')  # Renders your chat interface

# # if __name__ == "__main__":
#     # socketio.run(app, debug=True)

# @app.route('/chat')
# def chat():
#     if not session.get('logged_in'):
#         return redirect(url_for('login'))  # Redirect to login if not authenticated
#     return render_template('chat.html', username=session['username'])

# @app.route('/test')
# def test():
#     return "This is a test route!"


# if __name__ == "__main__":
#     app.run(port=5001, debug=True) 



import os
import json 
# from flask import Flask, render_template, request, session, redirect, url_for
# from flask_socketio import SocketIO, emit
# from server.database import connect_db
# from server.config import SECRET_KEY
# from werkzeug.security import generate_password_hash, check_password_hash
# from functools import wraps
# from werkzeug.utils import secure_filename

UPLOAD_FOLDER = 'client/ui/static/uploads'  # Specify the upload directory
# app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER


# Initialize Flask app
app = Flask(__name__, template_folder="client/ui/templates", static_folder="client/ui/static")
app.config['SECRET_KEY'] = SECRET_KEY
socketio = SocketIO(app)

### ---- ROUTES ---- ###
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/')
def default():
    if session.get('logged_in'):  # Check if user is logged in
        return redirect(url_for('chat'))
    return redirect(url_for('login'))  # Otherwise, redirect to login

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        hashed_password = generate_password_hash(password)
        default_dp = "2.jpg"  # Default profile picture

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
        return redirect(url_for('profile'))  # Redirect to the profile page
    return render_template('register.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        conn = connect_db()
        cursor = conn.cursor()
        cursor.execute("SELECT password_hash FROM users WHERE username = %s", (username,))
        result = cursor.fetchone()
        conn.close()

        if result and check_password_hash(result[0], password):
            session['logged_in'] = True
            session['username'] = username
            return redirect(url_for('profile'))  # Redirect to profile page on success
        else:
            return "Invalid credentials. Please try again."

    return render_template('login.html')  # Render login form

@app.route('/chat')
def chat():
    if not session.get('logged_in'):
        return redirect(url_for('login'))

    username = session['username']
    room_id = session.get('room_id', 1)  # Default to room 1 if no room_id is set

    conn = connect_db()
    cursor = conn.cursor()

    # Fetch all available rooms
    cursor.execute("SELECT id, room_name FROM chat_rooms ORDER BY created_at DESC")
    rooms = cursor.fetchall()

    # Fetch messages for the current room
    cursor.execute("""
        SELECT messages.sender, messages.message, messages.timestamp, users.profile_photo
        FROM messages
        JOIN users ON messages.sender = users.username
        WHERE messages.room_id = %s
        ORDER BY messages.timestamp ASC
    """, (room_id,))
    messages = cursor.fetchall()
    conn.close()

    return render_template(
        'chat.html', 
        username=username, 
        messages=messages, 
        rooms=rooms, 
        current_room_id=room_id
    )


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
        return redirect(url_for('chat'))  # Redirect after room creation
    
    return render_template('create_room.html')  # Render room creation form

@app.route('/profile', methods=['GET'])
def profile():
    if not session.get('logged_in'):
        return redirect(url_for('login'))  # Redirect to login if not authenticated
    
    username = session['username']
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT messages.message, messages.timestamp
        FROM messages
        JOIN users ON messages.id = users.id
        WHERE users.username = %s
        ORDER BY messages.timestamp DESC
    """, (username,))
    chat_history = cursor.fetchall()
    conn.close()

    return render_template('profile.html', username=username, chat_history=chat_history)

@app.route('/admin')
def admin_dashboard():
    if not session.get('admin_logged_in'):
        return redirect(url_for('login'))  # Redirect to login if not an admin
    
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM admin_logs ORDER BY timestamp DESC")
    logs = cursor.fetchall()  # Fetch all admin logs
    conn.close()

    return render_template('admin.html', logs=logs)

@app.route('/upload_dp', methods=['POST'])
def upload_dp():
    if not session.get('logged_in'):
        return redirect(url_for('login'))

    file = request.files['profile_photo']
    if file:
        # Secure the filename and save to the uploads folder
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        conn = connect_db()
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET profile_photo = %s WHERE username = %s", (filename, session['username']))
        conn.commit()
        conn.close()

        return redirect(url_for('profile'))  # Redirect back to profile page after upload
    return "Failed to upload photo."

### ---- SOCKET.IO EVENTS ---- ###
@socketio.on('connect')
def handle_connect():
    print("A user connected!")

import json


@socketio.on('message')
def handle_message(data):
    print(f"Raw data received: {data}")
    print(data)
  
    
    if not session.get('logged_in'):
        return

    room_id = session.get('room_id')  # Room ID from session
    message = data.get('message')    # Message content
    username = session.get('username')  # Sender's username

    if not room_id or not message or not username:
        print("Missing data: room_id, message, or username")
        return

    # Insert the message into the database
    conn = connect_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO messages (sender, room_id, message , timestamp)
            VALUES (%s, %s, %s, NOW())
        """, (username, room_id, message))
        conn.commit()
    except Exception as e:
        print(f"Error inserting message: {e}")
    finally:
        conn.close()

    # Broadcast the message to the room
    # emit('message', {'sender': username, 'message': message}, room=room_id)
    socketio.emit('message', {'message': message}, broadcast=True)


@socketio.on('join_room')
def handle_join_room(data):
    username = session['username']
    room_id = data['room_id']

    print(f"User {username} joined Room {room_id}")
    emit('notification', f"{username} has joined the room.", room=room_id)

@app.route('/logout')
def logout():
    session.clear()  # Clear all session data
    return redirect(url_for('login'))  # Redirect to login page

@app.route('/join_room/<int:room_id>')
def join_room(room_id):
    session['room_id'] = room_id  # Save the selected room_id in the session
    return redirect(url_for('chat'))



### ---- MAIN APP ENTRY POINT ---- ###
if __name__ == "__main__":
    socketio.run(app, port=5001, debug=True)
