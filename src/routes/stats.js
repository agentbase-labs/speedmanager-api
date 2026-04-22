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

// v2.93.2 — GeoIP for tracking active users by country
let geoip = null;
try { geoip = require('geoip-lite'); } catch (e) { console.warn('geoip-lite not available:', e.message); }
const COUNTRY_NAMES = {
  US: 'United States', GB: 'United Kingdom', IL: 'Israel', DE: 'Germany',
  FR: 'France', ES: 'Spain', IT: 'Italy', BR: 'Brazil', AR: 'Argentina',
  MX: 'Mexico', CA: 'Canada', AU: 'Australia', JP: 'Japan', KR: 'South Korea',
  CN: 'China', IN: 'India', RU: 'Russia', TR: 'Turkey', EG: 'Egypt',
  ZA: 'South Africa', NG: 'Nigeria', SA: 'Saudi Arabia', AE: 'UAE',
  NL: 'Netherlands', BE: 'Belgium', CH: 'Switzerland', AT: 'Austria',
  SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', PL: 'Poland',
  PT: 'Portugal', GR: 'Greece', IE: 'Ireland', CZ: 'Czech Republic',
  HU: 'Hungary', RO: 'Romania', UA: 'Ukraine', TH: 'Thailand', VN: 'Vietnam',
  ID: 'Indonesia', MY: 'Malaysia', SG: 'Singapore', PH: 'Philippines',
  NZ: 'New Zealand', CL: 'Chile', CO: 'Colombia', PE: 'Peru', VE: 'Venezuela',
};
async function logActivity(userId, req) {
  try {
    const xff = req.headers['x-forwarded-for'];
    const ip = (xff ? String(xff).split(',')[0].trim() : null) || req.ip || req.socket?.remoteAddress || null;
    let code = null;
    if (geoip && ip) {
      const g = geoip.lookup(ip);
      if (g && g.country) code = g.country;
    }
    await pool.query(
      `INSERT INTO smp_login_events (user_id, ip_address, country_code, country_name) VALUES ($1, $2, $3, $4)`,
      [userId || null, ip, code, COUNTRY_NAMES[code] || code || null]
    );
  } catch (e) { console.warn('logActivity failed:', e.message); }
}

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

// v2.95 — helper: is this global goal number a milestone worth logging?
function isMilestone(n) {
  if (!Number.isFinite(n) || n <= 0) return false;
  if (n === 1500 || n === 2000 || n === 2500 || n === 3000 || n === 5000) return true;
  if (n > 5000 && n % 5000 === 0) return true;
  return false;
}

