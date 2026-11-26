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


@pytest.fixture
def logged_in():
    with patch.object(main.redis, "validate_session", return_value={"username": "testuser"}):
        yield


def test_create_group_space_success(logged_in):
    mock_result = {"id": 1}
    with patch.object(main.supabase_client, "create_group_space", return_value=mock_result) as mock_create:
        res = client.post("/group_spaces/create", json={"name": "Study Group", "group_type": 0}, headers=HEADERS)

    assert res.status_code == 200
    assert res.json() == {"success": True, "id": 1}
    mock_create.assert_called_once_with("testuser", "Study Group", 0)


def test_create_group_space_default_type(logged_in):
    mock_result = {"id": 2}
    with patch.object(main.supabase_client, "create_group_space", return_value=mock_result) as mock_create:
        res = client.post("/group_spaces/create", json={"name": "Gaming Club"}, headers=HEADERS)

    assert res.status_code == 200
    assert res.json() == {"success": True, "id": 2}
    mock_create.assert_called_once_with("testuser", "Gaming Club", 0)


def test_create_group_space_invalid_session():
    with patch.object(main.redis, "validate_session", return_value=False):
        res = client.post("/group_spaces/create", json={"name": "Test Group"}, headers=HEADERS)

    assert res.status_code == 200
    assert res.json() == {"success": False, "error": "Invalid session"}


def test_create_group_space_missing_header():
    res = client.post("/group_spaces/create", json={"name": "Test Group"})
    assert res.status_code == 422


@pytest.mark.parametrize("bad_payload", [
    {},
    {"name": ""},
    {"name": "   "},
    {"name": "Valid Name", "group_type": 5},
])
def test_create_group_space_invalid_payload(logged_in, bad_payload):
    res = client.post("/group_spaces/create", json=bad_payload, headers=HEADERS)
    assert res.status_code == 422


def test_create_group_space_db_error(logged_in):
    with patch.object(main.supabase_client, "create_group_space", return_value=None):
        res = client.post("/group_spaces/create", json={"name": "Failing Group"}, headers=HEADERS)

    assert res.status_code == 200
    assert res.json() == {"success": False, "error": "Could not create group space"}


def test_browse_group_spaces(logged_in):
    mock_spaces = [{"id": 1, "name": "Team Space", "group_type": 0, "owner_user": "testuser"}]
    with patch.object(main.supabase_client, "get_user_group_space", return_value=mock_spaces):
        res = client.get("/group_spaces/browse", headers=HEADERS)

    assert res.status_code == 200
    assert res.json() == {"success": True, "user_group_spaces": mock_spaces}


def test_create_group_goal(logged_in):
    mock_res = {"success": True, "goal_id": 10}
    with patch.object(main.supabase_client, "create_group_goal", return_value=mock_res) as mock_create:
        res = client.post(
            "/group_spaces/1/create_goal",
            json={"goal_name": "Finish Sprint 1", "goal_description": "Complete tasks", "goal_scope": "EVERYONE"},
            headers=HEADERS
        )

    assert res.status_code == 200
    assert res.json() == {"success": True, "goal_id": 10}
    mock_create.assert_called_once()


def test_get_group_goals(logged_in):
    mock_goals = {"success": True, "goals": [{"goal_id": 10, "goal_name": "Finish Sprint 1"}]}
    with patch.object(main.supabase_client, "get_group_goals", return_value=mock_goals):
        res = client.get("/group_spaces/1/goals", headers=HEADERS)

    assert res.status_code == 200
    assert res.json() == mock_goals


def test_get_group_members_success(logged_in):
    mock_members = {
        "success": True,
        "members": [
            {"username": "testuser", "is_admin": True, "is_owner": True},
            {"username": "member1", "is_admin": False, "is_owner": False}
        ]
    }
    with patch.object(main.supabase_client, "get_group_member_list", return_value=mock_members) as mock_get:
        res = client.get("/group_spaces/1/members", headers=HEADERS)

    assert res.status_code == 200
    assert res.json() == mock_members
    mock_get.assert_called_once_with("testuser", 1)


