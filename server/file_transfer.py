import os
from database import connect_db

def save_file_metadata(sender, receiver, filename):
    db = connect_db()
    cursor = db.cursor()
    cursor.execute("INSERT INTO files (sender, receiver, filename) VALUES (%s, %s, %s)", (sender, receiver, filename))
    db.commit()
    cursor.close()
    db.close()

def receive_file(client_socket):
    filename = client_socket.recv(1024).decode()
    file_size = int(client_socket.recv(1024).decode())
    
    with open(f"uploads/{filename}", "wb") as f:
        received_size = 0
        while received_size < file_size:
            file_data = client_socket.recv(1024)
            f.write(file_data)
            received_size += len(file_data)
    
    print(f"File {filename} received successfully!")
