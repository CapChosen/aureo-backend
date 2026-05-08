/**
 * Áureo — Job nocturno de actualización de datos históricos
 * Cron: '0 5 * * *' (2AM Santiago / 5AM UTC)
 * Standalone: node jobs/nightlyDataRefresh.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const supabase     = require('../src/lib/supabase');
const FINNHUB_KEY  = process.env.FINNHUB_API_KEY;
const TD_KEY       = process.env.TWELVE_DATA_KEY;

// ── Cargar símbolos desde assets-database.js ─────────────
let ALL_SYMBOLS;
try {
  const db = require('../public/assets-database.js');
  ALL_SYMBOLS = Object.keys(db);
} catch {
  // assets-database.js sin module.exports — usar lista de market.js como fallback
  ALL_SYMBOLS = [
    'SPY','QQQ','VOO','VTI','IVV','VUG','VTV','VYM','SCHD','IWM',
    'GLD','TLT','AGG','LQD','HYG','VNQ','VEA','VWO','VXUS','EEM',
    'AAPL','MSFT','GOOGL','AMZN','NVDA','META','TSLA','BRK.B',
    'JPM','BAC','V','MA','JNJ','UNH','LLY','XOM','CVX','NEE',
    'BTC-USD','ETH-USD',
  ];
}

// SPY siempre primero para calcular beta de los demás
const SYMBOLS = ['SPY', ...ALL_SYMBOLS.filter(s => s !== 'SPY')];

// Mapeo para Finnhub (crypto usa símbolo de exchange)
const FINNHUB_MAP = { 'BTC-USD': 'BINANCE:BTCUSDT', 'ETH-USD': 'BINANCE:ETHUSDT' };
// Mapeo para Twelve Data (crypto usa formato BTC/USD)
const TD_MAP      = { 'BTC-USD': 'BTC/USD', 'ETH-USD': 'ETH/USD' };

// ── Estadísticas puras JS ────────────────────────────────
function logReturns(closes) {
  const r = [];
  for (let i = 1; i < closes.length; i++) r.push(Math.log(closes[i] / closes[i - 1]));
  return r;
}

function mean(arr)     { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function variance(arr) {
  const m = mean(arr);
  return arr.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, arr.length - 1);
}

function computeStats(closes) {
  if (closes.length < 13) return null;
  const returns = logReturns(closes);
  const mu      = mean(returns) * 12;
  const sigma   = Math.sqrt(variance(returns)) * Math.sqrt(12);
  const sharpe  = sigma > 1e-10 ? (mu - 0.05) / sigma : 0;

  let maxDD = 0, peak = closes[0];
  for (const c of closes) {
    if (c > peak) peak = c;
    const dd = (peak - c) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return { mu, sigma, sharpe, maxDD, returns };
}

function pearsonCorr(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 6) return null;
  const ra = a.slice(-n), rb = b.slice(-n);
  const ma = mean(ra), mb = mean(rb);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    num += (ra[i] - ma) * (rb[i] - mb);
    da  += (ra[i] - ma) ** 2;
    db  += (rb[i] - mb) ** 2;
  }
  const denom = Math.sqrt(da * db);
  return denom < 1e-12 ? 0 : parseFloat((num / denom).toFixed(4));
}

function betaVsSpy(assetReturns, spyReturns) {
  const n = Math.min(assetReturns.length, spyReturns.length);
  if (n < 6) return null;
  const ra = assetReturns.slice(-n), rs = spyReturns.slice(-n);
  const ma = mean(ra), ms = mean(rs);
  let cov = 0, varSpy = 0;
  for (let i = 0; i < n; i++) {
    cov    += (rs[i] - ms) * (ra[i] - ma);
    varSpy += (rs[i] - ms) ** 2;
  }
  return varSpy > 1e-12 ? parseFloat((cov / varSpy).toFixed(4)) : null;
}

// ── Fetch datos históricos mensuales ────────────────────
async function fetchFinnhub(symbol) {
  const to   = Math.floor(Date.now() / 1000);
  const from = to - 5 * 365 * 24 * 3600;
  const fSym = FINNHUB_MAP[symbol] || symbol;
  const url  = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(fSym)}&resolution=M&from=${from}&to=${to}&token=${FINNHUB_KEY}`;
  try {
    const res  = await fetch(url);
    const data = await res.json();
    if (data.s !== 'ok' || !data.c?.length) return null;
    // Combinar timestamps con closes para upsert en price_history
    return data.c.map((close, i) => ({
      date:  new Date(data.t[i] * 1000).toISOString().slice(0, 10),
      close: parseFloat(close),
    })).filter(r => r.close > 0);
  } catch { return null; }
}

async function fetchTwelveData(symbol) {
  if (!TD_KEY) return null;
  const tdSym = TD_MAP[symbol] || symbol;
  const url   = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(tdSym)}&interval=1month&outputsize=120&apikey=${TD_KEY}`;
  try {
    const res  = await fetch(url);
    const data = await res.json();
    if (data.status === 'error' || !data.values?.length) return null;
    return data.values
      .map(d => ({ date: d.datetime, close: parseFloat(d.close) }))
      .filter(r => r.close > 0)
      .sort((a, b) => a.date < b.date ? -1 : 1);
  } catch { return null; }
}

async function fetchMonthly(symbol) {
  const rows = (await fetchFinnhub(symbol)) || (await fetchTwelveData(symbol));
  return rows?.length >= 13 ? rows : null;
}

// ── Upsert helpers ───────────────────────────────────────
async function upsertPriceHistory(symbol, rows) {
  const records = rows.map(r => ({ symbol, date: r.date, close: r.close, volume: r.volume ?? 0 }));
  // Upsert en lotes de 500 para no superar límite Supabase
  for (let i = 0; i < records.length; i += 500) {
    const { error } = await supabase
      .from('asset_price_history')
      .upsert(records.slice(i, i + 500), { onConflict: 'symbol,date' });
    if (error) console.error(`[Nightly] price_history ${symbol}:`, error.message);
  }
}

async function upsertMetrics(symbol, stats, beta) {
  const { error } = await supabase
    .from('asset_metrics_cache')
    .upsert({
      symbol,
      annual_return: parseFloat(stats.mu.toFixed(4)),
      volatility:    parseFloat(stats.sigma.toFixed(4)),
      sharpe:        parseFloat(stats.sharpe.toFixed(4)),
      max_drawdown:  parseFloat(stats.maxDD.toFixed(4)),
      beta_vs_spy:   beta,
      last_updated:  new Date().toISOString(),
    }, { onConflict: 'symbol' });
  if (error) console.error(`[Nightly] metrics ${symbol}:`, error.message);
}

async function upsertCorrelation(symA, symB, corr) {
  // Siempre almacenar con orden lexicográfico para consultas consistentes
  const [a, b] = [symA, symB].sort();
  const { error } = await supabase
    .from('correlation_cache')
    .upsert({
      symbol_a:    a,
      symbol_b:    b,
      correlation: corr,
      last_updated: new Date().toISOString(),
    }, { onConflict: 'symbol_a,symbol_b' });
  if (error) console.error(`[Nightly] corr ${a}-${b}:`, error.message);
}

// ── Job principal ────────────────────────────────────────
let lastJobRun   = null;
let lastJobStats = null;

async function runNightlyRefresh() {
  const t0 = Date.now();
  console.log('');
  console.log('[Nightly] ════════════════════════════════════════');
  console.log(`[Nightly] Iniciando — ${new Date().toISOString()}`);
  console.log(`[Nightly] ${SYMBOLS.length} símbolos a procesar`);

  const historical = {}; // symbol → [{ date, close }]
  let ok = 0, fail = 0;

  const BATCH = 8, DELAY = 1200;

  for (let i = 0; i < SYMBOLS.length; i += BATCH) {
    const batch = SYMBOLS.slice(i, i + BATCH);

    await Promise.all(batch.map(async sym => {
      const rows = await fetchMonthly(sym);
      if (!rows) { fail++; return; }
      historical[sym] = rows;
      await upsertPriceHistory(sym, rows);
      ok++;
    }));

    if ((i / BATCH) % 2 === 1 || i + BATCH >= SYMBOLS.length) {
      console.log(`[Nightly] Progreso: ${Math.min(i + BATCH, SYMBOLS.length)}/${SYMBOLS.length} — OK: ${ok}, Err: ${fail}`);
    }
    if (i + BATCH < SYMBOLS.length) await new Promise(r => setTimeout(r, DELAY));
  }

  // ── Calcular métricas ──────────────────────────────────
  console.log('[Nightly] Calculando métricas y correlaciones...');
  const spyRows  = historical['SPY'];
  const spyStats = spyRows ? computeStats(spyRows.map(r => r.close)) : null;
  const done     = Object.keys(historical);

  for (const sym of done) {
    const closes = historical[sym].map(r => r.close);
    const stats  = computeStats(closes);
    if (!stats) continue;

    let beta = sym === 'SPY' ? 1.0 : null;
    if (spyStats && sym !== 'SPY') {
      beta = betaVsSpy(stats.returns, spyStats.returns);
    }
    await upsertMetrics(sym, stats, beta);
  }

  // ── Calcular correlaciones (todos los pares) ───────────
  let corrCount = 0;
  for (let i = 0; i < done.length; i++) {
    for (let j = i + 1; j < done.length; j++) {
      const ra = logReturns(historical[done[i]].map(r => r.close));
      const rb = logReturns(historical[done[j]].map(r => r.close));
      const corr = pearsonCorr(ra, rb);
      if (corr !== null) { await upsertCorrelation(done[i], done[j], corr); corrCount++; }
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  lastJobRun   = new Date().toISOString();
  lastJobStats = { ok, fail, corrCount, elapsed };

  console.log('[Nightly] ────────────────────────────────────────');
  console.log(`[Nightly] Completado en ${elapsed}s`);
  console.log(`[Nightly] Éxitos: ${ok} | Errores: ${fail} | Correlaciones: ${corrCount}`);
  console.log('[Nightly] ════════════════════════════════════════');
  console.log('');
}

module.exports = { runNightlyRefresh, getLastRun: () => ({ lastJobRun, lastJobStats }) };

// Standalone: node jobs/nightlyDataRefresh.js
if (require.main === module) {
  runNightlyRefresh().catch(err => { console.error('[Nightly] Fatal:', err); process.exit(1); });
}
