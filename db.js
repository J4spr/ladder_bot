// db.js
const { Pool } = require("pg");

const pool = new Pool({
	user: process.env.DB_USER || "postgres",
	host: process.env.DB_HOST || "localhost",
	database: process.env.DB_NAME || "fom",
	password: process.env.DB_PASSWORD || "Multiwan",
	port: process.env.DB_PORT || 5432,
});

const initDb = async () => {
	try {
		await pool.query(`
      -- 1. Ladders table with auto-incrementing ladder_id
      CREATE TABLE IF NOT EXISTS ladders (
        ladder_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        ladder_name VARCHAR(100) NOT NULL,
        ladder_count INT DEFAULT 20,
        challenge_count INT DEFAULT 3,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 2. Users table
      CREATE TABLE IF NOT EXISTS users (
        player_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        discord_id VARCHAR(32) UNIQUE NOT NULL,
        ign VARCHAR(100) NOT NULL
      );

      -- 3. Ladder members table referencing ladder_id
      CREATE TABLE IF NOT EXISTS ladder_members (
        ladder_id INT REFERENCES ladders(ladder_id) ON DELETE CASCADE,
        discord_id VARCHAR(32) REFERENCES users(discord_id) ON DELETE CASCADE,
        position INT NOT NULL,
        PRIMARY KEY (ladder_id, discord_id)
      );

      -- 4. Active challenges referencing ladder_id
      CREATE TABLE IF NOT EXISTS active_challenges (
        ladder_id INT REFERENCES ladders(ladder_id) ON DELETE CASCADE,
        challenger_id VARCHAR(32) REFERENCES users(discord_id) ON DELETE CASCADE,
        defender_id VARCHAR(32) REFERENCES users(discord_id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        created_at BIGINT,
        PRIMARY KEY (ladder_id, challenger_id)
      );
    `);
		console.log("✅ Database tables initialized successfully.");
	} catch (error) {
		console.error("❌ Error initializing database tables:", error);
	}
};

initDb();

module.exports = pool;
