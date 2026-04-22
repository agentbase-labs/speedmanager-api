const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// v2.93 — GeoIP for per-login country tracking (admin dashboard)
let geoip = null;
try { geoip = require('geoip-lite'); } catch (e) { console.warn('geoip-lite not available:', e.message); }

// ISO-3166 Alpha-2 → English country name (short list, extend as needed)
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
function countryName(code) { return COUNTRY_NAMES[code] || code || null; }

// v2.94 — skip logging for Joni-internal traffic (curl, automated scripts, agent self-checks)
// Heuristic: any of these markers → this is Joni/bot traffic, not a real user.
function isJoniInternal(req) {
  try {
    // Explicit opt-out header (safest — Joni can set this in admin/dev tools)
    if (req.headers['x-joni-internal']) return true;
    const ua = String(req.headers['user-agent'] || '').toLowerCase();
    if (!ua) return true; // no UA at all = almost certainly a script
    // Common non-browser clients
    const botMarkers = ['curl/', 'wget/', 'node-fetch', 'axios/', 'python-requests', 'go-http-client', 'httpie', 'postman', 'insomnia'];
    for (const m of botMarkers) if (ua.includes(m)) return true;
    // Explicit "joni" mentions in UA
    if (ua.includes('joni')) return true;
    return false;
  } catch (e) {
    return false;
  }
}

async function logLoginEvent(userId, req) {
  try {
    // v2.94 — skip Joni/agent traffic so admin stats show real users only
    if (isJoniInternal(req)) return;

    const xff = req.headers['x-forwarded-for'];
    const ip = (xff ? String(xff).split(',')[0].trim() : null) || req.ip || req.socket?.remoteAddress || null;
    let code = null;
    if (geoip && ip) {
      const g = geoip.lookup(ip);
      if (g && g.country) code = g.country;
    }
    await pool.query(
      `INSERT INTO smp_login_events (user_id, ip_address, country_code, country_name) VALUES ($1, $2, $3, $4)`,
      [userId || null, ip, code, countryName(code)]
    );
  } catch (e) {
    // Non-critical; never break login on log failure
    console.warn('logLoginEvent failed:', e.message);
  }
}

const router = express.Router();
const SALT_ROUNDS = 10;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ error: 'Username must be between 3 and 50 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if username already exists
    const existing = await pool.query('SELECT id FROM smp_users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const result = await pool.query(
      'INSERT INTO smp_users (username, password_hash, email) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, passwordHash, email || null]
    );

    const user = result.rows[0];

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // v2.93 — log first login event for country stats
    logLoginEvent(user.id, req);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.created_at
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const result = await pool.query(
      'SELECT id, username, password_hash, email, created_at FROM smp_users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // v2.93 — log login event for country stats (fire and forget)
    logLoginEvent(user.id, req);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.created_at
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, created_at FROM smp_users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.created_at
    });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

// build: v2.93 admin-dashboard 1776850828
// build: v2.94 skip-joni-internal 1776853600
