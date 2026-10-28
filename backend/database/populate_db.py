from importlib.resources import read_text
import psycopg
from dotenv import load_dotenv
import os

# Load environment variables from .env
load_dotenv()

# Fetch variables
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("Database URL Invalid")

# Connect to the database
connection = psycopg.connect(DATABASE_URL)

execution_commands = []
with open(f"{os.path.dirname(os.path.abspath(__file__))}/schema.sql", "r") as file:
    commands = file.read().split(";")
    for command in commands:
        if command.strip():
            execution_commands.append(command.strip())

# Execute commands
with connection.cursor() as cursor:
    for command in execution_commands:
        cursor.execute(command)
    connection.commit()

print("Database populated successfully")
connection.close()