import hashlib
from dotenv import load_dotenv
import os

load_dotenv()

SECRET_PEPPER = os.getenv("PASSWORD_SECRET_PEPPER").encode('utf-8')

def hash_for_table(password: str) -> str:
    hasher = hashlib.sha256()
    hasher.update(password.encode('utf-8'))
    hasher.update(SECRET_PEPPER)
    return hasher.hexdigest()

def verify_password(password: str, stored_hash: str) -> bool:
    return hash_for_table(password) == stored_hash