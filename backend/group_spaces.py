import os
from typing import Optional
from fastapi import APIRouter, Header, HTTPException
import psycopg
from psycopg.rows import dict_row

import redis
from models import GroupSpaceCreate, GroupTaskCreate, GroupEventCreate, GroupMemberAdd

router = APIRouter(prefix="/groups", tags=["Group Spaces"])


def get_db_connection():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise HTTPException(status_code=500, detail="Database URL not configured")
    return psycopg.connect(database_url)


def get_authenticated_username(
    authorization: Optional[str] = Header(default=None),
    session_token: Optional[str] = Header(default=None, alias="session-token")
) -> str:
    token = None
    if session_token:
        token = session_token.strip()
    elif authorization:
        token = authorization.removeprefix("Bearer ").strip()

    if not token:
        raise HTTPException(status_code=401, detail="Login required")

    session = redis.validate_session(token)
    if not session or not session.get("username"):
        raise HTTPException(status_code=401, detail="Invalid session")

    return session["username"]


def group_exists(cursor, group_id: int) -> bool:
    cursor.execute("SELECT 1 FROM group_spaces WHERE group_id = %s", (group_id,))
    return cursor.fetchone() is not None


def is_group_admin(cursor, group_id: int, username: str) -> bool:
    cursor.execute(
        """
        SELECT 1 FROM group_spaces WHERE group_id = %s AND admin_username = %s
        UNION
        SELECT 1 FROM group_members WHERE group_id = %s AND username = %s AND role = 'admin'
        """,
        (group_id, username, group_id, username)
    )
    return cursor.fetchone() is not None


def has_group_access(cursor, group_id: int, username: str) -> bool:
    cursor.execute(
        """
        SELECT 1 FROM group_spaces WHERE group_id = %s AND admin_username = %s
        UNION
        SELECT 1 FROM group_members WHERE group_id = %s AND username = %s
        """,
        (group_id, username, group_id, username)
    )
    return cursor.fetchone() is not None


@router.post("")
def create_group_space(
    data: GroupSpaceCreate,
    authorization: Optional[str] = Header(default=None),
    session_token: Optional[str] = Header(default=None, alias="session-token")
):
    username = get_authenticated_username(authorization, session_token)
    clean_name = data.name.strip()
    if not clean_name:
        raise HTTPException(status_code=422, detail="Group name is required")

    with get_db_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                INSERT INTO group_spaces (name, description, admin_username)
                VALUES (%s, %s, %s)
                RETURNING group_id, name, description, admin_username, created_at
                """,
                (clean_name, (data.description or "").strip(), username)
            )
            group = cursor.fetchone()
            group_id = group["group_id"]

            cursor.execute(
                """
                INSERT INTO group_members (group_id, username, role)
                VALUES (%s, %s, 'admin')
                ON CONFLICT (group_id, username) DO UPDATE SET role = 'admin'
                """,
                (group_id, username)
            )
            connection.commit()

    group["is_admin"] = True
    return {"success": True, "group": group}


@router.get("")
def list_group_spaces(
    authorization: Optional[str] = Header(default=None),
    session_token: Optional[str] = Header(default=None, alias="session-token")
):
    username = get_authenticated_username(authorization, session_token)

    with get_db_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                SELECT DISTINCT g.group_id, g.name, g.description, g.admin_username, g.created_at,
                       CASE WHEN g.admin_username = %s OR m.role = 'admin' THEN true ELSE false END AS is_admin,
                       COALESCE(m.role, CASE WHEN g.admin_username = %s THEN 'admin' ELSE 'member' END) AS role
                FROM group_spaces g
                LEFT JOIN group_members m ON g.group_id = m.group_id AND m.username = %s
                WHERE g.admin_username = %s OR m.username = %s
                ORDER BY g.created_at DESC
                """,
                (username, username, username, username, username)
            )
            groups = cursor.fetchall()

    return {"success": True, "groups": groups}


@router.get("/{group_id}")
def get_group_space(
    group_id: int,
    authorization: Optional[str] = Header(default=None),
    session_token: Optional[str] = Header(default=None, alias="session-token")
):
    username = get_authenticated_username(authorization, session_token)

    with get_db_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            if not group_exists(cursor, group_id):
                raise HTTPException(status_code=404, detail="Group space not found")

            if not has_group_access(cursor, group_id, username):
                raise HTTPException(status_code=403, detail="You do not have access to this group space")

            cursor.execute(
                """
                SELECT group_id, name, description, admin_username, created_at
                FROM group_spaces
                WHERE group_id = %s
                """,
                (group_id,)
            )
            group = cursor.fetchone()

            cursor.execute(
                """
                SELECT username, role
                FROM group_members
                WHERE group_id = %s
                ORDER BY role ASC, username ASC
                """,
                (group_id,)
            )
            members = cursor.fetchall()

            is_admin = is_group_admin(cursor, group_id, username)
            group["is_admin"] = is_admin

    return {"success": True, "group": group, "is_admin": is_admin, "members": members}


