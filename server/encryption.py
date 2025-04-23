from cryptography.fernet import Fernet


from config import SECRET_KEY



# Generate encryption key
def generate_key():
    key = Fernet.generate_key()
    with open("secret.key", "wb") as key_file:
        key_file.write(key)

# Load existing encryption key

def load_key():
    return SECRET_KEY.encode()

# def load_key():
#     return open("secret.key", "rb").read()

# Encrypt a message
def encrypt_message(message):
    key = load_key()
    cipher = Fernet(key)
    return cipher.encrypt(message.encode())

# Decrypt a message
def decrypt_message(encrypted_message):
    key = load_key()
    cipher = Fernet(key)
    return cipher.decrypt(encrypted_message).decode()
