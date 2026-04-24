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
  const { data, error } = await supabase
    .from('users')
    .select('plan, ai_calls_this_month')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(500).json({ error: 'Error al obtener uso' });

  const plan = data.plan || 'starter';
  // Pro / Elite: ilimitado; Free/Starter: 50/semana (período de prueba)
  const limit = (plan === 'pro' || plan === 'elite' || plan === 'family') ? 99999 : 50;
  const used  = data.ai_calls_this_month || 0;

  res.json({
    plan,
    used,
    limit,
    remaining: limit >= 9999 ? 99999 : Math.max(0, limit - used),
  });
});

module.exports = router;