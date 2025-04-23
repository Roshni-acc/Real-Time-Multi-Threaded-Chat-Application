import mysql.connector

def connect_db():
    import mysql.connector
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="chat_application"
    )

# Function to create a new user (Registration)
def register_user(username, password_hash):
    db = connect_db()
    cursor = db.cursor()
    cursor.execute("INSERT INTO users (username, password_hash) VALUES (%s, %s)", (username, password_hash))
    db.commit()
    cursor.close()
    db.close()

# Function to check login credentials
def login_user(username, password):
    db = connect_db()
    cursor = db.cursor()
    cursor.execute("SELECT password_hash FROM users WHERE username = %s", (username,))
    result = cursor.fetchone()
    cursor.close()
    db.close()

    return result[0] if result else None  # Return stored hash for verification

# Function to store messages in the database
def save_message(sender, receiver, message, room_id=None):
    db = connect_db()
    cursor = db.cursor()
    cursor.execute("INSERT INTO messages (sender, receiver, message, room_id) VALUES (%s, %s, %s, %s)",
                   (sender, receiver, message, room_id))
    db.commit()
    cursor.close()
    db.close()

# Function to retrieve chat history
def get_chat_history(username):
    db = connect_db()
    cursor = db.cursor()
    cursor.execute("SELECT sender, message, timestamp FROM messages WHERE receiver = %s OR sender = %s ORDER BY timestamp",
                   (username, username))
    result = cursor.fetchall()
    cursor.close()
    db.close()
    return result
