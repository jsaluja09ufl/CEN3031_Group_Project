from upstash_redis import Redis
from dotenv import load_dotenv
import os
import json
from datetime import datetime
import uuid

load_dotenv()

redis = Redis(url=os.getenv("UPSTASH_REDIS_URL"), token=os.getenv("UPSTASH_REDIS_TOKEN"))
SESSION_TTL_SECONDS = int(os.getenv("SESSION_TTL_SECONDS", 3600))

session_json_template = {
    "username": None,
    "login_time": None,
    "last_updated": None
}

# sessions are stored as json strings in redis
def get_session(session_token):
    session = redis.get(session_token)
    if session is None:
        return None
    return json.loads(session)

def save_session(session_token, session):
    redis.set(session_token, json.dumps(session))

def touch_session(session_token):
    session = get_session(session_token)
    if session is None:
        return False
    session["last_updated"] = datetime.now().isoformat()
    save_session(session_token, session)
    return True

def create_session(username):
    new_session = session_json_template.copy()
    new_session["username"] = username
    new_session["login_time"] = datetime.now().isoformat()
    new_session["last_updated"] = datetime.now().isoformat()
    session_token = uuid.uuid4().hex
    save_session(session_token, new_session)
    return session_token

def validate_session(session_token):
    session = get_session(session_token)
    if session is None:
        return False
    last_updated = datetime.fromisoformat(session["last_updated"])
    if (datetime.now() - last_updated).total_seconds() > SESSION_TTL_SECONDS:
        redis.delete(session_token)
        return False
    touch_session(session_token)
    return session

def delete_session(session_token):
    if get_session(session_token) is None:
        return False
    redis.delete(session_token)
    return True

def update_session(session_token, data):
    session = get_session(session_token)
    if session is None:
        return False
    session.update(data)
    save_session(session_token, session)
    touch_session(session_token)
    return True
