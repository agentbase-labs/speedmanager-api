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
    await client.query(`
      CREATE TABLE IF NOT EXISTS smp_visits (
        id SERIAL PRIMARY KEY,
        visited_at TIMESTAMPTZ DEFAULT NOW(),
        user_agent TEXT,
        ip_hash TEXT
      )
    `);

    // v2.90: Global goals counter — single-row table holding worldwide goal total.
    await client.query(`
      CREATE TABLE IF NOT EXISTS smp_global_stats (
        id INTEGER PRIMARY KEY DEFAULT 1,
        total_goals BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT single_row CHECK (id = 1)
      )
    `);
    await client.query(`
      INSERT INTO smp_global_stats (id, total_goals)
      VALUES (1, 0)
      ON CONFLICT (id) DO NOTHING
    `);

    // v2.93: Track total matches played worldwide (separate counter).
    await client.query(`
      ALTER TABLE smp_global_stats
      ADD COLUMN IF NOT EXISTS total_matches BIGINT NOT NULL DEFAULT 0
    `);

    // v2.93: Per-login event log for admin dashboard country stats.
    await client.query(`
      CREATE TABLE IF NOT EXISTS smp_login_events (
        id BIGSERIAL PRIMARY KEY,
        user_id INT REFERENCES smp_users(id) ON DELETE SET NULL,
        ip_address VARCHAR(45),
        country_code VARCHAR(2),
        country_name VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_login_events_country ON smp_login_events(country_code)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_login_events_created ON smp_login_events(created_at)`);

    console.log('Database initialized successfully (smp_users, smp_game_states, smp_visits, smp_global_stats, smp_login_events)');
  } catch (err) {
    console.error('Database init error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };
// build: v2.93 admin-dashboard
