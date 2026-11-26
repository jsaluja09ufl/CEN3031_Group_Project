import uvicorn
from typing import Optional
from fastapi import FastAPI, Header
from dotenv import load_dotenv
import os
from database.access_db import SupabaseConnect
import password_handler
import redis
from models import (
    EventCreate,
    GroupSpaceCreate,
    GroupGoalCreate,
    AddAdminRequest,
    GroupInviteRequest,
    InviteResponse,
    GroupTaskCreate,
    GroupEventCreate
)
from fastapi.middleware.cors import CORSMiddleware
from habit_tasks import router as habit_tasks_router

load_dotenv()
app = FastAPI()

app.include_router(habit_tasks_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("FRONTEND_URL", "http://localhost:5173").split(","),
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
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
            return {"success": True, "session_token": session_token, "username": username}
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

@app.post("/group_spaces/create")
def create_group_space(group: GroupSpaceCreate, session_token: str = Header()):
    session = redis.validate_session(session_token)
    if not session:
        return {"success": False, "error": "Invalid session"}
    result = supabase_client.create_group_space(session["username"], group.name, group.group_type)
    if not result:
        return {"success": False, "error": "Could not create group space"}
    return {"success": True, "id": result["id"]}

@app.get("/group_spaces/browse")
@app.get("/group_space/browse")
def get_group_spaces(session_token: str = Header()):
    session = redis.validate_session(session_token)
    if not session:
        return {"success": False, "error": "Invalid session"}
    result = supabase_client.get_user_group_space(session["username"])
    if result is None:
        return {"success": False, "error": "Could not fetch group spaces"}
    return {"success": True, "user_group_spaces": result}

@app.get("/group_spaces/public")
def get_public_group_spaces(session_token: str = Header()):
    session = redis.validate_session(session_token)
    if not session:
        return {"success": False, "error": "Invalid session"}

    result = supabase_client.get_public_group_spaces(session["username"])
    if result is None:
        return {"success": False, "error": "Could not fetch public group spaces"}

    return {"success": True, "public_group_spaces": result}

@app.post("/group_spaces/{group_id}/join")
def join_public_group_space(group_id: int, session_token: str = Header()):
    session = redis.validate_session(session_token)
    if not session:
        return {"success": False, "error": "Invalid session"}

    return supabase_client.join_public_group_space(
        session["username"],
        group_id
    )

@app.post("/group_spaces/{group_id}/create_goal")
def create_group_goal(group_id: int, goal: GroupGoalCreate, session_token: str = Header()):
    session = redis.validate_session(session_token)
    if not session:
        return {"success": False, "error": "Invalid session"}
    return supabase_client.create_group_goal(
        session["username"],
        group_id,
        goal.goal_name,
        goal.goal_description,
        goal.goal_scope,
        goal.goal_deadline
    )

@app.get("/group_spaces/{group_id}/goals")
def get_group_goals(group_id: int, session_token: str = Header()):
    session = redis.validate_session(session_token)
    if not session:
        return {"success": False, "error": "Invalid session"}
    return supabase_client.get_group_goals(session["username"], group_id)

@app.get("/group_spaces/{group_id}/members")
def get_group_members(group_id: int, session_token: str = Header()):
    session = redis.validate_session(session_token)
    if not session:
        return {"success": False, "error": "Invalid session"}
    return supabase_client.get_group_member_list(session["username"], group_id)

@app.post("/group_spaces/{group_id}/add_admin")
def add_group_admin(
    group_id: int,
    request: Optional[AddAdminRequest] = None,
    add_username: Optional[str] = None,
    session_token: str = Header()
):
    session = redis.validate_session(session_token)
    if not session:
        return {"success": False, "error": "Invalid session"}
    target_user = request.username if (request and request.username) else add_username
    if not target_user:
        return {"success": False, "error": "Username is required"}
    return supabase_client.add_group_space_admin(session["username"], group_id, target_user)

@app.post("/group_spaces/{group_id}/invite")
def invite_to_group(group_id: int, invite: GroupInviteRequest, session_token: str = Header()):
    session = redis.validate_session(session_token)
    if not session:
        return {"success": False, "error": "Invalid session"}
    return supabase_client.invite_user_to_group(session["username"], group_id, invite.username)

@app.get("/group_spaces/invites")
def get_group_invites(session_token: str = Header()):
    session = redis.validate_session(session_token)
    if not session:
        return {"success": False, "error": "Invalid session"}
    return supabase_client.get_user_invites(session["username"])

@app.post("/group_spaces/{group_id}/invite/respond")
def respond_to_group_invite(group_id: int, response: InviteResponse, session_token: str = Header()):
    session = redis.validate_session(session_token)
    if not session:
        return {"success": False, "error": "Invalid session"}
    return supabase_client.respond_to_invite(session["username"], group_id, response.accept)


@app.post("/group_spaces/{group_id}/tasks")
def create_group_task(group_id: int, task: GroupTaskCreate, session_token: str = Header()):
    session = redis.validate_session(session_token)
    if not session:
        return {"success": False, "error": "Invalid session"}
    return supabase_client.create_group_task(session["username"], group_id, task.title, task.description)


@app.get("/group_spaces/{group_id}/tasks")
def get_group_tasks(group_id: int, session_token: str = Header()):
    session = redis.validate_session(session_token)
    if not session:
        return {"success": False, "error": "Invalid session"}
    return supabase_client.get_group_tasks(session["username"], group_id)


@app.patch("/group_spaces/{group_id}/tasks/{task_id}/toggle")
def toggle_group_task(group_id: int, task_id: int, session_token: str = Header()):
    session = redis.validate_session(session_token)
    if not session:
        return {"success": False, "error": "Invalid session"}
    return supabase_client.toggle_group_task(session["username"], group_id, task_id)


@app.post("/group_spaces/{group_id}/events")
def create_group_event(group_id: int, event: GroupEventCreate, session_token: str = Header()):
    session = redis.validate_session(session_token)
    if not session:
        return {"success": False, "error": "Invalid session"}
    return supabase_client.create_group_event(session["username"], group_id, event)


@app.get("/group_spaces/{group_id}/events")
def get_group_events(group_id: int, session_token: str = Header()):
    session = redis.validate_session(session_token)
    if not session:
        return {"success": False, "error": "Invalid session"}
    return supabase_client.get_group_events(session["username"], group_id)


if __name__ == "__main__":
    uvicorn.run("main:app", host=os.getenv("HOST"), port=int(os.getenv("PORT")), reload=True)