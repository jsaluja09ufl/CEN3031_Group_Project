from upstash_redis import Redis
from dotenv import load_dotenv
import os
import datetime
import uuid

load_dotenv()

redis = Redis(url=os.getenv("UPSTASH_REDIS_URL"), token=os.getenv("UPSTASH_REDIS_TOKEN"))

session_json_template = {
    "username": None,
    "login_time": None,
    "last_updated": None
}

def touch_session(session_token):
    session = redis.get(session_token)
    if session is None:
        return False
    session["last_updated"] = datetime.now()
    redis.set(session_token, session)
    return True

def create_session(username):
    new_session = session_json_template.copy()
    new_session["username"] = username
    new_session["login_time"] = datetime.now()
    new_session["last_updated"] = datetime.now()
    session_token = uuid.uuid4().hex
    redis.set(session_token, new_session)
    return session_token

def validate_session(session_token):
    session = redis.get(session_token)
    if session is None:
        return False
    if datetime.now() - session["last_updated"] > os.getenv("SESSION_TTL_SECONDS"):
        redis.delete(session_token)
        return False
    touch_session(session_token)
    return session

def delete_session(session_token):
    session = redis.get(session_token)
    if session is None:
        return False
    redis.delete(session_token)
    return True

def update_session(session_token, data):
    session = redis.get(session_token)
    if session is None:
        return False
    session.update(data)
    redis.set(session_token, session)
    touch_session(session_token)
    return True

    
    