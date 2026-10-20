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