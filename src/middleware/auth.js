const { createClient } = require('@supabase/supabase-js');
const supabase = require('../lib/supabase');
const { loadUserProfile, checkAILimit: pgCheckAILimit, incrementAIUsage } = require('./planGate');

// Supabase client for token verification (anon key)
const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Verifies JWT and attaches req.user
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  req.user = user;
  next();
}

// requireAuth + loadUserProfile + AI quota check (used by ai.js routes)
async function checkAILimit(req, res, next) {
  // Load profile if not already present
  if (!req.userProfile) {
    return loadUserProfile(req, res, () => pgCheckAILimit(req, res, next));
  }
  return pgCheckAILimit(req, res, next);
}

module.exports = { requireAuth, checkAILimit, loadUserProfile, incrementAIUsage };
