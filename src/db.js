const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function initDb() {
  const client = await pool.connect();
  try {
    // Use smp_ prefix to avoid conflicts with any existing tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS smp_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS smp_game_states (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES smp_users(id) ON DELETE CASCADE,
        state JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `);

    console.log('Database initialized successfully (smp_users, smp_game_states)');
  } catch (err) {
    console.error('Database init error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };
