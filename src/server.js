const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const aiRoutes           = require('./routes/ai');
const portfolioRoutes    = require('./routes/portfolio');
const userRoutes         = require('./routes/user');
const marketRoutes       = require('./routes/market');
const newsRoutes         = require('./routes/news');
const communityRoutes    = require('./routes/community');
const brokerRoutes       = require('./routes/broker');
const cachedMetricsRoutes = require('./routes/cachedMetrics');
const earlyAccessRoutes  = require('./routes/earlyAccess');
const supabase           = require('./lib/supabase');

const cron               = require('node-cron');
const { runNightlyRefresh, getLastRun } = require('../jobs/nightlyDataRefresh');
const realtimePrices     = require('./services/realtimePrices');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_DEV = process.env.NODE_ENV !== 'production';

// ════════════════════════════════════════════════════════
// CORS
// - Production : solo aureo.cl
// - Development: incluye localhost para pruebas locales
// ════════════════════════════════════════════════════════
const PROD_ORIGINS = [
  'https://aureo.cl',
  'https://www.aureo.cl',
  'https://xn--ureo-0qa.cl',
  'http://xn--ureo-0qa.cl',
];
const DEV_ORIGINS = [
  ...PROD_ORIGINS,
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
];

app.use(cors({
  origin: IS_DEV ? DEV_ORIGINS : PROD_ORIGINS,
  credentials: true,
}));

app.use(express.json());

// ════════════════════════════════════════════════════════
// Logger de requests (solo en development)
// ════════════════════════════════════════════════════════
if (IS_DEV) {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      const color = res.statusCode >= 500 ? '\x1b[31m'
                  : res.statusCode >= 400 ? '\x1b[33m'
                  : '\x1b[32m';
      console.log(`  ${color}${res.statusCode}\x1b[0m ${req.method} ${req.path} \x1b[2m${ms}ms\x1b[0m`);
    });
    next();
  });
}

// ════════════════════════════════════════════════════════
// Archivos estáticos del frontend
// ════════════════════════════════════════════════════════
app.use(express.static(path.join(__dirname, '..', 'public')));

// ════════════════════════════════════════════════════════
// Health check
// ════════════════════════════════════════════════════════
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    app: 'Áureo Backend',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      ai: '/api/ai/*',
      portfolio: '/api/portfolio/*',
      user: '/api/user/*',
      market: '/api/market/*',
      news: '/api/news/*',
      community: '/api/community/*',
    },
  });
});

// ════════════════════════════════════════════════════════
// Rutas principales
// ════════════════════════════════════════════════════════
app.use('/api/ai', aiRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/user', userRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/broker',    brokerRoutes);
app.use('/api/early-access', earlyAccessRoutes);
app.use('/api',           cachedMetricsRoutes);

// ════════════════════════════════════════════════════════
// Cache status (sin auth — monitoreo operacional)
// ════════════════════════════════════════════════════════
app.get('/api/cache/status', async (_req, res) => {
  const supabase = require('./lib/supabase');
  const [{ count: symbolsCached }, { count: corrPairs }, { count: priceRows }] = await Promise.all([
    supabase.from('asset_metrics_cache').select('*', { count: 'exact', head: true }),
    supabase.from('correlation_cache').select('*', { count: 'exact', head: true }),
    supabase.from('asset_price_history').select('*', { count: 'exact', head: true }),
  ]);
  const { lastJobRun, lastJobStats } = getLastRun();
  res.json({
    symbols_cached:    symbolsCached ?? 0,
    correlation_pairs: corrPairs    ?? 0,
    price_history_rows: priceRows   ?? 0,
    last_job_run:      lastJobRun,
    last_job_stats:    lastJobStats,
    ws_connected:      realtimePrices.connected,
    td_key_set:        !!process.env.TWELVE_DATA_KEY,
  });
});

// ════════════════════════════════════════════════════════
// Trigger manual del job nocturno (sin auth — solo debug)
// POST /api/cache/run-job
// ════════════════════════════════════════════════════════
let _jobRunning = false;
app.post('/api/cache/run-job', (req, res) => {
  if (_jobRunning) {
    return res.json({ status: 'already_running', message: 'Job ya en ejecución. Verificar progreso en /api/cache/status' });
  }
  _jobRunning = true;
  const startedAt = new Date().toISOString();
  runNightlyRefresh()
    .then(() => { _jobRunning = false; })
    .catch(err => { console.error('[ManualJob] Error:', err.message); _jobRunning = false; });
  res.json({
    status:    'started',
    message:   'Job iniciado en background. Verificar progreso en /api/cache/status',
    started_at: startedAt,
    note:      process.env.TWELVE_DATA_KEY ? 'TWELVE_DATA_KEY detectada' : 'TWELVE_DATA_KEY no encontrada — job fallará',
  });
});

// ════════════════════════════════════════════════════════
// Fallback: servir dashboard para rutas no-API
// ════════════════════════════════════════════════════════
app.get('/',               (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));
app.get('/login',          (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'login.html')));
app.get('/dashboard',      (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html')));
app.get('/app',            (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html')));
app.get('/auth/callback',  (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'auth-callback.html')));

// ════════════════════════════════════════════════════════
// 404
// ════════════════════════════════════════════════════════
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    requested: req.path,
    method: req.method,
  });
});

// ════════════════════════════════════════════════════════
// Iniciar servidor
// ════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log('');
  console.log('  ✦ Áureo Backend');
  console.log(`  ✦ Ambiente   : ${IS_DEV ? 'development' : 'production'}`);
  console.log(`  ✦ Puerto     : ${PORT}`);
  if (IS_DEV) {
    console.log(`  ✦ Dashboard  : http://localhost:${PORT}`);
    console.log(`  ✦ Health     : http://localhost:${PORT}/health`);
    console.log(`  ✦ Market API : http://localhost:${PORT}/api/market/ticker`);
    console.log(`  ✦ Cache stat : http://localhost:${PORT}/api/cache/status`);
  }
  console.log('');

  // ── Servicio WebSocket de precios en tiempo real ──────
  realtimePrices.connect();

  // ── Job nocturno: 5 AM UTC (= 2 AM Santiago) ─────────
  cron.schedule('0 5 * * *', () => {
    console.log('[Cron] Ejecutando nightlyDataRefresh...');
    runNightlyRefresh().catch(err => console.error('[Cron] Error:', err.message));
  });

  // ── Job diario: revertir premium expirado a free (6 AM UTC) ──
  cron.schedule('0 6 * * *', async () => {
    const { error } = await supabase
      .from('users')
      .update({ plan: 'free', premium_expires_at: null })
      .lt('premium_expires_at', new Date().toISOString())
      .not('premium_expires_at', 'is', null);
    if (error) console.error('[Cron] Error revertiendo premium expirado:', error.message);
  });

  console.log('  ✦ Cron job   : nightly refresh activo (05:00 UTC)');
  console.log('');
});
