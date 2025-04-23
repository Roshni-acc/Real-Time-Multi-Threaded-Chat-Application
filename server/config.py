DATABASE_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "chat_application"
}

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


# Access secrets securely
SECRET_KEY = os.getenv("SECRET_KEY")
