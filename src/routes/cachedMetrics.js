/**
 * Áureo — Rutas de métricas desde caché Supabase
 * Target: <200ms (todo desde DB, sin llamadas externas)
 */
const express    = require('express');
const router     = express.Router();
const supabase   = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

// ── GET /api/metrics/:symbol ─────────────────────────────
// Consulta asset_metrics_cache. Si no existe, llama al job on-demand.
router.get('/metrics/:symbol', requireAuth, async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();

  const { data, error } = await supabase
    .from('asset_metrics_cache')
    .select('*')
    .eq('symbol', symbol)
    .single();

  if (!error && data) return res.json(data);

  // Fallback: calcular y guardar on-demand usando market.js fetchHistorical
  try {
    const marketRouter = require('./market');
    const hist = await marketRouter.fetchHistorical(symbol);
    if (!hist) return res.status(404).json({ error: `Sin datos para ${symbol}` });

    const record = {
      symbol,
      annual_return: hist.mu,
      volatility:    hist.sigma,
      sharpe:        hist.sigma > 1e-10 ? parseFloat(((hist.mu - 0.05) / hist.sigma).toFixed(4)) : 0,
      max_drawdown:  hist.max_drawdown,
      beta_vs_spy:   null,
      last_updated:  new Date().toISOString(),
    };
    await supabase.from('asset_metrics_cache').upsert(record, { onConflict: 'symbol' });
    return res.json(record);
  } catch (e) {
    console.error('[CachedMetrics] fallback error:', e.message);
    return res.status(503).json({
      error: 'Métricas no disponibles aún',
      hint: 'El job nocturno pre-calculará los datos. Vuelve a intentar más tarde.',
    });
  }
});

// ── GET /api/correlation?symbols=IVV,SPY,QQQ ────────────
// Devuelve matriz NxN desde correlation_cache. Target <200ms.
router.get('/correlation', requireAuth, async (req, res) => {
  const raw = (req.query.symbols || '').trim();
  if (!raw) return res.status(400).json({ error: 'Param ?symbols=A,B,... requerido' });

  const symbols = [...new Set(raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean))].slice(0, 15);
  if (symbols.length < 2) return res.status(400).json({ error: 'Se necesitan al menos 2 símbolos' });

  // Fetch todos los pares relevantes de la DB
  const { data: rows, error } = await supabase
    .from('correlation_cache')
    .select('symbol_a, symbol_b, correlation')
    .or(
      symbols.flatMap(a =>
        symbols.filter(b => b !== a).map(b => {
          const [sa, sb] = [a, b].sort();
          return `and(symbol_a.eq.${sa},symbol_b.eq.${sb})`;
        })
      ).join(',')
    );

  if (error) {
    console.error('[CachedMetrics] correlation query error:', error.message);
    return res.status(500).json({ error: 'Error al consultar correlaciones' });
  }

  // Construir lookup map
  const lookup = {};
  for (const row of rows || []) {
    lookup[`${row.symbol_a}|${row.symbol_b}`] = row.correlation;
  }

  // Construir matriz NxN
  const matrix = {};
  for (const a of symbols) {
    matrix[a] = {};
    for (const b of symbols) {
      if (a === b) { matrix[a][b] = 1; continue; }
      const [sa, sb] = [a, b].sort();
      const corr = lookup[`${sa}|${sb}`];
      matrix[a][b] = corr !== undefined ? corr : null;
    }
  }

  res.json({ symbols, matrix, source: 'cache', fetched_at: new Date().toISOString() });
});

// ── GET /api/portfolio/metrics ───────────────────────────
// Body: { assets: [{ symbol, weight }] }
// Calcula retorno, volatilidad y Sharpe del portafolio ponderado.
router.post('/portfolio/metrics', requireAuth, async (req, res) => {
  const assets = req.body?.assets;
  if (!Array.isArray(assets) || assets.length < 2) {
    return res.status(400).json({ error: 'Body: { assets: [{ symbol, weight }] } con ≥2 activos' });
  }

  const symbols = assets.map(a => a.symbol.toUpperCase());
  const weights = assets.map(a => parseFloat(a.weight) || 0);
  const wSum    = weights.reduce((a, b) => a + b, 0);
  const w       = weights.map(v => v / wSum); // normalizar a 1

  // Fetch métricas individuales
  const { data: metrics, error: mErr } = await supabase
    .from('asset_metrics_cache')
    .select('symbol, annual_return, volatility')
    .in('symbol', symbols);

  if (mErr || !metrics?.length) {
    return res.status(503).json({ error: 'Métricas no disponibles en caché. Ejecuta el job nocturno primero.' });
  }

  const metMap = {};
  for (const m of metrics) metMap[m.symbol] = m;

  // Retorno ponderado
  let portReturn = 0;
  for (let i = 0; i < symbols.length; i++) {
    const m = metMap[symbols[i]];
    if (m) portReturn += w[i] * (m.annual_return ?? 0);
  }

  // Fetch correlaciones para los pares
  const { data: corrRows } = await supabase
    .from('correlation_cache')
    .select('symbol_a, symbol_b, correlation')
    .or(
      symbols.flatMap((a, i) =>
        symbols.slice(i + 1).map(b => {
          const [sa, sb] = [a, b].sort();
          return `and(symbol_a.eq.${sa},symbol_b.eq.${sb})`;
        })
      ).join(',')
    );

  const corrLookup = {};
  for (const row of corrRows || []) {
    corrLookup[`${row.symbol_a}|${row.symbol_b}`] = row.correlation;
  }

  // Volatilidad del portafolio: σ_p² = Σ_i Σ_j w_i * w_j * σ_i * σ_j * ρ_ij
  let portVar = 0;
  for (let i = 0; i < symbols.length; i++) {
    const sigI = metMap[symbols[i]]?.volatility ?? 0;
    for (let j = 0; j < symbols.length; j++) {
      const sigJ = metMap[symbols[j]]?.volatility ?? 0;
      let rho = 1;
      if (i !== j) {
        const [sa, sb] = [symbols[i], symbols[j]].sort();
        rho = corrLookup[`${sa}|${sb}`] ?? 0;
      }
      portVar += w[i] * w[j] * sigI * sigJ * rho;
    }
  }
  const portVol    = Math.sqrt(Math.max(0, portVar));
  const portSharpe = portVol > 1e-10 ? (portReturn - 0.05) / portVol : 0;

  res.json({
    return:    parseFloat(portReturn.toFixed(4)),
    volatility: parseFloat(portVol.toFixed(4)),
    sharpe:    parseFloat(portSharpe.toFixed(4)),
    assets:    symbols.map((s, i) => ({
      symbol: s,
      weight: parseFloat(w[i].toFixed(4)),
      return: parseFloat((metMap[s]?.annual_return ?? 0).toFixed(4)),
      vol:    parseFloat((metMap[s]?.volatility ?? 0).toFixed(4)),
    })),
  });
});

module.exports = router;
