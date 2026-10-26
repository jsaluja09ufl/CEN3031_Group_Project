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
