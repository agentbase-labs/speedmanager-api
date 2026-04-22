// ─── Global stats endpoints ────────────────────────────────────────────────
// /api/stats/goal    → POST (JWT) — increments global goal counter by 1
// /api/stats/global  → GET  (public) — returns {total_goals, updated_at}
//
// Rate limit: max 200 goals per minute per user (anti-forgery protection).
// Short in-memory cache (2s) on /global to protect DB from polling storms.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ── In-memory cache for /global ────────────────────────────────────────────
const CACHE_TTL_MS = 2 * 1000;
let cached = null;   // { total_goals, updated_at }
let cachedAt = 0;

// ── Per-user rate limiting (200 goals / 60s) ───────────────────────────────
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_GOALS = 200;
const rateBuckets = new Map();   // userId → [timestamps]

function checkRate(userId) {
  const now = Date.now();
  const arr = rateBuckets.get(userId) || [];
  // Drop timestamps older than window
  const fresh = arr.filter(ts => (now - ts) < RATE_WINDOW_MS);
  if (fresh.length >= RATE_MAX_GOALS) {
    rateBuckets.set(userId, fresh);
    return false;
  }
  fresh.push(now);
  rateBuckets.set(userId, fresh);
  return true;
}

// Opportunistic cleanup every ~5 min so the Map doesn't grow unbounded
setInterval(() => {
  const now = Date.now();
  for (const [k, arr] of rateBuckets) {
    const fresh = arr.filter(ts => (now - ts) < RATE_WINDOW_MS);
    if (fresh.length === 0) rateBuckets.delete(k);
    else rateBuckets.set(k, fresh);
  }
}, 5 * 60 * 1000).unref?.();

// POST /api/stats/goal — auth required, +1 to global counter
router.post('/goal', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    if (!checkRate(userId)) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    const result = await pool.query(
      `UPDATE smp_global_stats
         SET total_goals = total_goals + 1,
             updated_at  = NOW()
       WHERE id = 1
       RETURNING total_goals, updated_at`
    );

    // Row should always exist (seeded in initDb). If not, seed now.
    if (result.rows.length === 0) {
      const seed = await pool.query(
        `INSERT INTO smp_global_stats (id, total_goals) VALUES (1, 1)
         ON CONFLICT (id) DO UPDATE SET total_goals = smp_global_stats.total_goals + 1,
                                        updated_at = NOW()
         RETURNING total_goals, updated_at`
      );
      const row = seed.rows[0];
      cached = { total_goals: Number(row.total_goals), updated_at: row.updated_at };
      cachedAt = Date.now();
      return res.json({ total_goals: cached.total_goals });
    }

    const row = result.rows[0];
    cached = { total_goals: Number(row.total_goals), updated_at: row.updated_at };
    cachedAt = Date.now();
    res.json({ total_goals: cached.total_goals });
  } catch (err) {
    console.error('stats/goal error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/stats/global — public, cached 2s
router.get('/global', async (req, res) => {
  try {
    const now = Date.now();
    if (!cached || (now - cachedAt) > CACHE_TTL_MS) {
      const r = await pool.query(
        'SELECT total_goals, updated_at FROM smp_global_stats WHERE id = 1'
      );
      if (r.rows.length === 0) {
        cached = { total_goals: 0, updated_at: new Date().toISOString() };
      } else {
        cached = {
          total_goals: Number(r.rows[0].total_goals),
          updated_at: r.rows[0].updated_at,
        };
      }
      cachedAt = now;
    }
    res.set('Cache-Control', 'public, max-age=2');
    res.json(cached);
  } catch (err) {
    console.error('stats/global error:', err);
    res.status(200).json({ total_goals: 0, updated_at: new Date().toISOString(), error: 'stats_unavailable' });
  }
});

module.exports = router;