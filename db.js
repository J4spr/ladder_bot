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
          ladderid INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          laddername VARCHAR(100) NOT NULL,
          laddercount INT DEFAULT 20,
          challengecount INT DEFAULT 3,
          isactive BOOLEAN DEFAULT TRUE,
          createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS users (
          playerid INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          discordid VARCHAR(32) UNIQUE NOT NULL,
          nickname VARCHAR(100) NOT NULL,
          ladderid INT REFERENCES ladders(ladderid) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS laddermembers (
          ladderid INT REFERENCES ladders(ladderid) ON DELETE CASCADE,
          discordid VARCHAR(32) REFERENCES users(discordid) ON DELETE CASCADE,
          position INT,
          isactive BOOLEAN DEFAULT TRUE,
          joinedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (ladderid, discordid)
        );

        CREATE TABLE IF NOT EXISTS activechallenges (
          ladderid INT REFERENCES ladders(ladderid) ON DELETE CASCADE,
          challengerid VARCHAR(32) REFERENCES users(discordid) ON DELETE CASCADE,
          defenderid VARCHAR(32) REFERENCES users(discordid) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'pending',
          createdat BIGINT,
          PRIMARY KEY (ladderid, challengerid)
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
