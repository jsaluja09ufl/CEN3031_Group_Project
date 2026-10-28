
import os
from uuid import UUID

import psycopg
from psycopg.rows import dict_row
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

import redis

router = APIRouter(prefix="/habit-tasks", tags=["Habits and Tasks"])


class HabitTaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    type: str


def authenticated_username(authorization):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Login required")

    token = authorization.removeprefix("Bearer ").strip()
    session = redis.validate_session(token)

    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    # Matches the session structure returned by validate_user.
    username = session.get("username")

    if not username:
        raise HTTPException(status_code=401, detail="Invalid session")

    return username


@router.post("")
def create_habit_task(
    data: HabitTaskCreate,
    authorization: str | None = Header(default=None)
):
    username = authenticated_username(authorization)

    title = data.title.strip()

    if not title:
        raise HTTPException(status_code=422, detail="Name is required")

    if data.type not in ("task", "habit"):
        raise HTTPException(status_code=422, detail="Invalid entry type")

    with psycopg.connect(os.environ["DATABASE_URL"]) as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                INSERT INTO habit_tasks
                    (username, title, description, type)
                VALUES (%s, %s, %s, %s)
                RETURNING id, title, description, type,
                          completed, created_at
                """,
                (username, title, data.description.strip(), data.type)
            )
            result = cursor.fetchone()

    return result


@router.get("")
def list_habit_tasks(
    authorization: str | None = Header(default=None)
):
    username = authenticated_username(authorization)

    with psycopg.connect(os.environ["DATABASE_URL"]) as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                SELECT id, title, description, type,
                       completed, created_at
                FROM habit_tasks
                WHERE username = %s
                ORDER BY created_at DESC
                """,
                (username,)
            )
            return cursor.fetchall()