def test_get_group_members_invalid_session():
    with patch.object(main.redis, "validate_session", return_value=False):
        res = client.get("/group_spaces/1/members", headers=HEADERS)

    assert res.status_code == 200
    assert res.json() == {"success": False, "error": "Invalid session"}


def test_add_group_admin_success(logged_in):
    mock_res = {"success": True, "message": "Admin added successfully"}
    with patch.object(main.supabase_client, "add_group_space_admin", return_value=mock_res) as mock_add:
        res = client.post("/group_spaces/1/add_admin", json={"username": "member1"}, headers=HEADERS)

    assert res.status_code == 200
    assert res.json() == mock_res
    mock_add.assert_called_once_with("testuser", 1, "member1")


def test_add_group_admin_via_query_param(logged_in):
    mock_res = {"success": True, "message": "Admin added successfully"}
    with patch.object(main.supabase_client, "add_group_space_admin", return_value=mock_res) as mock_add:
        res = client.post("/group_spaces/1/add_admin?add_username=member1", headers=HEADERS)

    assert res.status_code == 200
    assert res.json() == mock_res
    mock_add.assert_called_once_with("testuser", 1, "member1")


def test_add_group_admin_missing_username(logged_in):
    res = client.post("/group_spaces/1/add_admin", json={}, headers=HEADERS)
    assert res.status_code == 200
    assert res.json() == {"success": False, "error": "Username is required"}





def test_invite_to_group_success(logged_in):
    mock_res = {"success": True, "message": "Invite sent"}
    with patch.object(main.supabase_client, "invite_user_to_group", return_value=mock_res) as mock_invite:
        res = client.post("/group_spaces/1/invite", json={"username": "member2"}, headers=HEADERS)

    assert res.status_code == 200
    assert res.json() == mock_res
    mock_invite.assert_called_once_with("testuser", 1, "member2")


def test_invite_to_group_invalid_session():
    with patch.object(main.redis, "validate_session", return_value=False):
        res = client.post("/group_spaces/1/invite", json={"username": "member2"}, headers=HEADERS)

    assert res.status_code == 200
    assert res.json() == {"success": False, "error": "Invalid session"}


@pytest.mark.parametrize("bad_payload", [
    {},
    {"username": ""},
    {"username": "   "},
])
def test_invite_to_group_invalid_payload(logged_in, bad_payload):
    res = client.post("/group_spaces/1/invite", json=bad_payload, headers=HEADERS)
    assert res.status_code == 422


def test_invite_to_group_not_admin(logged_in):
    mock_res = {"success": False, "error": "You must be an admin to invite users"}
    with patch.object(main.supabase_client, "invite_user_to_group", return_value=mock_res):
        res = client.post("/group_spaces/1/invite", json={"username": "member2"}, headers=HEADERS)

    assert res.status_code == 200
    assert res.json() == mock_res


def test_get_group_invites(logged_in):
    mock_res = {"success": True, "invites": [{"group_id": 1, "name": "Study Group", "invited_by": "owner1"}]}
    with patch.object(main.supabase_client, "get_user_invites", return_value=mock_res) as mock_get:
        res = client.get("/group_spaces/invites", headers=HEADERS)

    assert res.status_code == 200
    assert res.json() == mock_res
    mock_get.assert_called_once_with("testuser")


def test_accept_group_invite(logged_in):
    mock_res = {"success": True, "message": "Joined group space"}
    with patch.object(main.supabase_client, "respond_to_invite", return_value=mock_res) as mock_respond:
        res = client.post("/group_spaces/1/invite/respond", json={"accept": True}, headers=HEADERS)

    assert res.status_code == 200
    assert res.json() == mock_res
    mock_respond.assert_called_once_with("testuser", 1, True)


def test_decline_group_invite(logged_in):
    mock_res = {"success": True, "message": "Invite declined"}
    with patch.object(main.supabase_client, "respond_to_invite", return_value=mock_res) as mock_respond:
        res = client.post("/group_spaces/1/invite/respond", json={"accept": False}, headers=HEADERS)

    assert res.status_code == 200
    assert res.json() == mock_res
    mock_respond.assert_called_once_with("testuser", 1, False)


