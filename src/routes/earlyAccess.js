const express = require('express');
const supabase = require('../lib/supabase');

const router = express.Router();

const MAX_SLOTS        = 100;
const CAMPAIGN_END_DATE = process.env.CAMPAIGN_END_DATE || '2026-09-10'; // 3 months from deploy

// GET /api/early-access/status — slot count + campaign status (public)
router.get('/status', async (req, res) => {
  const now = new Date();
  const end = new Date(CAMPAIGN_END_DATE);
  const campaignActive = now < end;

  if (!campaignActive) {
    return res.json({ active: false, slots_remaining: 0, slots_taken: MAX_SLOTS, max_slots: MAX_SLOTS });
  }

  const { count, error } = await supabase
    .from('early_access')
    .select('id', { count: 'exact', head: true });

  if (error) return res.status(500).json({ error: 'Error al verificar cupos' });

  const taken     = count || 0;
  const remaining = Math.max(0, MAX_SLOTS - taken);

  res.json({
    active:          remaining > 0 && campaignActive,
    slots_remaining: remaining,
    slots_taken:     taken,
    max_slots:       MAX_SLOTS,
    ends_at:         CAMPAIGN_END_DATE,
  });
});

// POST /api/early-access — register for early access
router.post('/', async (req, res) => {
  const { email, name } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  const now = new Date();
  const end = new Date(CAMPAIGN_END_DATE);
  if (now >= end) {
    return res.status(410).json({ error: 'Registro anticipado cerrado', code: 'CAMPAIGN_ENDED' });
  }

  // Check slot count
  const { count: taken } = await supabase
    .from('early_access')
    .select('id', { count: 'exact', head: true });

  if ((taken || 0) >= MAX_SLOTS) {
    return res.status(410).json({ error: 'Cupos agotados', code: 'NO_SLOTS' });
  }

  // Check duplicate
  const { data: existing } = await supabase
    .from('early_access')
    .select('id, redeemed')
    .eq('email', email.toLowerCase())
    .single();

  if (existing) {
    return res.status(409).json({
      error: 'Este correo ya está registrado',
      code:  'ALREADY_REGISTERED',
      redeemed: existing.redeemed,
    });
  }

  const { error: insertError } = await supabase
    .from('early_access')
    .insert({ email: email.toLowerCase(), name: name?.trim() || null });

  if (insertError) return res.status(500).json({ error: 'Error al registrar' });

  // If there's already a Supabase user with this email, grant them premium
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();

  if (existingUser) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await supabase.from('users').update({
      plan: 'premium',
      premium_expires_at: expiresAt.toISOString(),
    }).eq('id', existingUser.id);

    await supabase.from('early_access')
      .update({ redeemed: true, redeemed_at: new Date().toISOString() })
      .eq('email', email.toLowerCase());
  }

  res.json({ success: true, redeemed: !!existingUser });
});

module.exports = router;
