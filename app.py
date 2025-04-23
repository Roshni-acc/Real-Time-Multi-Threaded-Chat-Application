from flask import Flask, render_template, request, session
from flask_socketio import SocketIO, emit
import threading
import socket
from server.database import connect_db  # Ensure server/database.py exists and is configured correctly
from server.config import SECRET_KEY  # Ensure server/config.py loads SECRET_KEY properly
from werkzeug.security import generate_password_hash
from flask import request, redirect, url_for
from werkzeug.security import check_password_hash, generate_password_hash


# Initialize Flask app
app = Flask(__name__, template_folder="client/ui/templates", static_folder="client/ui/static")

# Set up Flask secret key
app.config['SECRET_KEY'] = SECRET_KEY

# Initialize Flask-SocketIO for WebSocket handling
socketio = SocketIO(app)

# Dictionary to keep track of connected clients
clients = {}

### ---- ROUTES ---- ###

# Home route to render the chat interface
@app.route('/')
def home():
    return render_template('chat.html')  # Renders the chat.html page

# Test route for debugging
@app.route('/test')
def test():
    return "This is a test route!"

# Route to confirm WebSocket server is running
@app.route('/socket')
def socket_test():
    return "WebSocket server running!"

### ---- SOCKET.IO EVENTS ---- ###

# Handle WebSocket client connection
@socketio.on('connect')
def handle_connect():
    print("A user connected!")

# Handle incoming WebSocket messages
@socketio.on('message')
def handle_message(message):
    print(f"Received: {message}")
    emit('message', message, broadcast=True)  # Broadcast message to all connected clients


@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        hashed_password = generate_password_hash(password)

        conn = connect_db()
        cursor = conn.cursor()
        try:
            cursor.execute("INSERT INTO users (username, password_hash) VALUES (%s, %s)", (username, hashed_password))
            conn.commit()
        except Exception as e:
            conn.rollback()
            return f"Error: {str(e)}"
        finally:
            conn.close()

        return redirect(url_for('login'))  # Redirect to login page after registration
    return render_template('register.html')  # Render registration form


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
            return redirect(url_for('profile'))  # Redirect to profile page upon successful login
        else:
            return "Invalid credentials. Please try again."

    return render_template('login.html')  # Render login form

from functools import wraps

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/admin', methods=['GET', 'POST'])
@admin_required
def admin_dashboard():
  return render_template('profile.html')


@app.route('/profile', methods=['GET'])
def profile():
    if not session.get('logged_in'):
        return redirect(url_for('login'))  # Redirect to login if not authenticated
    
    username = session['username']
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("SELECT message, timestamp FROM messages WHERE id = (SELECT id FROM users WHERE username = %s)", (username,))
    chat_history = cursor.fetchall()
    conn.close()

    return render_template('profile.html', username=username, chat_history=chat_history)

### ---- MAIN APP ENTRY POINT ---- ###

if __name__ == "__main__":
    # Start the Flask app on port 5001
    socketio.run(app, port=5001, debug=True)






# from flask import Flask, render_template, request, session
# from flask_socketio import SocketIO, emit
# import threading
# import socket
# from server.database import connect_db


# from flask import Flask

# # app = Flask(__name__)

# # app = Flask(__name__)
# app = Flask(__name__, template_folder="client/ui/templates",static_folder="client/ui/static")
# from server.config import SECRET_KEY

# app.config['SECRET_KEY'] = "0de557307b0bb839e12f01a6ec1a70b71344373b29ac61bb78ebc33fcffd3d0d"

# socketio = SocketIO(app)

# clients = {}

# @socketio.on('connect')
# def handle_connect():
#     print("A user connected!")

# @socketio.on('message')
# def handle_message(message):
#     print(f"Received: {message}")
#     emit('message', message, broadcast=True)

# if __name__ == "__main__":
#     socketio.run(app, debug=True)

# if __name__ == "__main__":
#     socketio.run(app, port=5001, debug=True)




# @app.route('/')
# def home():
#     return render_template('chat.html')  # Load the main chat page


# @app.route('/')
# def home():
#     return "Home route is working!"


@app.route('/socket')
def socket_test():
    return "WebSocket server running!"


# from flask import Flask, render_template
# from flask_socketio import SocketIO

# app = Flask(__name__, template_folder="client/ui/templates")  # Specify template folder
# app.config['SECRET_KEY'] = "your_secret_key"
# socketio = SocketIO(app)

# @app.route('/')
# def home():
#     return render_template('chat.html')  # Renders your chat interface

# if __name__ == "__main__":
    # socketio.run(app, debug=True)
@app.route('/test')
def test():
    return "This is a test route!"


if __name__ == "__main__":
    app.run(port=5001, debug=True) 
