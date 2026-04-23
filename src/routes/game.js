const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Helper: look up the shimshon_unlocked flag for this user. Tolerates the
// column being missing on older deploys (returns false instead of throwing).
async function getShimshonUnlocked(userId) {
  try {
    const r = await pool.query(
      'SELECT shimshon_unlocked FROM smp_users WHERE id = $1',
      [userId]
    );
    return !!(r.rows[0] && r.rows[0].shimshon_unlocked);
  } catch (err) {
    // Column may not exist yet on old deploy — treat as locked.
    console.warn('shimshon_unlocked lookup failed:', err.message);
    return false;
  }
}

// GET /api/game/state - load saved game state (+ shimshon unlock flag)
router.get('/state', authenticateToken, async (req, res) => {
  try {
    const [stateRes, shimshonUnlocked] = await Promise.all([
      pool.query(
        'SELECT state, updated_at FROM smp_game_states WHERE user_id = $1',
        [req.user.id]
      ),
      getShimshonUnlocked(req.user.id),
    ]);

    if (stateRes.rows.length === 0) {
      // No saved state yet — still return the unlock flag so the frontend
      // can honour it on a brand-new game.
      return res.status(404).json({
        error: 'No saved game state found',
        shimshon_unlocked: shimshonUnlocked,
      });
    }

    res.json({
      state: stateRes.rows[0].state,
      updatedAt: stateRes.rows[0].updated_at,
      shimshon_unlocked: shimshonUnlocked,
    });
  } catch (err) {
    console.error('Load game state error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/game/unlock-shimshon - flip the Shimshon easter-egg flag (one-time).
// Returns { unlocked: true } whether it was just flipped or was already set.
router.post('/unlock-shimshon', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      `UPDATE smp_users SET shimshon_unlocked = TRUE WHERE id = $1`,
      [req.user.id]
    );
    console.log(`[shimshon-unlock] user_id=${req.user.id}`);
    res.json({ unlocked: true });
  } catch (err) {
    console.error('Unlock Shimshon error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/game/state - save game state
router.post('/state', authenticateToken, async (req, res) => {
  try {
    const { state } = req.body;

    if (!state || typeof state !== 'object') {
      return res.status(400).json({ error: 'Valid state object is required' });
    }

    // Upsert game state (insert or update)
    const result = await pool.query(
      `INSERT INTO smp_game_states (user_id, state, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET state = $2, updated_at = NOW()
       RETURNING state, updated_at`,
      [req.user.id, JSON.stringify(state)]
    );

    res.json({
      success: true,
      updatedAt: result.rows[0].updated_at
    });
  } catch (err) {
    console.error('Save game state error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/game/state - reset game state
router.delete('/state', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM smp_game_states WHERE user_id = $1',
      [req.user.id]
    );

    res.json({ success: true, message: 'Game state reset successfully' });
  } catch (err) {
    console.error('Reset game state error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
