# FastAPI TestClient: https://fastapi.tiangolo.com/tutorial/testing/
# mocking the db and redis: https://docs.python.org/3/library/unittest.mock.html#patch-object
import os
import sys
from unittest.mock import patch

import pytest

pytest.importorskip("fastapi")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("DATABASE_URL", "postgresql://test")
os.environ.setdefault("UPSTASH_REDIS_URL", "https://test.upstash.io")
os.environ.setdefault("UPSTASH_REDIS_TOKEN", "test")
os.environ.setdefault("PASSWORD_SECRET_PEPPER", "test")

from fastapi.testclient import TestClient

with patch("psycopg.connect"):
    import main

client = TestClient(main.app)
HEADERS = {"session-token": "test-token"}


def make_event(**changes):
    event = {
        "title": "Study for exam",
        "description": "Chapters 4-6",
        "category": "School",
        "priority": "high",
        "start_time": "2026-10-21T14:00",
        "end_time": "2026-10-21T16:00",
    }
    event.update(changes)
    return event


@pytest.fixture
def logged_in():
    with patch.object(main.redis, "validate_session", return_value={"username": "testuser"}):
        yield


def test_create_event(logged_in):
    with patch.object(main.supabase_client, "create_event", return_value=1) as mock_create:
        res = client.post("/events", json=make_event(), headers=HEADERS)

    assert res.status_code == 200
    assert res.json() == {"success": True, "event_id": 1}
    assert mock_create.call_args[0][0] == "testuser"


def test_optional_fields_can_be_left_out(logged_in):
    event = make_event()
    del event["description"]
    del event["category"]
    with patch.object(main.supabase_client, "create_event", return_value=2):
        res = client.post("/events", json=event, headers=HEADERS)
    assert res.json()["success"] is True


@pytest.mark.parametrize("bad_event", [
    make_event(title=""),
    make_event(title="   "),
    make_event(priority="urgent"),
    make_event(end_time="2026-10-21T13:00"),
    make_event(end_time="2026-10-21T14:00"),
    make_event(start_time="not a date"),
])
def test_invalid_event_rejected(logged_in, bad_event):
    with patch.object(main.supabase_client, "create_event") as mock_create:
        res = client.post("/events", json=bad_event, headers=HEADERS)
    assert res.status_code == 422
    mock_create.assert_not_called()


def test_missing_required_field(logged_in):
    event = make_event()
    del event["priority"]
    res = client.post("/events", json=event, headers=HEADERS)
    assert res.status_code == 422


def test_invalid_session():
    with patch.object(main.redis, "validate_session", return_value=False), \
            patch.object(main.supabase_client, "create_event") as mock_create:
        res = client.post("/events", json=make_event(), headers=HEADERS)
    assert res.json() == {"success": False, "error": "Invalid session"}
    mock_create.assert_not_called()


def test_missing_session_header():
    res = client.post("/events", json=make_event())
    assert res.status_code == 422


def test_database_error(logged_in):
    with patch.object(main.supabase_client, "create_event", return_value=None):
        res = client.post("/events", json=make_event(), headers=HEADERS)
    assert res.json() == {"success": False, "error": "Could not create event"}


def test_get_events(logged_in):
    events = [{"event_id": 1, "title": "Study for exam"}]
    with patch.object(main.supabase_client, "get_events", return_value=events) as mock_get:
        res = client.get("/events", headers=HEADERS)
    assert res.json() == {"success": True, "events": events}
    mock_get.assert_called_once_with("testuser")


def test_update_event_completion_success(logged_in):
    updated = {
        "event_id": 1,
        "title": "Study for exam",
        "completed": True,
        "difficulty": "Medium",
        "completion_time_minutes": 45,
        "completion_notes": "Completed smoothly"
    }
    payload = {
        "completed": True,
        "difficulty": "Medium",
        "completion_time_minutes": 45,
        "completion_notes": "Completed smoothly"
    }
    with patch.object(main.supabase_client, "update_event_completion", return_value=updated) as mock_update:
        res = client.put("/events/1/completion", json=payload, headers=HEADERS)
    assert res.status_code == 200
    assert res.json() == {"success": True, "event": updated}
    assert mock_update.call_args[0][0] == "testuser"
    assert mock_update.call_args[0][1] == 1


def test_update_event_completion_invalid_session():
    with patch.object(main.redis, "validate_session", return_value=False):
        res = client.put("/events/1/completion", json={"completed": True}, headers=HEADERS)
    assert res.json() == {"success": False, "error": "Invalid session"}


def test_update_event_completion_negative_time(logged_in):
    res = client.put("/events/1/completion", json={"completion_time_minutes": -5}, headers=HEADERS)
    assert res.status_code == 422
