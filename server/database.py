from pymongo import MongoClient
from datetime import datetime
from server.config import MONGO_URI, DATABASE_NAME

def get_db():
    client = MongoClient(MONGO_URI)
    return client[DATABASE_NAME]

# Function to create a new user (Registration)
def register_user(username, password_hash, full_name, email, profile_photo):
    db = get_db()
    user_data = {
        "username": username,
        "password_hash": password_hash,
        "full_name": full_name,
        "email": email,
        "profile_photo": profile_photo,
        "created_at": datetime.utcnow()
    }
    return db.users.insert_one(user_data)

# Function to check login credentials
def login_user(username_or_email):
    db = get_db()
    # Allow login by username or email
    user = db.users.find_one({
        "$or": [
            {"username": username_or_email},
            {"email": username_or_email}
        ]
    })
    return user

# Function to store messages in the database
def save_message(sender, message, room_id):
    db = get_db()
    message_data = {
        "sender": sender,
        "message": message,
        "room_id": room_id,
        "timestamp": datetime.utcnow()
    }
    return db.messages.insert_one(message_data)

# Function to retrieve chat history
def get_chat_history(room_id):
    db = get_db()
    return list(db.messages.find({"room_id": room_id}).sort("timestamp", 1))

# Function to create a new chat room
def create_room(room_name, room_code, creator_username):
    db = get_db()
    room_data = {
        "room_name": room_name,
        "room_code": room_code,
        "creator": creator_username,
        "admins": [creator_username],
        "members": [creator_username],
        "created_at": datetime.utcnow()
    }
    return db.rooms.insert_one(room_data)

# Function to get all chat rooms for a specific user
def get_rooms(username):
    db = get_db()
    return list(db.rooms.find({"members": username}).sort("created_at", -1))

# Function to add a user to a room
def add_user_to_room(room_code, username):
    db = get_db()
    return db.rooms.update_one(
        {"room_code": room_code},
        {"$addToSet": {"members": username}}
    )

# Function to get room by code
def get_room_by_code(room_code):
    db = get_db()
    return db.rooms.find_one({"room_code": room_code})

# Function to get room by ID
def get_room_by_id(room_id):
    from bson.objectid import ObjectId
    db = get_db()
    try:
        return db.rooms.find_one({"_id": ObjectId(room_id)})
    except:
        return None

# Function to remove a user from a room
def remove_user_from_room(room_id, username):
    from bson.objectid import ObjectId
    db = get_db()
    return db.rooms.update_one(
        {"_id": ObjectId(room_id)},
        {"$pull": {"members": username, "admins": username}}
    )

# Function to delete a room
def delete_room(room_id):
    from bson.objectid import ObjectId
    db = get_db()
    # Also delete messages in the room
    db.messages.delete_many({"room_id": room_id})
    return db.rooms.delete_one({"_id": ObjectId(room_id)})

# Function to get details of all members in a room
def get_room_members(member_usernames):
    db = get_db()
    return list(db.users.find(
        {"username": {"$in": member_usernames}},
        {"username": 1, "full_name": 1, "profile_photo": 1}
    ))

# Function to update profile and username
def update_user_details(old_username, new_username, new_full_name):
    db = get_db()
    # Update user document
    db.users.update_one(
        {"username": old_username},
        {"$set": {"username": new_username, "full_name": new_full_name}}
    )
    
    # Update references in rooms (members and admins)
    if old_username != new_username:
        db.rooms.update_many(
            {"members": old_username},
            {"$set": {"members.$": new_username}}
        )
        db.rooms.update_many(
            {"admins": old_username},
            {"$set": {"admins.$": new_username}}
        )
        db.rooms.update_many(
            {"creator": old_username},
            {"$set": {"creator": new_username}}
        )
        # Update messages sender
        db.messages.update_many(
            {"sender": old_username},
            {"$set": {"sender": new_username}}
        )

# Function to update room name
def update_room_name(room_id, new_name):
    from bson.objectid import ObjectId
    db = get_db()
    return db.rooms.update_one(
        {"_id": ObjectId(room_id)},
        {"$set": {"room_name": new_name}}
    )

# Function to promote a user to admin
def promote_to_admin(room_id, username):
    from bson.objectid import ObjectId
    db = get_db()
    return db.rooms.update_one(
        {"_id": ObjectId(room_id)},
        {"$addToSet": {"admins": username}}
    )

def update_profile_photo(username, filename):
    db = get_db()
    return db.users.update_one(
        {"username": username},
        {"$set": {"profile_photo": filename}}
    )
