const express = require('express');
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/portfolio
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('portfolios')
    .select('*, phases(*)')
    .eq('user_id', req.user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: 'Error al obtener portafolio' });
  }

  // Portafolio por defecto si no tiene ninguno
  if (!data) {
    return res.json({
      name: 'Mi Portafolio',
      initial_investment: 6000000,
      assets: [
        { ticker:'VOO', name:'Vanguard S&P 500', weight:22, cagr:11, vol:14 },
        { ticker:'VYM', name:'High Dividend Yield', weight:12, cagr:9.5, vol:12 },
        { ticker:'QQQ', name:'Nasdaq 100', weight:10, cagr:13, vol:18 },
        { ticker:'GLD', name:'Gold ETF', weight:7, cagr:6.5, vol:14 },
        { ticker:'CCJ', name:'Cameco', weight:6, cagr:18, vol:28 }
      ],
      phases: [
        { label:'Fase 1', year_from:0, year_to:10, monthly_amount:500000 }
      ]
    });
  }

  res.json(data);
});

// POST /api/portfolio
router.post('/', requireAuth, async (req, res) => {
  const { name, initial_investment, assets, phases } = req.body;

  if (!assets || !Array.isArray(assets)) {
    return res.status(400).json({ error: 'Assets inválidos' });
  }

  try {
    const { data: existing } = await supabase
      .from('portfolios')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    let portfolioId;

    if (existing) {
      const { data, error } = await supabase
        .from('portfolios')
        .update({
          name: name || 'Mi Portafolio',
          initial_investment: initial_investment || 6000000,
          assets,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      portfolioId = data.id;
    } else {
      const { data, error } = await supabase
        .from('portfolios')
        .insert({
          user_id: req.user.id,
          name: name || 'Mi Portafolio',
          initial_investment: initial_investment || 6000000,
          assets
        })
        .select()
        .single();

      if (error) throw error;
      portfolioId = data.id;
    }

    // Actualizar fases
    if (phases && Array.isArray(phases)) {
      await supabase.from('phases').delete().eq('portfolio_id', portfolioId);

      if (phases.length > 0) {
        await supabase.from('phases').insert(
          phases.map(p => ({
            portfolio_id: portfolioId,
            label: p.label || 'Fase',
            year_from: p.year_from || 0,
            year_to: p.year_to || 10,
            monthly_amount: p.monthly_amount || 500000
          }))
        );
      }
    }

    res.json({ message: 'Portafolio guardado', portfolio_id: portfolioId });

  } catch (error) {
    console.error('Error al guardar portafolio:', error);
    res.status(500).json({ error: 'Error al guardar portafolio' });
  }
});

module.exports = router;