from upstash_redis import Redis
from dotenv import load_dotenv
import os
from datetime import datetime as dt
import json
import uuid

load_dotenv()

redis = Redis(url=os.getenv("UPSTASH_REDIS_URL"), token=os.getenv("UPSTASH_REDIS_TOKEN"))

session_json_template = {
    "username": None,
    "login_time": None,
    "last_updated": None
}

def _parse_session(raw):
    if raw is None:
        return None
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except Exception:
            return None
    return raw

def touch_session(session_token):
    session = _parse_session(redis.get(session_token))
    if session is None:
        return False
    session["last_updated"] = dt.now().isoformat()
    ttl = int(float(os.getenv("SESSION_TTL_SECONDS", 300)))
    redis.set(session_token, json.dumps(session), ex=ttl)
    return True

def create_session(username):
    now_iso = dt.now().isoformat()
    new_session = session_json_template.copy()
    new_session["username"] = username
    new_session["login_time"] = now_iso
    new_session["last_updated"] = now_iso
    session_token = uuid.uuid4().hex
    ttl = int(float(os.getenv("SESSION_TTL_SECONDS", 300)))
    redis.set(session_token, json.dumps(new_session), ex=ttl)
    return session_token

def validate_session(session_token):
    session = _parse_session(redis.get(session_token))
    if session is None:
        return False
    
    last_updated = session.get("last_updated")
    if last_updated:
        try:
            last_updated_dt = dt.fromisoformat(last_updated)
            ttl = float(os.getenv("SESSION_TTL_SECONDS", 300))
            if (dt.now() - last_updated_dt).total_seconds() > ttl:
                redis.delete(session_token)
                return False
        except Exception:
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
    session = _parse_session(redis.get(session_token))
    if session is None:
        return False
    session.update(data)
    ttl = int(float(os.getenv("SESSION_TTL_SECONDS", 300)))
    redis.set(session_token, json.dumps(session), ex=ttl)
    touch_session(session_token)
    return True