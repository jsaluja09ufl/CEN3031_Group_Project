CREATE TABLE IF NOT EXISTS group_goal_completions (
    group_id INT NOT NULL,
    goal_id INT NOT NULL,
    username TEXT REFERENCES user_details(username) ON DELETE CASCADE,
    completed_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (group_id, goal_id, username),
    FOREIGN KEY (group_id, goal_id) REFERENCES group_goals(group_id, goal_id) ON DELETE CASCADE
);
