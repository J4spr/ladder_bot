// db.js
const { Pool } = require("pg");

const pool = new Pool({
	user: process.env.DB_USER || "postgres",
	host: process.env.DB_HOST || "localhost",
	database: process.env.DB_NAME || "fom",
	password: process.env.DB_PASSWORD || "Multiwan",
	port: process.env.DB_PORT || 5432,
});

// Initialize tables on startup
const initDb = async () => {
	try {
		// 1. Create tables individually or in a single transaction
		await pool.query(`
      CREATE TABLE IF NOT EXISTS ladders (
        ladder_name VARCHAR(100) PRIMARY KEY,
        ladder_count INT DEFAULT 20,
        challenge_count INT DEFAULT 3
      );

      CREATE TABLE IF NOT EXISTS users (
        discord_id VARCHAR(32) PRIMARY KEY,
        ign VARCHAR(100) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ladder_members (
        ladder_name VARCHAR(100) REFERENCES ladders(ladder_name) ON DELETE CASCADE,
        discord_id VARCHAR(32) REFERENCES users(discord_id) ON DELETE CASCADE,
        position INT NOT NULL,
        PRIMARY KEY (ladder_name, discord_id)
      );

      CREATE TABLE IF NOT EXISTS active_challenges (
        ladder_name VARCHAR(100) REFERENCES ladders(ladder_name) ON DELETE CASCADE,
        challenger_id VARCHAR(32) REFERENCES users(discord_id) ON DELETE CASCADE,
        defender_id VARCHAR(32) REFERENCES users(discord_id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        created_at BIGINT,
        PRIMARY KEY (ladder_name, challenger_id)
      );
    `);
		console.log("✅ Database tables initialized successfully.");
	} catch (error) {
		console.error("❌ Error initializing database tables:", error);
	}
};

// Execute initialization
initDb();

// Export the pool ONCE at the end
module.exports = pool;
