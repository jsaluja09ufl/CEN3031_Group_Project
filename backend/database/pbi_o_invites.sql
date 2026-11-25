CREATE TABLE IF NOT EXISTS group_invites (
    group_id INT REFERENCES group_spaces(id) ON DELETE CASCADE,
    invited_username TEXT REFERENCES user_details(username) ON DELETE CASCADE,
    invited_by TEXT REFERENCES user_details(username) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (group_id, invited_username)
);
