DROP TABLE IF EXISTS user_details CASCADE;
CREATE TABLE user_details (
    username text PRIMARY KEY,
    password_hash text NOT NULL,
    first_name text,
    last_name text,
    email text
);

CREATE TABLE error_log (
    error_id serial PRIMARY KEY,
    error_message text NOT NULL,
    error_timestamp timestamp DEFAULT current_timestamp
);

DROP TABLE IF EXISTS events CASCADE;
CREATE TABLE events (
    event_id serial PRIMARY KEY,
    username text NOT NULL REFERENCES user_details(username) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    category text,
    priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    start_time timestamp NOT NULL,
    end_time timestamp NOT NULL,
    created_at timestamp DEFAULT current_timestamp,
    CHECK (end_time > start_time)
);

DROP TABLE IF EXISTS habit_tasks CASCADE;
CREATE TABLE habit_tasks (
    id serial PRIMARY KEY,
    username text NOT NULL REFERENCES user_details(username) ON DELETE CASCADE,
    title text NOT NULL,
    description text DEFAULT '',
    type text NOT NULL CHECK (type IN ('task', 'habit')),
    completed boolean DEFAULT FALSE,
    created_at timestamp DEFAULT current_timestamp
);

DROP TABLE IF EXISTS group_tasks CASCADE;
DROP TABLE IF EXISTS group_events CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS group_spaces CASCADE;

CREATE TABLE group_spaces (
    group_id serial PRIMARY KEY,
    name text NOT NULL,
    description text DEFAULT '',
    admin_username text NOT NULL REFERENCES user_details(username) ON DELETE CASCADE,
    created_at timestamp DEFAULT current_timestamp
);

CREATE TABLE group_members (
    group_id integer NOT NULL REFERENCES group_spaces(group_id) ON DELETE CASCADE,
    username text NOT NULL REFERENCES user_details(username) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    PRIMARY KEY (group_id, username)
);

CREATE TABLE group_tasks (
    task_id serial PRIMARY KEY,
    group_id integer NOT NULL REFERENCES group_spaces(group_id) ON DELETE CASCADE,
    created_by text NOT NULL REFERENCES user_details(username) ON DELETE CASCADE,
    title text NOT NULL,
    description text DEFAULT '',
    completed boolean DEFAULT FALSE,
    created_at timestamp DEFAULT current_timestamp
);

CREATE TABLE group_events (
    event_id serial PRIMARY KEY,
    group_id integer NOT NULL REFERENCES group_spaces(group_id) ON DELETE CASCADE,
    created_by text NOT NULL REFERENCES user_details(username) ON DELETE CASCADE,
    title text NOT NULL,
    description text DEFAULT '',
    category text DEFAULT '',
    priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    start_time timestamp NOT NULL,
    end_time timestamp NOT NULL,
    created_at timestamp DEFAULT current_timestamp,
    CHECK (end_time > start_time)
);

