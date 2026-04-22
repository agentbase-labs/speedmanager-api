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

    // v2.95: Per-goal event log for milestone tracking and future analytics.
    // Each row = one goal scored globally. global_goal_number is assigned
    // atomically inside a transaction so it always matches total_goals.
    await client.query(`
      CREATE TABLE IF NOT EXISTS smp_goal_events (
        id                  BIGSERIAL PRIMARY KEY,
        global_goal_number  BIGINT NOT NULL,
        user_id             INTEGER REFERENCES smp_users(id) ON DELETE SET NULL,
        username            TEXT,
        player_name         TEXT,
        player_id           TEXT,
        team_id             TEXT,
        team_name           TEXT,
        opponent_id         TEXT,
        opponent_name       TEXT,
        minute              INTEGER,
        is_home             BOOLEAN,
        country_code        TEXT,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS smp_goal_events_global_num_idx ON smp_goal_events (global_goal_number)`);
    await client.query(`CREATE INDEX IF NOT EXISTS smp_goal_events_user_idx ON smp_goal_events (user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS smp_goal_events_created_idx ON smp_goal_events (created_at DESC)`);

    console.log('Database initialized successfully (smp_users, smp_game_states, smp_visits, smp_global_stats, smp_login_events, smp_goal_events)');
  } catch (err) {
    console.error('Database init error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };
// build: v2.93 admin-dashboard

// build: v2.95 goal-events-log 1776874633
