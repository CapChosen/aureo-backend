const express = require('express');
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ════════════════════════════════════════════════════════
// GET /api/broker/performance
// ════════════════════════════════════════════════════════
router.get('/performance', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('broker_performance')
      .select('id, broker_label, recorded_month, real_value, notes, created_at')
      .eq('user_id', req.user.id)
      .order('recorded_month', { ascending: true });

    if (error) throw error;
    res.json({ entries: data || [] });
  } catch (err) {
    console.error('[Broker] Error getting performance:', err.message);
    res.status(500).json({ error: 'Error al obtener rendimiento' });
  }
});

// ════════════════════════════════════════════════════════
// POST /api/broker/performance
// Body: { broker_label, recorded_month (YYYY-MM), real_value, notes? }
// ════════════════════════════════════════════════════════
router.post('/performance', requireAuth, async (req, res) => {
  const { broker_label, recorded_month, real_value, notes } = req.body;

  if (!recorded_month || !real_value)
    return res.status(400).json({ error: 'Mes y valor son obligatorios' });

  // Normalize to first day of month
  const monthDate = recorded_month.length === 7
    ? `${recorded_month}-01`
    : recorded_month;

  const value = parseFloat(real_value);
  if (isNaN(value) || value < 0)
    return res.status(400).json({ error: 'Valor inválido' });

  try {
    const { data, error } = await supabase
      .from('broker_performance')
      .upsert({
        user_id:        req.user.id,
        broker_label:   (broker_label || 'Mi Broker').trim().slice(0, 50),
        recorded_month: monthDate,
        real_value:     value,
        notes:          notes ? notes.trim().slice(0, 500) : null,
      }, { onConflict: 'user_id,broker_label,recorded_month' })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ entry: data });
  } catch (err) {
    console.error('[Broker] Error saving performance:', err.message);
    res.status(500).json({ error: 'Error al guardar rendimiento' });
  }
});

// ════════════════════════════════════════════════════════
// DELETE /api/broker/performance/:id
// ════════════════════════════════════════════════════════
router.delete('/performance/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('broker_performance')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ deleted: true });
  } catch (err) {
    console.error('[Broker] Error deleting entry:', err.message);
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

module.exports = router;
