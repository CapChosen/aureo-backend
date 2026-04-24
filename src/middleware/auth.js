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
// Free/starter: 1 consulta por semana (reset lunes)
// Pro/Elite: ilimitado
async function checkAILimit(req, res, next) {
  const { data: userData, error } = await supabase
    .from('users')
    .select('plan, ai_calls_this_month, ai_calls_reset_date')
    .eq('id', req.user.id)
    .single();

  if (error) {
    return res.status(500).json({ error: 'Error al verificar límites' });
  }

  const plan = userData.plan || 'starter';

  // Pro y Elite no tienen límite
  if (plan === 'pro' || plan === 'elite' || plan === 'family') {
    req.userPlan = plan;
    req.aiCallsUsed = userData.ai_calls_this_month || 0;
    req.aiCallsLimit = 99999;
    return next();
  }

  // Free / Starter: 50 consultas por semana durante período de prueba (reset el lunes)
  const now = new Date();
  const day = now.getDay(); // 0=domingo, 1=lunes...
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const resetDate = monday.toISOString().split('T')[0];

  if (userData.ai_calls_reset_date !== resetDate) {
    await supabase
      .from('users')
      .update({ ai_calls_this_month: 0, ai_calls_reset_date: resetDate })
      .eq('id', req.user.id);
    userData.ai_calls_this_month = 0;
  }

  const limit = 50; // período de prueba — cambiar a 1 al comercializar

  if (userData.ai_calls_this_month >= limit) {
    return res.status(429).json({
      error: 'Límite semanal de Au·IA alcanzado. Actualiza a Pro para consultas ilimitadas.',
      plan,
      limit,
      used: userData.ai_calls_this_month,
      resets_on: resetDate
    });
  }

  req.userPlan = plan;
  req.aiCallsUsed = userData.ai_calls_this_month;
  req.aiCallsLimit = limit;
  next();
}

module.exports = { requireAuth, checkAILimit };
