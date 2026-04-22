// ─── Admin dashboard endpoints (v2.93) ──────────────────────────────────────
// POST /api/admin/login  — hardcoded creds → JWT with { admin: true }
// GET  /api/admin/stats  — aggregated real-time stats (admin JWT required)
//
// Hardcoded admin creds live in env (preferred) or fall back to known values.
// Brute-force guard: 10 attempts / 5 min per IP.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { requireAdmin, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Admin credentials — env overrides hardcoded defaults.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'moshe';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'royhogeg';

// ── Simple per-IP brute-force guard for admin-login ───────────────────────
const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const loginAttempts = new Map();
function checkLoginRate(ip) {
  const now = Date.now();
  const arr = loginAttempts.get(ip) || [];
  const fresh = arr.filter(ts => (now - ts) < LOGIN_WINDOW_MS);
  if (fresh.length >= LOGIN_MAX_ATTEMPTS) {
    loginAttempts.set(ip, fresh);
    return false;
  }
  fresh.push(now);
  loginAttempts.set(ip, fresh);
  return true;
}

// ── In-memory cache for /stats (3s) ───────────────────────────────────────
const CACHE_TTL_MS = 3 * 1000;
let statsCache = null;
let statsCachedAt = 0;

// POST /api/admin/login
router.post('/login', (req, res) => {
  const xff = req.headers['x-forwarded-for'];
  const ip = (xff ? String(xff).split(',')[0].trim() : null) || req.ip || 'unknown';
  if (!checkLoginRate(ip)) {
    return res.status(429).json({ error: 'Too many attempts. Try again in 5 minutes.' });
  }
  const { username, password } = req.body || {};
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ admin: true, u: username }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
});

// GET /api/admin/stats — aggregated real-time metrics
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const now = Date.now();
    if (statsCache && (now - statsCachedAt) < CACHE_TTL_MS) {
      return res.json(statsCache);
    }

    // Run queries in parallel
    const [
      globalStatsR,
      usersCountR,
      teamsCountR,
      active24hR,
      active7dR,
      signupsR,
      topCountriesLoginsR,
      topCountriesUsersR,
      lastLoginR,
    ] = await Promise.all([
      pool.query(`SELECT total_goals, total_matches, updated_at FROM smp_global_stats WHERE id = 1`),
      pool.query(`SELECT COUNT(*)::int AS c FROM smp_users`),
      // "Teams created" = count of game_states with a selected team in their JSONB state
      pool.query(`
        SELECT COUNT(*)::int AS c FROM smp_game_states
        WHERE state IS NOT NULL
          AND (state::jsonb) ? 'selectedTeamId'
          AND (state::jsonb)->>'selectedTeamId' IS NOT NULL
      `).catch(() => ({ rows: [{ c: 0 }] })),
      pool.query(`SELECT COUNT(DISTINCT user_id)::int AS c FROM smp_login_events WHERE created_at > NOW() - INTERVAL '24 hours' AND user_id IS NOT NULL`),
      pool.query(`SELECT COUNT(DISTINCT user_id)::int AS c FROM smp_login_events WHERE created_at > NOW() - INTERVAL '7 days' AND user_id IS NOT NULL`),
      pool.query(`
        SELECT TO_CHAR(created_at::date, 'YYYY-MM-DD') AS d, COUNT(*)::int AS c
        FROM smp_users
        WHERE created_at > NOW() - INTERVAL '14 days'
        GROUP BY created_at::date
        ORDER BY created_at::date ASC
      `),
      pool.query(`
        SELECT country_code AS code, country_name AS name, COUNT(*)::int AS c
        FROM smp_login_events
        WHERE country_code IS NOT NULL
        GROUP BY country_code, country_name
        ORDER BY c DESC
        LIMIT 10
      `),
      pool.query(`
        SELECT country_code AS code, country_name AS name, COUNT(DISTINCT user_id)::int AS c
        FROM smp_login_events
        WHERE country_code IS NOT NULL AND user_id IS NOT NULL
        GROUP BY country_code, country_name
        ORDER BY c DESC
        LIMIT 10
      `),
      pool.query(`SELECT MAX(created_at) AS t FROM smp_login_events`),
    ]);

    const gs = globalStatsR.rows[0] || { total_goals: 0, total_matches: 0, updated_at: new Date().toISOString() };

    // Build 14-day signup sparkline: fill missing days with 0
    const signupMap = new Map(signupsR.rows.map(r => [r.d, r.c]));
    const signups = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      signups.push({ date: key, count: signupMap.get(key) || 0 });
    }

    const payload = {
      total_goals: Number(gs.total_goals || 0),
      total_matches: Number(gs.total_matches || 0),
      total_users: usersCountR.rows[0].c,
      total_teams_selected: teamsCountR.rows[0].c,
      total_players_in_game: 2613, // static — 6 leagues total
      active_24h: active24hR.rows[0].c,
      active_7d: active7dR.rows[0].c,
      signups_last_14d: signups,
      top_countries_by_logins: topCountriesLoginsR.rows.map(r => ({
        code: r.code, name: r.name || r.code, count: r.c,
      })),
      top_countries_by_users: topCountriesUsersR.rows.map(r => ({
        code: r.code, name: r.name || r.code, count: r.c,
      })),
      last_login: lastLoginR.rows[0].t || null,
      server_time: new Date().toISOString(),
    };

    statsCache = payload;
    statsCachedAt = now;
    res.json(payload);
  } catch (err) {
    console.error('admin/stats error:', err);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

module.exports = router;
// build: v2.93 admin-dashboard
