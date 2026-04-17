const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/game/state - load saved game state
router.get('/state', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT state, updated_at FROM smp_game_states WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No saved game state found' });
    }

    res.json({
      state: result.rows[0].state,
      updatedAt: result.rows[0].updated_at
    });
  } catch (err) {
    console.error('Load game state error:', err);
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
