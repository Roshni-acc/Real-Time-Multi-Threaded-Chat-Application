import socket
import threading

def receive_messages(client_socket):
    while True:
        try:
            msg = client_socket.recv(1024).decode("utf-8")
            print(f"\n{msg}")
        except:
            print("Disconnected from server.")
            break

# Client setup
client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
client_socket.connect(("127.0.0.1", 5555))  # Connect to server

# Start receiving messages in a separate thread
threading.Thread(target=receive_messages, args=(client_socket,)).start()

while True:
    msg = input("You: ")
    client_socket.send(msg.encode("utf-8"))
