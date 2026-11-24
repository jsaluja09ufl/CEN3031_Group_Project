DROP TABLE IF EXISTS group_goals CASCADE;
DROP TABLE IF EXISTS group_spaces CASCADE;
DROP TABLE IF EXISTS group_space_membership;

CREATE TABLE group_spaces(
    id SERIAL PRIMARY KEY,
    group_type INT NOT NULL DEFAULT 0, -- 0 for private, 1 for public
    name TEXT NOT NULL,
    join_key TEXT NOT NULL UNIQUE, -- join code for private groups
    owner_user TEXT NOT NULL REFERENCES user_details(username) ON DELETE CASCADE,
    admin_list TEXT[] DEFAULT '{}'
);

CREATE TABLE group_goals(
    group_id INT REFERENCES group_spaces(id) ON DELETE CASCADE,
    goal_id SERIAL,
    goal_name TEXT NOT NULL,
    goal_description TEXT,
    goal_deadline timestamp,
    goal_scope TEXT DEFAULT 'EVERYONE',
    PRIMARY KEY (group_id, goal_id)
);

CREATE TABLE group_space_membership (
    username TEXT REFERENCES user_details(username) ON DELETE CASCADE,
    group_id INT REFERENCES group_spaces(id) ON DELETE CASCADE,
    PRIMARY KEY (username, group_id)
);
