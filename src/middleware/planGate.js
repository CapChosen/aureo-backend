const supabase = require('../lib/supabase');

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function isPremiumPlan(plan) {
  return ['premium', 'pro', 'elite', 'family'].includes(plan);
}

// Attach plan + role to req.userProfile (call after requireAuth)
async function loadUserProfile(req, res, next) {
  if (req.userProfile) return next(); // already loaded

  const { data, error } = await supabase
    .from('users')
    .select('plan, role, ai_queries_used, ai_queries_reset_at, premium_expires_at')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(500).json({ error: 'Error al cargar perfil' });

  // Normalize legacy plan names
  const rawPlan = data.plan || 'free';
  const plan    = isPremiumPlan(rawPlan) ? 'premium' : 'free';
  const role    = data.role || 'user';

  // Check premium expiry
  const effectivePlan = (plan === 'premium' && data.premium_expires_at)
    ? (new Date(data.premium_expires_at) > new Date() ? 'premium' : 'free')
    : plan;

  req.userProfile = {
    plan: effectivePlan,
    role,
    isAdmin:   role === 'admin',
    isPremium: role === 'admin' || effectivePlan === 'premium',
    aiUsed:    data.ai_queries_used  || 0,
    aiResetAt: data.ai_queries_reset_at,
  };

  next();
}

// Gate middleware: require premium (or admin)
function requirePremium(req, res, next) {
  if (!req.userProfile) {
    return res.status(500).json({ error: 'loadUserProfile no ejecutado antes de requirePremium' });
  }
  if (req.userProfile.isPremium) return next();
  return res.status(403).json({
    error: 'Disponible en Plan Premium',
    code:  'PLAN_REQUIRED',
    plan:  req.userProfile.plan,
  });
}

// Check + decrement AI quota
// Free: 5/week (reset Monday)
// Premium: 100/month (reset 1st)
// Admin: unlimited
async function checkAILimit(req, res, next) {
  const profile = req.userProfile;
  if (!profile) return res.status(500).json({ error: 'loadUserProfile requerido' });

  // Admin: no limit
  if (profile.isAdmin) {
    req.aiCallsUsed  = 0;
    req.aiCallsLimit = 999999;
    return next();
  }

  const now = new Date();
  let resetDate, limit;

  if (profile.isPremium) {
    // Monthly reset: 1st of current month
    const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0');
    resetDate = `${y}-${m}-01`;
    limit = 100;
  } else {
    // Weekly reset: Monday
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    resetDate = monday.toISOString().split('T')[0];
    limit = 5;
  }

  // Reset counter if period rolled over
  const storedReset = profile.aiResetAt
    ? (typeof profile.aiResetAt === 'string' ? profile.aiResetAt : profile.aiResetAt.toISOString().split('T')[0])
    : null;

  let used = profile.aiUsed;
  if (storedReset !== resetDate) {
    await supabase.from('users')
      .update({ ai_queries_used: 0, ai_queries_reset_at: resetDate })
      .eq('id', req.user.id);
    used = 0;
  }

  if (used >= limit) {
    const period = profile.isPremium ? 'mensual' : 'semanal';
    return res.status(429).json({
      error: `Límite ${period} de Au·IA alcanzado.`,
      code: 'AI_LIMIT_REACHED',
      plan: profile.plan,
      limit,
      used,
      resets_on: resetDate,
    });
  }

  req.aiCallsUsed  = used;
  req.aiCallsLimit = limit;
  next();
}

// Increment AI usage counter after a successful call
async function incrementAIUsage(userId, currentUsed) {
  await supabase.from('users')
    .update({ ai_queries_used: currentUsed + 1 })
    .eq('id', userId);
}

module.exports = { loadUserProfile, requirePremium, checkAILimit, incrementAIUsage, isPremiumPlan };
