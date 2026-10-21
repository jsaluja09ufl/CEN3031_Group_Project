
from upstash_redis import Redis
from dotenv import load_dotenv
from datetime import datetime
import os
import uuid
import json

load_dotenv()

redis = Redis(
    url=os.getenv("UPSTASH_REDIS_URL"),
    token=os.getenv("UPSTASH_REDIS_TOKEN")
)

SESSION_TTL_SECONDS = int(os.getenv("SESSION_TTL_SECONDS", "300"))


def get_session(session_token):
    session = redis.get(session_token)

    if session is None:
        return None

    if isinstance(session, str):
        session = json.loads(session)

    if not isinstance(session, dict):
        return None

    return session


def touch_session(session_token):
    session = get_session(session_token)

    if session is None:
        return False

    session["last_updated"] = datetime.now().isoformat()
    redis.set(session_token, session, ex=SESSION_TTL_SECONDS)

    return True


def create_session(username):
    session = {
        "username": username,
        "login_time": datetime.now().isoformat(),
        "last_updated": datetime.now().isoformat()
    }

    session_token = uuid.uuid4().hex

    redis.set(
        session_token,
        session,
        ex=SESSION_TTL_SECONDS
    )

    return session_token


def validate_session(session_token):
    session = get_session(session_token)

    if session is None:
        return False

    last_updated = datetime.fromisoformat(session["last_updated"])
    elapsed_seconds = (datetime.now() - last_updated).total_seconds()

    if elapsed_seconds > SESSION_TTL_SECONDS:
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
    session["last_updated"] = datetime.now().isoformat()

    redis.set(session_token, session, ex=SESSION_TTL_SECONDS)
    return True