// POST /api/stats/goal — auth required, +1 to global counter.
// v2.95: also inserts a row into smp_goal_events with goal metadata
// (player, teams, minute, etc). Body is optional — missing fields store NULL
// so v3.05 clients (fire-and-forget, no body) keep working.
router.post('/goal', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user?.id;
    if (!userId) {
      client.release();
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    if (!checkRate(userId)) {
      client.release();
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    // Extract optional metadata from body (all nullable)
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const meta = {
      player_name:   body.player_name   != null ? String(body.player_name).slice(0, 120)   : null,
      player_id:     body.player_id     != null ? String(body.player_id).slice(0, 80)      : null,
      team_id:       body.team_id       != null ? String(body.team_id).slice(0, 80)        : null,
      team_name:     body.team_name     != null ? String(body.team_name).slice(0, 120)     : null,
      opponent_id:   body.opponent_id   != null ? String(body.opponent_id).slice(0, 80)    : null,
      opponent_name: body.opponent_name != null ? String(body.opponent_name).slice(0, 120) : null,
      minute:        Number.isFinite(Number(body.minute)) ? parseInt(body.minute, 10)      : null,
      is_home:       typeof body.is_home === 'boolean' ? body.is_home :
                     (body.is_home === 'true' ? true : body.is_home === 'false' ? false : null),
    };

    // GeoIP lookup on request IP (same pattern as logActivity)
    const xff = req.headers['x-forwarded-for'];
    const ip = (xff ? String(xff).split(',')[0].trim() : null) || req.ip || req.socket?.remoteAddress || null;
    let countryCode = null;
    try {
      if (geoip && ip) {
        const g = geoip.lookup(ip);
        if (g && g.country) countryCode = g.country;
      }
    } catch (_) { /* ignore geoip errors */ }

    // Atomic bump + event insert so global_goal_number === new total_goals
    await client.query('BEGIN');

    const bumpR = await client.query(
      `UPDATE smp_global_stats
         SET total_goals = total_goals + 1,
             updated_at  = NOW()
       WHERE id = 1
       RETURNING total_goals, updated_at`
    );
    let row;
    if (bumpR.rows.length === 0) {
      // Seed path (first goal ever, row somehow missing)
      const seedR = await client.query(
        `INSERT INTO smp_global_stats (id, total_goals) VALUES (1, 1)
         ON CONFLICT (id) DO UPDATE SET total_goals = smp_global_stats.total_goals + 1,
                                        updated_at = NOW()
         RETURNING total_goals, updated_at`
      );
      row = seedR.rows[0];
    } else {
      row = bumpR.rows[0];
    }

    const globalGoalNumber = Number(row.total_goals);

    // Fetch username (denormalized into the event row)
    let username = null;
    try {
      const uR = await client.query(`SELECT username FROM smp_users WHERE id = $1`, [userId]);
      if (uR.rows.length) username = uR.rows[0].username;
    } catch (_) { /* ignore */ }

    // Insert the goal event
    await client.query(
      `INSERT INTO smp_goal_events
        (global_goal_number, user_id, username,
         player_name, player_id, team_id, team_name,
         opponent_id, opponent_name, minute, is_home, country_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        globalGoalNumber, userId, username,
        meta.player_name, meta.player_id, meta.team_id, meta.team_name,
        meta.opponent_id, meta.opponent_name, meta.minute, meta.is_home, countryCode,
      ]
    );

    await client.query('COMMIT');

    const milestone = isMilestone(globalGoalNumber);
    if (milestone) {
      console.log(
        '[MILESTONE] Goal #' + globalGoalNumber +
        ' by ' + (username || 'user#' + userId) +
        ' (' + (meta.player_name || 'unknown player') + ', ' +
        (meta.team_name || 'unknown team') + ')'
      );
    }

    cached = { total_goals: globalGoalNumber, updated_at: row.updated_at };
    cachedAt = Date.now();

    res.json({
      total_goals: globalGoalNumber,
      global_goal_number: globalGoalNumber,
      milestone,
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('stats/goal error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
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

// v2.93 — POST /api/stats/match-end — auth required, +1 to total matches counter
// Rate limited via same bucket-style check (20/min/user).
const matchRateBuckets = new Map();
const MATCH_RATE_WINDOW_MS = 60 * 1000;
const MATCH_RATE_MAX = 20;
function checkMatchRate(userId) {
  const now = Date.now();
  const arr = matchRateBuckets.get(userId) || [];
  const fresh = arr.filter(ts => (now - ts) < MATCH_RATE_WINDOW_MS);
  if (fresh.length >= MATCH_RATE_MAX) {
    matchRateBuckets.set(userId, fresh);
    return false;
  }
  fresh.push(now);
  matchRateBuckets.set(userId, fresh);
  return true;
}

router.post('/match-end', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });
    if (!checkMatchRate(userId)) return res.status(429).json({ error: 'Rate limit exceeded' });

    const result = await pool.query(
      `UPDATE smp_global_stats
         SET total_matches = total_matches + 1,
             updated_at  = NOW()
       WHERE id = 1
       RETURNING total_matches`
    );
    const count = result.rows.length ? Number(result.rows[0].total_matches) : 0;

    // v2.93.2 — every match-end counts as activity (country + active metrics)
    logActivity(userId, req);

    res.json({ total_matches: count });
  } catch (err) {
    console.error('stats/match-end error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// v2.93.2 — POST /api/stats/heartbeat — auth required, records activity event
// Throttled to 1 event per 10 minutes per user (so app-open + polling don't flood).
const hbLastSeen = new Map(); // userId → last insert timestamp
const HB_THROTTLE_MS = 10 * 60 * 1000;
router.post('/heartbeat', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });
    const now = Date.now();
    const last = hbLastSeen.get(userId) || 0;
    if (now - last < HB_THROTTLE_MS) {
      return res.json({ ok: true, throttled: true });
    }
    hbLastSeen.set(userId, now);
    logActivity(userId, req);
    res.json({ ok: true });
  } catch (err) {
    console.error('stats/heartbeat error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Opportunistic cleanup for hbLastSeen
setInterval(() => {
  const now = Date.now();
  for (const [k, ts] of hbLastSeen) {
    if (now - ts > HB_THROTTLE_MS * 6) hbLastSeen.delete(k);
  }
}, 30 * 60 * 1000).unref?.();

module.exports = router;
// build: v2.93 admin-dashboard

// build: v2.93.2 heartbeat + activity-on-match-end 1776852662
// build: v2.95 goal-events-log 1776874633
