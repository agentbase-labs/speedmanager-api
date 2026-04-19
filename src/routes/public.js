// ─── Public (unauthenticated) endpoints ────────────────────────────────────
// /api/public/stats         → { visits, users, teams }
// /api/public/track-visit   → POST (logs one visit row; frontend calls once per tab-session)
//
// Stats definitions:
//   - visits  = COUNT(*) FROM smp_visits   (incremented via /track-visit)
//   - users   = COUNT(*) FROM smp_users    (registered accounts)
//   - teams   = COUNT(*) FROM smp_game_states
//                 — i.e. number of saved careers. Each user has ONE
//                   row in smp_game_states (team selection lives inside
//                   the JSON `state`). If a user restarts and their row
//                   is replaced this still counts as 1; resets via
//                   DELETE /api/game/state reduce the count. This is the
//                   cleanest proxy we have for "user-created teams" given
//                   the current schema.
//
// Caching: in-memory 60s TTL to avoid hitting the DB on every page-load.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const crypto = require('crypto');
const { pool } = require('../db');

const router = express.Router();

// ── In-memory cache ────────────────────────────────────────────────────────
const CACHE_TTL_MS = 60 * 1000;
let cached = null;       // { visits, users, teams }
let cachedAt = 0;

async function computeStats() {
  const [visitsRes, usersRes, teamsRes] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS c FROM smp_visits'),
    pool.query('SELECT COUNT(*)::int AS c FROM smp_users'),
    pool.query('SELECT COUNT(*)::int AS c FROM smp_game_states'),
  ]);
  return {
    visits: visitsRes.rows[0].c,
    users: usersRes.rows[0].c,
    teams: teamsRes.rows[0].c,
  };
}

// GET /api/public/stats
router.get('/stats', async (req, res) => {
  try {
    const now = Date.now();
    if (!cached || (now - cachedAt) > CACHE_TTL_MS) {
      cached = await computeStats();
      cachedAt = now;
    }
    // Short client cache too — match server TTL
    res.set('Cache-Control', 'public, max-age=60');
    res.json(cached);
  } catch (err) {
    console.error('Public stats error:', err);
    // Fail soft so frontend popover shows zeros instead of breaking
    res.status(200).json({ visits: 0, users: 0, teams: 0, error: 'stats_unavailable' });
  }
});

// POST /api/public/track-visit
router.post('/track-visit', async (req, res) => {
  try {
    const ua = (req.headers['user-agent'] || '').slice(0, 500);
    // IP is salted-hashed; we never store raw IP.
    const rawIp =
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      '';
    const salt = process.env.JWT_SECRET || 'smp-visit-salt';
    const ipHash = rawIp
      ? crypto.createHash('sha256').update(salt + '|' + rawIp).digest('hex').slice(0, 32)
      : null;

    await pool.query(
      'INSERT INTO smp_visits (user_agent, ip_hash) VALUES ($1, $2)',
      [ua || null, ipHash]
    );

    // Invalidate cache so the next /stats call reflects the bump fairly soon.
    // (We still honor TTL — just drop the cached snapshot.)
    cached = null;
    cachedAt = 0;

    res.json({ ok: true });
  } catch (err) {
    console.error('track-visit error:', err);
    // Don't fail the frontend if analytics errors out.
    res.status(200).json({ ok: false });
  }
});

module.exports = router;
