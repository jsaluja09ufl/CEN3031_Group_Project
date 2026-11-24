from importlib import resources
from dns import asyncquery
from importlib.resources import read_text
import psycopg
from dotenv import load_dotenv
import os
import password_handler
import uuid

# Load environment variables from .env
load_dotenv()



class SupabaseConnect:
    def __init__(self):
        # Fetch variables
        self.DATABASE_URL = os.getenv("DATABASE_URL")
        if not self.DATABASE_URL:
            raise ValueError("Database URL Invalid")

        self.connection = psycopg.connect(self.DATABASE_URL)

    def _ensure_connection(self):
        try:
            if self.connection is None or self.connection.closed:
                self.connection = psycopg.connect(self.DATABASE_URL)
            else:
                self.connection.execute("SELECT 1")
        except Exception:
            try:
                self.connection.close()
            except Exception:
                pass
            self.connection = psycopg.connect(self.DATABASE_URL)
    
    def create_user(self, username, password_hash, first_name, last_name, email):
        self._ensure_connection()
        with self.connection.cursor() as cursor:
            self.connection.rollback()
            try:
                cursor.execute("INSERT INTO user_details (username, password_hash, first_name, last_name, email) VALUES (%s, %s, %s, %s, %s)", (username, password_hash, first_name, last_name, email))
                self.connection.commit()
            except psycopg.errors.UniqueViolation as e:
                self.connection.rollback()
                cursor.execute("INSERT INTO error_log (error_message) VALUES (%s)", (str(e),))
                self.connection.commit()
                return "Username not available"
            except psycopg.Error as e:
                self.connection.rollback()
                cursor.execute("INSERT INTO error_log (error_message) VALUES (%s)", (str(e),))
                self.connection.commit()
                return "Unknown error has occured"

    def login(self, username, password):
        self._ensure_connection()
        with self.connection.cursor() as cursor:
            self.connection.rollback()
            cursor.execute("SELECT password_hash FROM user_details WHERE username = %s", (username,))
            result = cursor.fetchone()
            if not result:
                return (False, None)
            return (True, result[0])

    def create_event(self, username, event):
        self._ensure_connection()
        with self.connection.cursor() as cursor:
            self.connection.rollback()
            try:
                cursor.execute(
                    "INSERT INTO events (username, title, description, category, priority, start_time, end_time) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING event_id",
                    (username, event.title, event.description, event.category, event.priority, event.start_time, event.end_time)
                )
                event_id = cursor.fetchone()[0]
                self.connection.commit()
                return event_id
            except psycopg.Error as e:
                self.connection.rollback()
                cursor.execute("INSERT INTO error_log (error_message) VALUES (%s)", (str(e),))
                self.connection.commit()
                return None

    def get_events(self, username):
        self._ensure_connection()
        with self.connection.cursor() as cursor:
            self.connection.rollback()
            cursor.execute(
                "SELECT event_id, title, description, category, priority, start_time, end_time FROM events WHERE username = %s ORDER BY start_time",
                (username,)
            )
            # https://www.psycopg.org/psycopg3/docs/api/cursors.html#psycopg.Cursor.description
            columns = [col.name for col in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]

    def create_group_space(self, username, group_name, group_type=0):
        self._ensure_connection()
        with self.connection.cursor() as cursor:
            self.connection.rollback()
            try:
                join_key = str(uuid.uuid4())
                cursor.execute(
                    "INSERT INTO group_spaces (group_type, name, join_key, owner_user) VALUES (%s, %s, %s, %s) RETURNING id, join_key",
                    (group_type, group_name, join_key, username)
                )
                row = cursor.fetchone()
                row_id = row[0]
                cursor.execute(
                    "INSERT INTO group_space_membership (group_id, username) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (row_id, username)
                )
                self.connection.commit()
                return {"id": row[0]}
            except psycopg.Error as e:
                self.connection.rollback()
                cursor.execute("INSERT INTO error_log (error_message) VALUES (%s)", (str(e),))
                self.connection.commit()
                return None

    def get_user_group_space(self, username):
        self._ensure_connection()
        with self.connection.cursor() as cursor:
            self.connection.rollback()
            cursor.execute(
                """
                SELECT gs.id, gs.name, gs.group_type, gs.owner_user
                FROM group_spaces gs
                JOIN group_space_membership gsm ON gs.id = gsm.group_id
                WHERE gsm.username = %s
                ORDER BY gs.id DESC
                """,
                (username,)
            )
            columns = [col.name for col in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]

    def create_group_goal(self, access_username, group_id, goal_name, goal_description=None, goal_scope="EVERYONE", goal_deadline=None):
        self._ensure_connection()
        with self.connection.cursor() as cursor:
            self.connection.rollback()
            try:
                cursor.execute("SELECT 1 FROM group_spaces WHERE id = %s AND (%s = owner_user OR %s = ANY(admin_list))", (group_id, access_username, access_username))
                if cursor.fetchone() is None:
                    return {"success": False, "message": "You do not have permission to do this action"}
                cursor.execute(
                    """
                    INSERT INTO group_goals (group_id, goal_name, goal_description, goal_deadline, goal_scope)   
                    VALUES (%s, %s, %s, %s, %s) RETURNING goal_id
                    """,
                    (group_id, goal_name, goal_description, goal_deadline, goal_scope)
                )
                row = cursor.fetchone()
                self.connection.commit()
                return {"success": True, "goal_id": row[0]}
            except psycopg.Error as e:
                self.connection.rollback()
                cursor.execute("INSERT INTO error_log (error_message) VALUES (%s)", (str(e),))
                self.connection.commit()
                return {"success": False, "error": "Could not create goal"}

    def get_group_goals(self, access_username, group_id):
        self._ensure_connection()
        with self.connection.cursor() as cursor:
            self.connection.rollback()
            try:
                cursor.execute(
                    """
                    SELECT 1 FROM group_spaces gs
                    LEFT JOIN group_space_membership gsm ON gs.id = gsm.group_id
                    WHERE gs.id = %s AND (gs.owner_user = %s OR gsm.username = %s)
                    """,
                    (group_id, access_username, access_username)
                )
                if not cursor.fetchone():
                    return {"success": False, "error": "You must be a member of this group space to view goals"}

                cursor.execute(
                    """
                    SELECT goal_id, goal_name, goal_description, goal_deadline, goal_scope
                    FROM group_goals
                    WHERE group_id = %s
                    ORDER BY goal_id ASC
                    """,
                    (group_id,)
                )
                columns = [col.name for col in cursor.description]
                goals = []
                for row in cursor.fetchall():
                    item = dict(zip(columns, row))
                    if item.get("goal_deadline"):
                        item["goal_deadline"] = item["goal_deadline"].isoformat()
                    goals.append(item)
                return {"success": True, "goals": goals}
            except psycopg.Error as e:
                self.connection.rollback()
                cursor.execute("INSERT INTO error_log (error_message) VALUES (%s)", (str(e),))
                self.connection.commit()
                return {"success": False, "error": "Could not fetch group goals"}


    
    