import os
from dotenv import load_dotenv

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DATABASE_NAME = "chat_application"

# Load environment variables from .env file
load_dotenv()


# Access secrets securely
SECRET_KEY = os.getenv("SECRET_KEY")
