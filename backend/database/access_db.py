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
                SELECT 
                    gs.id, 
                    gs.name, 
                    gs.group_type, 
                    gs.owner_user,
                    (gs.owner_user = %s OR %s = ANY(COALESCE(gs.admin_list, '{}'))) AS is_admin
                FROM group_spaces gs
                JOIN group_space_membership gsm ON gs.id = gsm.group_id
                WHERE gsm.username = %s
                ORDER BY gs.id DESC
                """,
                (username, username, username)
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
                if goal_scope and goal_scope != "EVERYONE":
                    cursor.execute(
                        "SELECT 1 FROM group_space_membership WHERE group_id = %s AND username = %s",
                        (group_id, goal_scope)
                    )
                    if cursor.fetchone() is None:
                        return {"success": False, "error": "Goal can only be assigned to a member of this group space"}
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
                    SELECT gg.goal_id, gg.goal_name, gg.goal_description, gg.goal_deadline, gg.goal_scope,
                        (gc.username IS NOT NULL) AS completed
                    FROM group_goals gg
                    LEFT JOIN group_goal_completions gc
                        ON gc.group_id = gg.group_id AND gc.goal_id = gg.goal_id AND gc.username = %s
                    WHERE gg.group_id = %s
                    ORDER BY gg.goal_id ASC
                    """,
                    (access_username, group_id)
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

    def get_group_member_list(self, access_username, group_id):
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
                    return {"success": False, "error": "You must be a member of this group space to view members"}
                
                cursor.execute(
                    """
                    SELECT 
                        m.username,
                        (gs.owner_user = m.username OR m.username = ANY(COALESCE(gs.admin_list, '{}'))) AS is_admin,
                        (gs.owner_user = m.username) AS is_owner
                    FROM (
                        SELECT username FROM group_space_membership WHERE group_id = %s
                        UNION
                        SELECT owner_user AS username FROM group_spaces WHERE id = %s
                    ) m
                    JOIN group_spaces gs ON gs.id = %s
                    ORDER BY is_owner DESC, is_admin DESC, m.username ASC
                    """,
                    (group_id, group_id, group_id)
                )
                columns = [col.name for col in cursor.description]
                members = [dict(zip(columns, row)) for row in cursor.fetchall()]
                return {"success": True, "members": members}
            except psycopg.Error as e:
                self.connection.rollback()
                cursor.execute("INSERT INTO error_log (error_message) VALUES (%s)", (str(e),))
                self.connection.commit()
                return {"success": False, "error": "Could not fetch group members"}

    def add_group_space_admin(self, access_username, group_id, add_username):
        self._ensure_connection()
        with self.connection.cursor() as cursor:
            self.connection.rollback()
            try:
                cursor.execute(
                    """
                    SELECT 1 FROM group_spaces
                    WHERE id = %s AND (owner_user = %s OR %s = ANY(COALESCE(admin_list, '{}')))
                    """,
                    (group_id, access_username, access_username)
                )
                if not cursor.fetchone():
                    return {"success": False, "error": "You must be an admin to take this action"}
                
                cursor.execute(
                    """
                    SELECT 1 FROM group_space_membership WHERE group_id = %s AND username = %s
                    """,
                    (group_id, add_username)
                )
                if not cursor.fetchone():
                    return {"success": False, "error": "The user you intend to add must be a group member already"}

                # Check if user is already an admin
                cursor.execute(
                    """
                    SELECT 1 FROM group_spaces
                    WHERE id = %s AND (owner_user = %s OR %s = ANY(COALESCE(admin_list, '{}')))
                    """,
                    (group_id, add_username, add_username)
                )
                if cursor.fetchone():
                    return {"success": True, "message": "User is already an admin"}
                
                cursor.execute(
                    """
                    UPDATE group_spaces
                    SET admin_list = array_append(COALESCE(admin_list, '{}'), %s)
                    WHERE id = %s
                    """,
                    (add_username, group_id)
                )
                self.connection.commit()
                return {"success": True, "message": "Admin added successfully"}
            except psycopg.Error as e:
                self.connection.rollback()
                cursor.execute("INSERT INTO error_log (error_message) VALUES (%s)", (str(e),))
                self.connection.commit()
                return {"success": False, "error": "Could not add admin"}

    def invite_user_to_group(self, access_username, group_id, invited_username):
        self._ensure_connection()
        with self.connection.cursor() as cursor:
            self.connection.rollback()
            try:
                cursor.execute(
                    """
                    SELECT group_type FROM group_spaces
                    WHERE id = %s AND (owner_user = %s OR %s = ANY(COALESCE(admin_list, '{}')))
                    """,
                    (group_id, access_username, access_username)
                )
                row = cursor.fetchone()
                if not row:
                    return {"success": False, "error": "You must be an admin to invite users"}
                if row[0] != 0:
                    return {"success": False, "error": "Invites are only used for private group spaces"}

                cursor.execute("SELECT 1 FROM user_details WHERE username = %s", (invited_username,))
                if not cursor.fetchone():
                    return {"success": False, "error": "User does not exist"}

                cursor.execute(
                    "SELECT 1 FROM group_space_membership WHERE group_id = %s AND username = %s",
                    (group_id, invited_username)
                )
                if cursor.fetchone():
                    return {"success": False, "error": "User is already a member of this group space"}

                cursor.execute(
                    """
                    INSERT INTO group_invites (group_id, invited_username, invited_by)
                    VALUES (%s, %s, %s) ON CONFLICT DO NOTHING
                    """,
                    (group_id, invited_username, access_username)
                )
                self.connection.commit()
                return {"success": True, "message": "Invite sent"}
            except psycopg.Error as e:
                self.connection.rollback()
                cursor.execute("INSERT INTO error_log (error_message) VALUES (%s)", (str(e),))
                self.connection.commit()
                return {"success": False, "error": "Could not send invite"}

    def get_user_invites(self, username):
        self._ensure_connection()
        with self.connection.cursor() as cursor:
            self.connection.rollback()
            try:
                cursor.execute(
                    """
                    SELECT gi.group_id, gs.name, gi.invited_by
                    FROM group_invites gi
                    JOIN group_spaces gs ON gs.id = gi.group_id
                    WHERE gi.invited_username = %s
                    ORDER BY gi.created_at DESC
                    """,
                    (username,)
                )
                columns = [col.name for col in cursor.description]
                invites = [dict(zip(columns, row)) for row in cursor.fetchall()]
                return {"success": True, "invites": invites}
            except psycopg.Error as e:
                self.connection.rollback()
                cursor.execute("INSERT INTO error_log (error_message) VALUES (%s)", (str(e),))
                self.connection.commit()
                return {"success": False, "error": "Could not fetch invites"}

    def respond_to_invite(self, username, group_id, accept):
        self._ensure_connection()
        with self.connection.cursor() as cursor:
            self.connection.rollback()
            try:
                cursor.execute(
                    "SELECT 1 FROM group_invites WHERE group_id = %s AND invited_username = %s",
                    (group_id, username)
                )
                if not cursor.fetchone():
                    return {"success": False, "error": "No invite found for this group space"}

                if accept:
                    cursor.execute(
                        "INSERT INTO group_space_membership (group_id, username) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                        (group_id, username)
                    )
                cursor.execute(
                    "DELETE FROM group_invites WHERE group_id = %s AND invited_username = %s",
                    (group_id, username)
                )
                self.connection.commit()
                if accept:
                    return {"success": True, "message": "Joined group space"}
                return {"success": True, "message": "Invite declined"}
            except psycopg.Error as e:
                self.connection.rollback()
                cursor.execute("INSERT INTO error_log (error_message) VALUES (%s)", (str(e),))
                self.connection.commit()
                return {"success": False, "error": "Could not respond to invite"}

    def create_group_task(self, access_username, group_id, title, description=""):
        self._ensure_connection()
        with self.connection.cursor() as cursor:
            self.connection.rollback()
            try:
                cursor.execute(
                    """
                    SELECT 1 FROM group_spaces
                    WHERE id = %s AND (owner_user = %s OR %s = ANY(COALESCE(admin_list, '{}')))
                    """,
                    (group_id, access_username, access_username)
                )
                if not cursor.fetchone():
                    return {"success": False, "error": "You must be an admin to create group tasks"}

                cursor.execute(
                    """
                    INSERT INTO group_tasks (group_id, created_by, title, description)
                    VALUES (%s, %s, %s, %s)
                    RETURNING task_id, group_id, created_by, title, description, completed, created_at
                    """,
                    (group_id, access_username, title, description or "")
                )
                row = cursor.fetchone()
                columns = [col.name for col in cursor.description]
                task = dict(zip(columns, row))
                if task.get("created_at"):
                    task["created_at"] = task["created_at"].isoformat()
                self.connection.commit()
                return {"success": True, "task": task, "task_id": task["task_id"]}
            except psycopg.Error as e:
                self.connection.rollback()
                cursor.execute("INSERT INTO error_log (error_message) VALUES (%s)", (str(e),))
                self.connection.commit()
                return {"success": False, "error": "Could not create group task"}

    def get_group_tasks(self, access_username, group_id):
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
                    return {"success": False, "error": "You must be a member of this group space to view tasks"}

                cursor.execute(
                    """
                    SELECT task_id, group_id, created_by, title, description, completed, created_at
                    FROM group_tasks
                    WHERE group_id = %s
                    ORDER BY created_at DESC
                    """,
                    (group_id,)
                )
                columns = [col.name for col in cursor.description]
                tasks = []
                for row in cursor.fetchall():
                    item = dict(zip(columns, row))
                    if item.get("created_at"):
                        item["created_at"] = item["created_at"].isoformat()
                    tasks.append(item)
                return {"success": True, "tasks": tasks}
            except psycopg.Error as e:
                self.connection.rollback()
                cursor.execute("INSERT INTO error_log (error_message) VALUES (%s)", (str(e),))
                self.connection.commit()
                return {"success": False, "error": "Could not fetch group tasks"}

    def toggle_group_task(self, access_username, group_id, task_id):
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
                    return {"success": False, "error": "You must be a member of this group space to toggle tasks"}

                cursor.execute(
                    """
                    UPDATE group_tasks
                    SET completed = NOT completed
                    WHERE task_id = %s AND group_id = %s
                    RETURNING task_id, completed
                    """,
                    (task_id, group_id)
                )
                row = cursor.fetchone()
                if not row:
                    return {"success": False, "error": "Task not found"}
                self.connection.commit()
                return {"success": True, "task": {"task_id": row[0], "completed": row[1]}}
            except psycopg.Error as e:
                self.connection.rollback()
                cursor.execute("INSERT INTO error_log (error_message) VALUES (%s)", (str(e),))
                self.connection.commit()
                return {"success": False, "error": "Could not toggle group task"}

    def create_group_event(self, access_username, group_id, event):
        self._ensure_connection()
        with self.connection.cursor() as cursor:
            self.connection.rollback()
            try:
                cursor.execute(
                    """
                    SELECT 1 FROM group_spaces
                    WHERE id = %s AND (owner_user = %s OR %s = ANY(COALESCE(admin_list, '{}')))
                    """,
                    (group_id, access_username, access_username)
                )
                if not cursor.fetchone():
                    return {"success": False, "error": "You must be an admin to create group events"}

                cursor.execute(
                    """
                    INSERT INTO group_events (group_id, created_by, title, description, category, priority, start_time, end_time)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING event_id, group_id, created_by, title, description, category, priority, start_time, end_time, created_at
                    """,
                    (
                        group_id,
                        access_username,
                        event.title,
                        event.description,
                        event.category,
                        event.priority,
                        event.start_time,
                        event.end_time
                    )
                )
                row = cursor.fetchone()
                columns = [col.name for col in cursor.description]
                event_dict = dict(zip(columns, row))
                if event_dict.get("start_time"):
                    event_dict["start_time"] = event_dict["start_time"].isoformat()
                if event_dict.get("end_time"):
                    event_dict["end_time"] = event_dict["end_time"].isoformat()
                if event_dict.get("created_at"):
                    event_dict["created_at"] = event_dict["created_at"].isoformat()
                self.connection.commit()
                return {"success": True, "event": event_dict, "event_id": event_dict["event_id"]}
            except psycopg.Error as e:
                self.connection.rollback()
                cursor.execute("INSERT INTO error_log (error_message) VALUES (%s)", (str(e),))
                self.connection.commit()
                return {"success": False, "error": "Could not create group event"}

    def get_group_events(self, access_username, group_id):
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
                    return {"success": False, "error": "You must be a member of this group space to view events"}

                cursor.execute(
                    """
                    SELECT event_id, group_id, created_by, title, description, category, priority, start_time, end_time, created_at
                    FROM group_events
                    WHERE group_id = %s
                    ORDER BY start_time ASC
                    """,
                    (group_id,)
                )
                columns = [col.name for col in cursor.description]
                events = []
                for row in cursor.fetchall():
                    item = dict(zip(columns, row))
                    if item.get("start_time"):
                        item["start_time"] = item["start_time"].isoformat()
                    if item.get("end_time"):
                        item["end_time"] = item["end_time"].isoformat()
                    if item.get("created_at"):
                        item["created_at"] = item["created_at"].isoformat()
                    events.append(item)
                return {"success": True, "events": events}
            except psycopg.Error as e:
                self.connection.rollback()
                cursor.execute("INSERT INTO error_log (error_message) VALUES (%s)", (str(e),))
                self.connection.commit()
                return {"success": False, "error": "Could not fetch group events"}

    def toggle_goal_completion(self, access_username, group_id, goal_id):
        self._ensure_connection()
        with self.connection.cursor() as cursor:
            self.connection.rollback()
            try:
                cursor.execute(
                    """
                    SELECT gg.goal_scope FROM group_goals gg
                    JOIN group_space_membership gsm ON gsm.group_id = gg.group_id
                    WHERE gg.group_id = %s AND gg.goal_id = %s AND gsm.username = %s
                    """,
                    (group_id, goal_id, access_username)
                )
                row = cursor.fetchone()
                if not row:
                    return {"success": False, "error": "Goal not found in a group space you are a member of"}
                if row[0] != "EVERYONE" and row[0] != access_username:
                    return {"success": False, "error": "This goal is not assigned to you"}

                cursor.execute(
                    "DELETE FROM group_goal_completions WHERE group_id = %s AND goal_id = %s AND username = %s",
                    (group_id, goal_id, access_username)
                )
                completed = False
                if cursor.rowcount == 0:
                    cursor.execute(
                        "INSERT INTO group_goal_completions (group_id, goal_id, username) VALUES (%s, %s, %s)",
                        (group_id, goal_id, access_username)
                    )
                    completed = True
                self.connection.commit()
                return {"success": True, "goal_id": goal_id, "completed": completed}
            except psycopg.Error as e:
                self.connection.rollback()
                cursor.execute("INSERT INTO error_log (error_message) VALUES (%s)", (str(e),))
                self.connection.commit()
                return {"success": False, "error": "Could not update goal progress"}

    def get_group_goal_progress(self, access_username, group_id):
        self._ensure_connection()
        with self.connection.cursor() as cursor:
            self.connection.rollback()
            try:
                cursor.execute(
                    """
                    SELECT 1 FROM group_spaces
                    WHERE id = %s AND (owner_user = %s OR %s = ANY(COALESCE(admin_list, '{}')))
                    """,
                    (group_id, access_username, access_username)
                )
                if not cursor.fetchone():
                    return {"success": False, "error": "You must be an admin to view goal progress"}

                cursor.execute(
                    """
                    SELECT gg.goal_id, gsm.username, (gc.username IS NOT NULL) AS completed
                    FROM group_goals gg
                    JOIN group_space_membership gsm ON gsm.group_id = gg.group_id
                    LEFT JOIN group_goal_completions gc
                        ON gc.group_id = gg.group_id AND gc.goal_id = gg.goal_id AND gc.username = gsm.username
                    WHERE gg.group_id = %s AND (gg.goal_scope = 'EVERYONE' OR gg.goal_scope = gsm.username)
                    ORDER BY gg.goal_id ASC, gsm.username ASC
                    """,
                    (group_id,)
                )
                progress = {}
                for goal_id, username, completed in cursor.fetchall():
                    if goal_id not in progress:
                        progress[goal_id] = {"goal_id": goal_id, "completed_count": 0, "total": 0, "members": []}
                    progress[goal_id]["members"].append({"username": username, "completed": completed})
                    progress[goal_id]["total"] += 1
                    if completed:
                        progress[goal_id]["completed_count"] += 1
                return {"success": True, "progress": list(progress.values())}
            except psycopg.Error as e:
                self.connection.rollback()
                cursor.execute("INSERT INTO error_log (error_message) VALUES (%s)", (str(e),))
                self.connection.commit()
                return {"success": False, "error": "Could not fetch goal progress"}
