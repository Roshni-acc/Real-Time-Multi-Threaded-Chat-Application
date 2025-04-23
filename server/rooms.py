from database import connect_db
def create_room(room_name):
    db = connect_db()
    cursor = db.cursor()
    cursor.execute("INSERT INTO chat_rooms (room_name) VALUES (%s)", (room_name,))
    db.commit()
    cursor.close()
    db.close()

def get_room_id(room_name):
    db = connect_db()
    cursor = db.cursor()
    cursor.execute("SELECT id FROM chat_rooms WHERE room_name = %s", (room_name,))
    result = cursor.fetchone()
    cursor.close()
    db.close()
    return result[0] if result else None
