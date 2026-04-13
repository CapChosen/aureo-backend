const express = require('express');
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/user/me
router.get('/me', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(500).json({ error: 'Error al obtener usuario' });
  res.json(data);
});

// GET /api/user/usage
router.get('/usage', requireAuth, async (req, res) => {
  const limits = { starter: 5, pro: 30, family: 9999 };

  const { data, error } = await supabase
    .from('users')
    .select('plan, ai_calls_this_month')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(500).json({ error: 'Error al obtener uso' });

  res.json({
    plan: data.plan,
    used: data.ai_calls_this_month,
    limit: limits[data.plan] || 5,
    remaining: Math.max(0, (limits[data.plan] || 5) - data.ai_calls_this_month)
  });
});

module.exports = router;