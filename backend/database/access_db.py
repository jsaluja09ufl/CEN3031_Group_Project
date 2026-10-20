from importlib import resources
from dns import asyncquery
from importlib.resources import read_text
import psycopg
from dotenv import load_dotenv
import os
import password_handler

# Load environment variables from .env
load_dotenv()



class SupabaseConnect:
    def __init__(self):
        # Fetch variables
        DATABASE_URL = os.getenv("DATABASE_URL")
        if not DATABASE_URL:
            raise ValueError("Database URL Invalid")

        self.connection = psycopg.connect(DATABASE_URL)

    
    def create_user(self, username, password_hash, first_name, last_name, email):
        with self.connection.cursor() as cursor:
            self.connection.rollback()
            try:
                cursor.execute("INSERT INTO user_details (username, password_hash, first_name, last_name, email) VALUES (%s, %s, %s, %s, %s)", (username, password_hash, first_name, last_name, email))
                self.connection.commit()
            except psycopg.errors.UniqueViolation as e:
                self.connection.rollback()
                cursor.execute("INSERT INTO error_log (error_message) VALUES (%s)", (str(e),))
                self.connection.commit()
                return "Username not available"
            except psycopg.Error as e:
                self.connection.rollback()
                cursor.execute("INSERT INTO error_log (error_message) VALUES (%s)", (str(e),))
                self.connection.commit()
                return "Unknown error has occured"

    def login(self, username, password):
        with self.connection.cursor() as cursor:
            self.connection.rollback()
            cursor.execute("SELECT password_hash FROM user_details WHERE username = %s", (username,))
            result = cursor.fetchone()
            if not result:
                return (False, None)
            return (True, result[0])
    
    