def test_respond_to_invite_missing_accept(logged_in):
    res = client.post("/group_spaces/1/invite/respond", json={}, headers=HEADERS)
    assert res.status_code == 422


def test_create_group_goal_assigned_to_member(logged_in):
    mock_res = {"success": True, "goal_id": 11}
    with patch.object(main.supabase_client, "create_group_goal", return_value=mock_res) as mock_create:
        res = client.post(
            "/group_spaces/1/create_goal",
            json={"goal_name": "Write report", "goal_description": "Draft section 2", "goal_scope": "member1"},
            headers=HEADERS
        )

    assert res.status_code == 200
    assert res.json() == mock_res
    mock_create.assert_called_once_with("testuser", 1, "Write report", "Draft section 2", "member1", None)


def test_create_group_goal_without_description(logged_in):
    mock_res = {"success": True, "goal_id": 12}
    with patch.object(main.supabase_client, "create_group_goal", return_value=mock_res) as mock_create:
        res = client.post(
            "/group_spaces/1/create_goal",
            json={"goal_name": "Study for exam", "goal_scope": "EVERYONE"},
            headers=HEADERS
        )

    assert res.status_code == 200
    assert res.json() == mock_res
    mock_create.assert_called_once_with("testuser", 1, "Study for exam", None, "EVERYONE", None)


def test_admin_create_group_task_success(logged_in):
    mock_task = {
        "success": True,
        "task_id": 101,
        "task": {
            "task_id": 101,
            "group_id": 1,
            "created_by": "testuser",
            "title": "Complete PBI-B integration",
            "description": "Admins can create/view tasks and events",
            "completed": False,
            "created_at": "2026-11-24T22:00:00"
        }
    }
    with patch.object(main.supabase_client, "create_group_task", return_value=mock_task) as mock_create:
        res = client.post(
            "/group_spaces/1/tasks",
            json={"title": "Complete PBI-B integration", "description": "Admins can create/view tasks and events"},
            headers=HEADERS
        )
    assert res.status_code == 200
    assert res.json() == mock_task
    mock_create.assert_called_once_with("testuser", 1, "Complete PBI-B integration", "Admins can create/view tasks and events")


def test_non_admin_create_group_task_forbidden(logged_in):
    mock_err = {"success": False, "error": "You must be an admin to create group tasks"}
    with patch.object(main.supabase_client, "create_group_task", return_value=mock_err):
        res = client.post(
            "/group_spaces/1/tasks",
            json={"title": "Unauthorized task", "description": "Should fail"},
            headers=HEADERS
        )
    assert res.status_code == 200
    assert res.json()["success"] is False
    assert "admin" in res.json()["error"]


def test_view_group_tasks(logged_in):
    mock_tasks = {
        "success": True,
        "tasks": [
            {
                "task_id": 101,
                "group_id": 1,
                "created_by": "testuser",
                "title": "Complete PBI-B integration",
                "description": "Admins can create/view tasks and events",
                "completed": False,
                "created_at": "2026-11-24T22:00:00"
            }
        ]
    }
    with patch.object(main.supabase_client, "get_group_tasks", return_value=mock_tasks) as mock_get:
        res = client.get("/group_spaces/1/tasks", headers=HEADERS)
    assert res.status_code == 200
    assert res.json() == mock_tasks
    mock_get.assert_called_once_with("testuser", 1)


def test_toggle_group_task(logged_in):
    mock_toggle = {"success": True, "task": {"task_id": 101, "completed": True}}
    with patch.object(main.supabase_client, "toggle_group_task", return_value=mock_toggle) as mock_toggle_fn:
        res = client.patch("/group_spaces/1/tasks/101/toggle", headers=HEADERS)
    assert res.status_code == 200
    assert res.json() == mock_toggle
    mock_toggle_fn.assert_called_once_with("testuser", 1, 101)


