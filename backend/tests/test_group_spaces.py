import os
import sys
from unittest.mock import MagicMock, patch
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


@pytest.fixture
def mock_session():
    with patch.object(main.redis, "validate_session", return_value={"username": "admin_user"}):
        yield "admin_user"


@pytest.fixture
def mock_db():
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    mock_conn.__enter__.return_value = mock_conn

    with patch("group_spaces.get_db_connection", return_value=mock_conn):
        yield mock_cursor


def test_create_group_space(mock_session, mock_db):
    mock_db.fetchone.return_value = {
        "group_id": 1,
        "name": "Study Group",
        "description": "CS Students",
        "admin_username": "admin_user",
        "created_at": "2026-11-24T20:00:00"
    }

    res = client.post("/groups", json={"name": "Study Group", "description": "CS Students"}, headers=HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["group"]["name"] == "Study Group"
    assert data["group"]["is_admin"] is True


def test_list_group_spaces(mock_session, mock_db):
    mock_db.fetchall.return_value = [
        {
            "group_id": 1,
            "name": "Study Group",
            "description": "CS Students",
            "admin_username": "admin_user",
            "created_at": "2026-11-24T20:00:00",
            "is_admin": True,
            "role": "admin"
        }
    ]

    res = client.get("/groups", headers=HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["groups"]) == 1
    assert data["groups"][0]["is_admin"] is True


def test_admin_can_create_task_in_group_space(mock_session, mock_db):
    # 1st fetchone: group_exists -> (1,)
    # 2nd fetchone: is_group_admin -> (1,)
    # 3rd fetchone: RETURNING task_id, group_id, created_by, title, description, completed, created_at
    mock_db.fetchone.side_effect = [
        {"1": 1},
        {"1": 1},
        {
            "task_id": 10,
            "group_id": 1,
            "created_by": "admin_user",
            "title": "Complete Sprint Planning",
            "description": "Prepare backlog items",
            "completed": False,
            "created_at": "2026-11-24T20:00:00"
        }
    ]

    res = client.post(
        "/groups/1/tasks",
        json={"title": "Complete Sprint Planning", "description": "Prepare backlog items"},
        headers=HEADERS
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["task"]["task_id"] == 10
    assert data["task"]["title"] == "Complete Sprint Planning"


def test_non_admin_cannot_create_task_in_group_space(mock_session, mock_db):
    # group_exists -> (1,)
    # is_group_admin -> None (user is not admin)
    mock_db.fetchone.side_effect = [
        {"1": 1},
        None
    ]

    res = client.post(
        "/groups/1/tasks",
        json={"title": "Unauthorized Task", "description": "Should fail"},
        headers=HEADERS
    )
    assert res.status_code == 403
    assert "Only admins can create tasks" in res.json()["detail"]


def test_admin_can_view_tasks_in_group_space(mock_session, mock_db):
    # group_exists -> (1,)
    # has_group_access -> (1,)
    mock_db.fetchone.side_effect = [
        {"1": 1},
        {"1": 1}
    ]
    mock_db.fetchall.return_value = [
        {
            "task_id": 10,
            "group_id": 1,
            "created_by": "admin_user",
            "title": "Complete Sprint Planning",
            "description": "Prepare backlog items",
            "completed": False,
            "created_at": "2026-11-24T20:00:00"
        }
    ]

    res = client.get("/groups/1/tasks", headers=HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["tasks"]) == 1
    assert data["tasks"][0]["title"] == "Complete Sprint Planning"


def test_admin_can_create_event_in_group_space(mock_session, mock_db):
    # group_exists -> (1,)
    # is_group_admin -> (1,)
    # RETURNING event
    mock_db.fetchone.side_effect = [
        {"1": 1},
        {"1": 1},
        {
            "event_id": 20,
            "group_id": 1,
            "created_by": "admin_user",
            "title": "Team Standup",
            "description": "Weekly progress review",
            "category": "Work",
            "priority": "high",
            "start_time": "2026-11-25T10:00:00",
            "end_time": "2026-11-25T11:00:00",
            "created_at": "2026-11-24T20:00:00"
        }
    ]

    res = client.post(
        "/groups/1/events",
        json={
            "title": "Team Standup",
            "description": "Weekly progress review",
            "category": "Work",
            "priority": "high",
            "start_time": "2026-11-25T10:00:00",
            "end_time": "2026-11-25T11:00:00"
        },
        headers=HEADERS
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["event_id"] == 20
    assert data["event"]["title"] == "Team Standup"


def test_non_admin_cannot_create_event_in_group_space(mock_session, mock_db):
    # group_exists -> (1,)
    # is_group_admin -> None (user is not admin)
    mock_db.fetchone.side_effect = [
        {"1": 1},
        None
    ]

    res = client.post(
        "/groups/1/events",
        json={
            "title": "Unauthorized Event",
            "priority": "medium",
            "start_time": "2026-11-25T10:00:00",
            "end_time": "2026-11-25T11:00:00"
        },
        headers=HEADERS
    )
    assert res.status_code == 403
    assert "Only admins can create events" in res.json()["detail"]


def test_admin_can_view_events_in_group_space(mock_session, mock_db):
    # group_exists -> (1,)
    # has_group_access -> (1,)
    mock_db.fetchone.side_effect = [
        {"1": 1},
        {"1": 1}
    ]
    mock_db.fetchall.return_value = [
        {
            "event_id": 20,
            "group_id": 1,
            "created_by": "admin_user",
            "title": "Team Standup",
            "description": "Weekly progress review",
            "category": "Work",
            "priority": "high",
            "start_time": "2026-11-25T10:00:00",
            "end_time": "2026-11-25T11:00:00",
            "created_at": "2026-11-24T20:00:00"
        }
    ]

    res = client.get("/groups/1/events", headers=HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["events"]) == 1
    assert data["events"][0]["title"] == "Team Standup"


def test_group_event_invalid_times_rejected(mock_session, mock_db):
    res = client.post(
        "/groups/1/events",
        json={
            "title": "Bad Event",
            "priority": "low",
            "start_time": "2026-11-25T12:00:00",
            "end_time": "2026-11-25T11:00:00"  # before start
        },
        headers=HEADERS
    )
    assert res.status_code == 422


def test_unauthenticated_request_rejected():
    with patch.object(main.redis, "validate_session", return_value=None):
        res = client.get("/groups", headers=HEADERS)
    assert res.status_code == 401


def test_group_not_found(mock_session, mock_db):
    mock_db.fetchone.return_value = None
    res = client.get("/groups/999/tasks", headers=HEADERS)
    assert res.status_code == 404
