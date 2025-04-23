from database import connect_db

BAD_WORDS = ["spam", "offensive_word", "hate_speech"]

def filter_message(message):
    for word in BAD_WORDS:
        if word in message.lower():
            return "*** Message Blocked ***"
    return message

def ban_user(username):
    db = connect_db()
    cursor = db.cursor()
    cursor.execute("DELETE FROM users WHERE username = %s", (username,))
    db.commit()
    cursor.close()
    db.close()
    print(f"User {username} has been banned.")