def test_admin_create_group_event_success(logged_in):
    mock_event = {
        "success": True,
        "event_id": 201,
        "event": {
            "event_id": 201,
            "group_id": 1,
            "created_by": "testuser",
            "title": "Sprint Review",
            "description": "Review PBI deliverables",
            "category": "Project",
            "priority": "high",
            "start_time": "2026-11-25T14:00:00",
            "end_time": "2026-11-25T15:00:00",
            "created_at": "2026-11-24T22:00:00"
        }
    }
    with patch.object(main.supabase_client, "create_group_event", return_value=mock_event) as mock_create:
        res = client.post(
            "/group_spaces/1/events",
            json={
                "title": "Sprint Review",
                "description": "Review PBI deliverables",
                "category": "Project",
                "priority": "high",
                "start_time": "2026-11-25T14:00:00",
                "end_time": "2026-11-25T15:00:00"
            },
            headers=HEADERS
        )
    assert res.status_code == 200
    assert res.json() == mock_event
    mock_create.assert_called_once()


def test_non_admin_create_group_event_forbidden(logged_in):
    mock_err = {"success": False, "error": "You must be an admin to create group events"}
    with patch.object(main.supabase_client, "create_group_event", return_value=mock_err):
        res = client.post(
            "/group_spaces/1/events",
            json={
                "title": "Sprint Review",
                "priority": "medium",
                "start_time": "2026-11-25T14:00:00",
                "end_time": "2026-11-25T15:00:00"
            },
            headers=HEADERS
        )
    assert res.status_code == 200
    assert res.json()["success"] is False
    assert "admin" in res.json()["error"]


def test_view_group_events(logged_in):
    mock_events = {
        "success": True,
        "events": [
            {
                "event_id": 201,
                "group_id": 1,
                "created_by": "testuser",
                "title": "Sprint Review",
                "priority": "high",
                "start_time": "2026-11-25T14:00:00",
                "end_time": "2026-11-25T15:00:00"
            }
        ]
    }
    with patch.object(main.supabase_client, "get_group_events", return_value=mock_events) as mock_get:
        res = client.get("/group_spaces/1/events", headers=HEADERS)
    assert res.status_code == 200
    assert res.json() == mock_events
    mock_get.assert_called_once_with("testuser", 1)


def test_create_group_event_invalid_times(logged_in):
    res = client.post(
        "/group_spaces/1/events",
        json={
            "title": "Bad Times Event",
            "priority": "low",
            "start_time": "2026-11-25T16:00:00",
            "end_time": "2026-11-25T15:00:00"
        },
        headers=HEADERS
    )
    assert res.status_code == 422



def test_toggle_goal_completion(logged_in):
    mock_res = {"success": True, "goal_id": 10, "completed": True}
    with patch.object(main.supabase_client, "toggle_goal_completion", return_value=mock_res) as mock_toggle:
        res = client.patch("/group_spaces/1/goals/10/toggle", headers=HEADERS)

    assert res.status_code == 200
    assert res.json() == mock_res
    mock_toggle.assert_called_once_with("testuser", 1, 10)


def test_toggle_goal_completion_invalid_session():
    with patch.object(main.redis, "validate_session", return_value=False):
        res = client.patch("/group_spaces/1/goals/10/toggle", headers=HEADERS)

    assert res.status_code == 200
    assert res.json() == {"success": False, "error": "Invalid session"}


def test_get_goal_progress(logged_in):
    mock_res = {
        "success": True,
        "progress": [
            {
                "goal_id": 10,
                "completed_count": 1,
                "total": 2,
                "members": [
                    {"username": "testuser", "completed": False},
                    {"username": "member1", "completed": True}
                ]
            }
        ]
    }
    with patch.object(main.supabase_client, "get_group_goal_progress", return_value=mock_res) as mock_get:
        res = client.get("/group_spaces/1/goals/progress", headers=HEADERS)

    assert res.status_code == 200
    assert res.json() == mock_res
    mock_get.assert_called_once_with("testuser", 1)


def test_get_goal_progress_invalid_session():
    with patch.object(main.redis, "validate_session", return_value=False):
        res = client.get("/group_spaces/1/goals/progress", headers=HEADERS)

    assert res.status_code == 200
    assert res.json() == {"success": False, "error": "Invalid session"}
