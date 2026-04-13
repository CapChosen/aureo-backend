const { createClient } = require('@supabase/supabase-js');

// Para verificar tokens usamos la anon key
const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const supabase = require('../lib/supabase');

// Verifica que el usuario está autenticado
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

// Verifica el límite de consultas IA según el plan
async function checkAILimit(req, res, next) {
  const limits = { starter: 5, pro: 30, family: 9999 };

  const { data: userData, error } = await supabase
    .from('users')
    .select('plan, ai_calls_this_month, ai_calls_reset_date')
    .eq('id', req.user.id)
    .single();

  if (error) {
    return res.status(500).json({ error: 'Error al verificar límites' });
  }

  // Resetear contador si es un mes nuevo
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  const resetDate = firstOfMonth.toISOString().split('T')[0];

  if (userData.ai_calls_reset_date !== resetDate) {
    await supabase
      .from('users')
      .update({
        ai_calls_this_month: 0,
        ai_calls_reset_date: resetDate
      })
      .eq('id', req.user.id);
    userData.ai_calls_this_month = 0;
  }

  const limit = limits[userData.plan] || 5;

  if (userData.ai_calls_this_month >= limit) {
    return res.status(429).json({
      error: 'Límite de consultas IA alcanzado para este mes',
      plan: userData.plan,
      limit,
      used: userData.ai_calls_this_month
    });
  }

  req.userPlan = userData.plan;
  req.aiCallsUsed = userData.ai_calls_this_month;
  next();
}

module.exports = { requireAuth, checkAILimit };
