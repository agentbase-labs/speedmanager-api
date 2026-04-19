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

    // v2.2: Lightweight visit tracking for public stats endpoint.
    // Counts page loads (one per tab-session). No raw IPs; only a hash.
    await client.query(`
      CREATE TABLE IF NOT EXISTS smp_visits (
        id SERIAL PRIMARY KEY,
        visited_at TIMESTAMPTZ DEFAULT NOW(),
        user_agent TEXT,
        ip_hash TEXT
      )
    `);

    console.log('Database initialized successfully (smp_users, smp_game_states, smp_visits)');
  } catch (err) {
    console.error('Database init error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };
