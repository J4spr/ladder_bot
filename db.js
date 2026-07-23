// db.js
const { Pool } = require("pg");

const pool = new Pool({
	user: process.env.DB_USER || "postgres",
	host: process.env.DB_HOST || "localhost",
	database: process.env.DB_NAME || "fom",
	password: process.env.DB_PASSWORD || "Multiwan",
	port: process.env.DB_PORT || 5432,
});

const initDb = async (retries = 5, delay = 3000) => {
	while (retries > 0) {
		try {
			await pool.query(`
        CREATE TABLE IF NOT EXISTS ladders (
          ladder_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          ladder_name VARCHAR(100) NOT NULL,
          ladder_count INT DEFAULT 20,
          challenge_count INT DEFAULT 3,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS users (
          player_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          discord_id VARCHAR(32) UNIQUE NOT NULL,
          ign VARCHAR(100) NOT NULL,
          ladder_id INT REFERENCES ladders(ladder_id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS ladder_members (
          ladder_id INT REFERENCES ladders(ladder_id) ON DELETE CASCADE,
          discord_id VARCHAR(32) REFERENCES users(discord_id) ON DELETE CASCADE,
          position INT,
          is_active BOOLEAN DEFAULT TRUE,
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (ladder_id, discord_id)
        );

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
			return;
		} catch (error) {
			retries--;
			console.error(
				`⚠️ DB not ready, retrying in ${delay / 1000}s... (${retries} attempts left)`,
			);
			if (retries === 0) {
				console.error("❌ Error initializing database tables:", error);
			} else {
				await new Promise((res) => setTimeout(res, delay));
			}
		}
	}
};

initDb();

module.exports = pool;
