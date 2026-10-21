import uvicorn
from fastapi import FastAPI, Header
from dotenv import load_dotenv
import os
from database.access_db import SupabaseConnect
import password_handler
import redis
from models import EventCreate
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("FRONTEND_URL", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create an instance of the database connection
supabase_client = SupabaseConnect()

@app.get("/")
def home():
    return {"message": "Hello World"}

@app.get("/create_user/{username}/{password}/{first_name}/{last_name}/{email}")
def create_user(username, password, first_name, last_name, email):
    if not password or not username:
        return {"success": False, "error": "Missing fields"}
    
    password_hash = password_handler.hash_for_table(password)
    error = supabase_client.create_user(username, password_hash, first_name, last_name, email)
    if error:
        return {"success": False, "error": str(error)}
    return {"success": True}

@app.get("/login/{username}/{password}")
def login(username, password):
    user_password_hash = supabase_client.login(username, password)
    if user_password_hash[0]:
        if password_handler.verify_password(password, user_password_hash[1]):
            session_token = redis.create_session(username)
            return {"success": True, "session_token": session_token}
        else:
            return {"success": False, "error": "Invalid password"}
    return {"success": False, "error": "Invalid username"}

@app.get("/validate_user/{session_token}")
def validate_user(session_token):
    session = redis.validate_session(session_token)
    if session:
        return {"success": True, "session": session, "session_token": session_token}
    return {"success": False, "error": "Invalid session"}

# session token is sent as a "session-token" header: https://fastapi.tiangolo.com/tutorial/header-params/
@app.post("/events")
def create_event(event: EventCreate, session_token: str = Header()):
    session = redis.validate_session(session_token)
    if not session:
        return {"success": False, "error": "Invalid session"}

    event_id = supabase_client.create_event(session["username"], event)
    if event_id is None:
        return {"success": False, "error": "Could not create event"}
    return {"success": True, "event_id": event_id}

@app.get("/events")
def get_events(session_token: str = Header()):
    session = redis.validate_session(session_token)
    if not session:
        return {"success": False, "error": "Invalid session"}
    return {"success": True, "events": supabase_client.get_events(session["username"])}


if __name__ == "__main__":
    uvicorn.run("main:app", host=os.getenv("HOST"), port=int(os.getenv("PORT")), reload=True)