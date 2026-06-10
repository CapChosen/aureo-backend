const express = require('express');
const supabase = require('../lib/supabase');
const { requireAuth, loadUserProfile } = require('../middleware/auth');
const { isPremiumPlan } = require('../middleware/planGate');

const router = express.Router();

// GET /api/user/me
router.get('/me', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, plan, role, ai_queries_used, ai_queries_reset_at, premium_expires_at, created_at')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(500).json({ error: 'Error al obtener usuario' });
  res.json(data);
});

// GET /api/user/usage — plan info + AI quota for the frontend
router.get('/usage', requireAuth, loadUserProfile, (req, res) => {
  const profile = req.userProfile;
  const plan     = profile.isPremium ? 'premium' : 'free';

  let limit, period;
  if (profile.isAdmin) {
    limit  = 999999;
    period = 'unlimited';
  } else if (profile.isPremium) {
    limit  = 100;
    period = 'monthly';
  } else {
    limit  = 5;
    period = 'weekly';
  }

  const used      = profile.aiUsed;
  const remaining = limit >= 999999 ? 999999 : Math.max(0, limit - used);

  res.json({
    plan,
    role:      profile.role,
    is_admin:  profile.isAdmin,
    used,
    limit,
    remaining,
    period,
    features: {
      stress_constructor: profile.isPremium,
      correlations:       profile.isPremium,
      community_groups:   profile.isPremium,
      ai_chat:            true,
    },
  });
});

module.exports = router;
