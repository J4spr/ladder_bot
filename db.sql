-- 1. User Profiles (Saves IGNs per game)
CREATE TABLE IF NOT EXISTS users (
    discord_id TEXT PRIMARY KEY,
    ign_lol TEXT,
    ign_rl TEXT
);

-- 2. Ladders Configuration
CREATE TABLE IF NOT EXISTS ladders (
    game_id TEXT PRIMARY KEY,               -- e.g., 'lol', 'rl'
    game_name TEXT NOT NULL,                -- e.g., 'League of Legends 1v1'
    max_places INTEGER DEFAULT 20,
    challenge_range INTEGER DEFAULT 2,
    bottom_challenge_range INTEGER DEFAULT 10
);

-- 3. Standings (Ordered list of active players)
CREATE TABLE IF NOT EXISTS ladder_members (
    game_id TEXT,
    discord_id TEXT,
    position INTEGER,                       -- e.g., 1, 2, 3...
    PRIMARY KEY (game_id, discord_id),
    FOREIGN KEY (game_id) REFERENCES ladders(game_id) ON DELETE CASCADE,
    FOREIGN KEY (discord_id) REFERENCES users(discord_id) ON DELETE CASCADE
);

-- 4. Active Match Locks (Tracks ongoing challenges)
CREATE TABLE IF NOT EXISTS active_challenges (
    game_id TEXT,
    challenger_id TEXT,
    defender_id TEXT,
    timestamp INTEGER,
    PRIMARY KEY (game_id, challenger_id)
);