@router.post("/{group_id}/members")
def add_group_member(
    group_id: int,
    data: GroupMemberAdd,
    authorization: Optional[str] = Header(default=None),
    session_token: Optional[str] = Header(default=None, alias="session-token")
):
    username = get_authenticated_username(authorization, session_token)

    with get_db_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            if not group_exists(cursor, group_id):
                raise HTTPException(status_code=404, detail="Group space not found")

            if not is_group_admin(cursor, group_id, username):
                raise HTTPException(status_code=403, detail="Only admins can add members to this group space")

            cursor.execute(
                """
                INSERT INTO group_members (group_id, username, role)
                VALUES (%s, %s, %s)
                ON CONFLICT (group_id, username) DO UPDATE SET role = EXCLUDED.role
                """,
                (group_id, data.username.strip(), data.role)
            )
            connection.commit()

    return {"success": True, "message": f"User {data.username} added as {data.role}"}


@router.post("/{group_id}/tasks")
def create_group_task(
    group_id: int,
    data: GroupTaskCreate,
    authorization: Optional[str] = Header(default=None),
    session_token: Optional[str] = Header(default=None, alias="session-token")
):
    username = get_authenticated_username(authorization, session_token)
    clean_title = data.title.strip()
    if not clean_title:
        raise HTTPException(status_code=422, detail="Title is required")

    with get_db_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            if not group_exists(cursor, group_id):
                raise HTTPException(status_code=404, detail="Group space not found")

            if not is_group_admin(cursor, group_id, username):
                raise HTTPException(status_code=403, detail="Only admins can create tasks in this group space")

            cursor.execute(
                """
                INSERT INTO group_tasks (group_id, created_by, title, description)
                VALUES (%s, %s, %s)
                RETURNING task_id, group_id, created_by, title, description, completed, created_at
                """,
                (group_id, username, clean_title, (data.description or "").strip())
            )
            task = cursor.fetchone()
            connection.commit()

    return {"success": True, "task": task}


@router.get("/{group_id}/tasks")
def list_group_tasks(
    group_id: int,
    authorization: Optional[str] = Header(default=None),
    session_token: Optional[str] = Header(default=None, alias="session-token")
):
    username = get_authenticated_username(authorization, session_token)

    with get_db_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            if not group_exists(cursor, group_id):
                raise HTTPException(status_code=404, detail="Group space not found")

            if not has_group_access(cursor, group_id, username):
                raise HTTPException(status_code=403, detail="You do not have access to this group space")

            cursor.execute(
                """
                SELECT task_id, group_id, created_by, title, description, completed, created_at
                FROM group_tasks
                WHERE group_id = %s
                ORDER BY created_at DESC
                """,
                (group_id,)
            )
            tasks = cursor.fetchall()

    return {"success": True, "tasks": tasks}


@router.patch("/{group_id}/tasks/{task_id}/toggle")
def toggle_group_task(
    group_id: int,
    task_id: int,
    authorization: Optional[str] = Header(default=None),
    session_token: Optional[str] = Header(default=None, alias="session-token")
):
    username = get_authenticated_username(authorization, session_token)

    with get_db_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            if not group_exists(cursor, group_id):
                raise HTTPException(status_code=404, detail="Group space not found")

            if not has_group_access(cursor, group_id, username):
                raise HTTPException(status_code=403, detail="You do not have access to this group space")

            cursor.execute(
                """
                UPDATE group_tasks
                SET completed = NOT completed
                WHERE task_id = %s AND group_id = %s
                RETURNING task_id, completed
                """,
                (task_id, group_id)
            )
            task = cursor.fetchone()
            if not task:
                raise HTTPException(status_code=404, detail="Task not found in this group")
            connection.commit()

    return {"success": True, "task": task}


@router.post("/{group_id}/events")
def create_group_event(
    group_id: int,
    data: GroupEventCreate,
    authorization: Optional[str] = Header(default=None),
    session_token: Optional[str] = Header(default=None, alias="session-token")
):
    username = get_authenticated_username(authorization, session_token)
    clean_title = data.title.strip()
    if not clean_title:
        raise HTTPException(status_code=422, detail="Title is required")

    with get_db_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            if not group_exists(cursor, group_id):
                raise HTTPException(status_code=404, detail="Group space not found")

            if not is_group_admin(cursor, group_id, username):
                raise HTTPException(status_code=403, detail="Only admins can create events in this group space")

            cursor.execute(
                """
                INSERT INTO group_events (group_id, created_by, title, description, category, priority, start_time, end_time)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING event_id, group_id, created_by, title, description, category, priority, start_time, end_time, created_at
                """,
                (
                    group_id,
                    username,
                    clean_title,
                    (data.description or "").strip(),
                    (data.category or "").strip(),
                    data.priority,
                    data.start_time,
                    data.end_time
                )
            )
            event = cursor.fetchone()
            connection.commit()

    return {"success": True, "event": event, "event_id": event["event_id"]}


@router.get("/{group_id}/events")
def list_group_events(
    group_id: int,
    authorization: Optional[str] = Header(default=None),
    session_token: Optional[str] = Header(default=None, alias="session-token")
):
    username = get_authenticated_username(authorization, session_token)

    with get_db_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            if not group_exists(cursor, group_id):
                raise HTTPException(status_code=404, detail="Group space not found")

            if not has_group_access(cursor, group_id, username):
                raise HTTPException(status_code=403, detail="You do not have access to this group space")

            cursor.execute(
                """
                SELECT event_id, group_id, created_by, title, description, category, priority, start_time, end_time, created_at
                FROM group_events
                WHERE group_id = %s
                ORDER BY start_time ASC
                """,
                (group_id,)
            )
            events = cursor.fetchall()

    return {"success": True, "events": events}
