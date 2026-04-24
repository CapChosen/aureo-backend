const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

// ════════════════════════════════════════════════════════
// Símbolos que sigue Áureo (precios autenticados)
// ════════════════════════════════════════════════════════
const SYMBOLS = [
  'SPY','QQQ','VOO','VYM','BRK.B','MSFT','AAPL',
  'GOOGL','NVDA','AMZN','GLD','VNQ','VXUS','CCJ','JNJ'
];

// ════════════════════════════════════════════════════════
// Símbolos para el ticker público — EXPANDIDO a 30
// Cubre: Índices, Mag7, Sectores, Commodities, Internacional
// ════════════════════════════════════════════════════════
const TICKER_SYMBOLS = [
  // Índices & ETFs core
  'SPY', 'QQQ', 'VOO', 'IWM',
  // Magnificent 7
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
  // Semiconductores & Tech
  'AMD', 'AVGO', 'CRM',
  // Finanzas
  'JPM', 'V', 'BRK.B',
  // Salud
  'UNH', 'LLY',
  // Energía
  'XOM',
  // Commodities & Refugio
  'GLD', 'SLV', 'USO',
  // Renta fija
  'TLT', 'AGG',
  // Internacional
  'VXUS', 'EWZ',
  // Temáticos
  'ARKK', 'SOXX',
  // Consumo
  'COST'
];

// ════════════════════════════════════════════════════════
// Todos los símbolos que Áureo maneja (excluidos de TICKER_SYMBOLS)
// Se pre-cargan en background al arrancar el servidor
// ════════════════════════════════════════════════════════
const EXTENDED_SYMBOLS = [
  // ETFs amplios
  'IVV','VTI','ITOT','SCHB','VUG','IWF','VOOG','SCHG',
  'VTV','IWD','VOOV','SCHV','VYM','SCHD','DVY','VIG','DGRO','NOBL',
  'IJH','VO','IWR','IJR','VB',
  // ETFs sectoriales
  'VGT','XLK','FTEC','SMH','IGV','ARKW',
  'VHT','XLV','IYH','IBB','XBI','VFH','XLF','KRE',
  'VDE','XLE','XOP','IAU','GDX',
  'VCR','XLY','VDC','XLP','VIS','XLI','VNQ','XLRE','IYR',
  'VPU','XLU','VOX','XLC',
  // Renta fija
  'BND','IEF','SHY','LQD','HYG','TIP','MUB',
  // Internacional
  'IXUS','VEA','IEFA','EFA','VGK','EWG','EWU','EWJ','EWY',
  'VWO','IEMG','EEM','INDA','MCHI','FXI','EWT',
  // Temáticos
  'ICLN','TAN','LIT','DRIV','HACK','CLOU','FINX','BOTZ','WCLD','ESPO','HERO',
  // Stocks tech
  'INTC','QCOM','TSM','ASML','ORCL','ADBE','NOW','SNOW','PLTR','PANW','CRWD','NET','DDOG','ZS',
  // Consumo
  'WMT','TGT','HD','LOW','NKE','SBUX','MCD','KO','PEP','PG',
  // Salud
  'JNJ','PFE','ABBV','TMO','ABT','AMGN','GILD','MRNA',
  // Finanzas
  'BAC','WFC','C','GS','MS','BLK','SCHW','MA','PYPL','SQ',
  // Energía & industrial
  'CVX','COP','SLB','NEE','DUK','BA','LMT','CAT','DE','UPS','FDX',
  'NEM','FCX','CCJ','NTR','DIS','NFLX','SPOT','UBER','ABNB','SHOP','DASH',
  // Internacionales
  'SAP','NVO','RHHBY','NVS','UL','BP','SHEL','BABA','TCEHY','PDD','NIO','SONY',
  'LVMH','OR','NESN','VOW','BMW',
];

// Mapeo de símbolos propios → formato Finnhub
const QUOTE_SYMBOL_MAP = {
  'BTC-USD': 'BINANCE:BTCUSDT',
  'ETH-USD': 'BINANCE:ETHUSDT',
};

// Cache extendida (todos los activos extra)
let extendedCache = {};
let extendedTimestamp = 0;
let preloadRunning = false;

// Cache para datos de velas (chart)
const candleCache = {};
const CANDLE_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 horas

// Cache
let priceCache = {};
let tickerCache = [];
let lastFetch = 0;
let lastTickerFetch = 0;
const CACHE_TTL = 30 * 60 * 1000;
const TICKER_CACHE_TTL = 60 * 1000;

// ════════════════════════════════════════════════════════
// Función auxiliar para obtener precio de un símbolo
// ════════════════════════════════════════════════════════
async function fetchPrice(symbol) {
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error(`[Finnhub] HTTP ${response.status} for ${symbol}:`, JSON.stringify(data));
      return null;
    }

    if (data.error) {
      console.error(`[Finnhub] API error for ${symbol}:`, data.error);
      return null;
    }

    if (data.c && data.c > 0) {
      return {
        symbol,
        price: parseFloat(data.c.toFixed(2)),
        change: parseFloat(data.d?.toFixed(2) || 0),
        change_pct: parseFloat(data.dp?.toFixed(2) || 0),
        high: parseFloat(data.h?.toFixed(2) || 0),
        low: parseFloat(data.l?.toFixed(2) || 0),
        prev_close: parseFloat(data.pc?.toFixed(2) || 0)
      };
    }

    // c=0 typically means outside market hours or symbol not found
    if (data.pc && data.pc > 0) {
      // Use previous close as price when market is closed
      return {
        symbol,
        price: parseFloat(data.pc.toFixed(2)),
        change: 0,
        change_pct: 0,
        high: parseFloat(data.h?.toFixed(2) || 0),
        low: parseFloat(data.l?.toFixed(2) || 0),
        prev_close: parseFloat(data.pc.toFixed(2))
      };
    }

    console.warn(`[Finnhub] No price data for ${symbol}: c=${data.c} pc=${data.pc}`);
    return null;
  } catch (error) {
    console.error(`[Finnhub] Network error for ${symbol}:`, error.message);
    return null;
  }
}

// ════════════════════════════════════════════════════════
// Fetch en batches para respetar rate limit de Finnhub
// Finnhub free: 60 calls/min → batches de 10 con 1s delay
// ════════════════════════════════════════════════════════
async function fetchPricesBatched(symbols, batchSize = 10, delayMs = 1100) {
  const results = [];
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(s => fetchPrice(s)));
    results.push(...batchResults);
    // Delay entre batches (excepto el último)
    if (i + batchSize < symbols.length) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return results.filter(r => r !== null);
}

// ════════════════════════════════════════════════════════
// GET /api/market/ticker - Precios para el ticker PÚBLICO
// ════════════════════════════════════════════════════════
router.get('/ticker', async (req, res) => {
  const now = Date.now();

  if (now - lastTickerFetch < TICKER_CACHE_TTL && tickerCache.length > 0) {
    return res.json({
      prices: tickerCache,
      cached: true,
      count: tickerCache.length,
      next_update_seconds: Math.ceil((TICKER_CACHE_TTL - (now - lastTickerFetch)) / 1000)
    });
  }

  try {
    const prices = await fetchPricesBatched(TICKER_SYMBOLS);

    if (prices.length === 0) {
      if (tickerCache.length > 0) {
        return res.json({ prices: tickerCache, cached: true, error: 'API sin datos, usando cache' });
      }
      return res.status(500).json({ error: 'No se pudieron obtener precios' });
    }

    tickerCache = prices;
    lastTickerFetch = now;

    console.log(`[TICKER] ${prices.length}/${TICKER_SYMBOLS.length} símbolos actualizados`);

    res.json({
      prices,
      cached: false,
      count: prices.length,
      fetched_at: new Date().toISOString(),
      next_update_seconds: Math.ceil(TICKER_CACHE_TTL / 1000)
    });

  } catch (error) {
    console.error('Error en ticker:', error);
    if (tickerCache.length > 0) {
      return res.json({ prices: tickerCache, cached: true, error: 'Usando cache por error de API' });
    }
    res.status(500).json({ error: 'Error al obtener precios del ticker' });
  }
});

// ════════════════════════════════════════════════════════
// GET /api/market/prices - Todos los precios (requiere auth)
// ════════════════════════════════════════════════════════
router.get('/prices', requireAuth, async (req, res) => {
  const now = Date.now();

  if (now - lastFetch < CACHE_TTL && Object.keys(priceCache).length > 0) {
    return res.json({
      prices: priceCache,
      cached: true,
      next_update: new Date(lastFetch + CACHE_TTL).toISOString()
    });
  }

  try {
    const results = await fetchPricesBatched(SYMBOLS);
    const prices = {};
    for (const r of results) {
      prices[r.symbol] = r;
    }

    priceCache = prices;
    lastFetch = now;

    res.json({
      prices,
      cached: false,
      fetched_at: new Date().toISOString(),
      next_update: new Date(now + CACHE_TTL).toISOString()
    });

  } catch(error) {
    console.error('Error precios mercado:', error);
    if (Object.keys(priceCache).length > 0) {
      return res.json({ prices: priceCache, cached: true, error: 'API error, usando cache' });
    }
    res.status(500).json({ error: 'Error al obtener precios' });
  }
});

// ════════════════════════════════════════════════════════
// GET /api/market/price/:symbol - Precio de un símbolo específico
// ════════════════════════════════════════════════════════
router.get('/price/:symbol', requireAuth, async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();

  if (priceCache[symbol] && Date.now() - lastFetch < CACHE_TTL) {
    return res.json(priceCache[symbol]);
  }

  try {
    const price = await fetchPrice(symbol);

    if (!price) {
      return res.status(404).json({ error: `Símbolo ${symbol} no encontrado o sin datos` });
    }

    priceCache[symbol] = price;
    res.json(price);

  } catch(error) {
    console.error(`Error obteniendo precio de ${symbol}:`, error);
    res.status(500).json({ error: 'Error al obtener precio' });
  }
});

// ════════════════════════════════════════════════════════
// POST /api/market/batch - Precios de múltiples símbolos
// ════════════════════════════════════════════════════════
router.post('/batch', requireAuth, async (req, res) => {
  try {
    const { symbols } = req.body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ error: 'Debe enviar un array de símbolos' });
    }

    if (symbols.length > 20) {
      return res.status(400).json({ error: 'Máximo 20 símbolos por request' });
    }

    const results = await fetchPricesBatched(symbols.map(s => s.toUpperCase()));
    const prices = {};
    for (const r of results) {
      prices[r.symbol] = r;
    }

    res.json({ prices, count: Object.keys(prices).length });

  } catch (error) {
    console.error('Error en batch prices:', error);
    res.status(500).json({ error: 'Error al obtener precios en lote' });
  }
});

// ════════════════════════════════════════════════════════
// GET /api/market/search/:query - Buscar símbolos
// ════════════════════════════════════════════════════════
router.get('/search/:query', requireAuth, async (req, res) => {
  try {
    const { query } = req.params;

    if (!query || query.length < 1) {
      return res.status(400).json({ error: 'Query muy corto' });
    }

    const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.result && data.result.length > 0) {
      const results = data.result
        .filter(item =>
          item.type === 'Common Stock' ||
          item.type === 'ETP' ||
          item.type === 'ETF'
        )
        .slice(0, 20)
        .map(item => ({
          symbol: item.symbol,
          description: item.description,
          type: item.type,
          displaySymbol: item.displaySymbol
        }));

      res.json({ results, count: results.length });
    } else {
      res.json({ results: [], count: 0 });
    }

  } catch (error) {
    console.error(`Error buscando ${req.params.query}:`, error);
    res.status(500).json({ error: 'Error al buscar símbolos' });
  }
});

// ════════════════════════════════════════════════════════
// GET /api/market/company/:symbol - Info de la empresa
// ════════════════════════════════════════════════════════
router.get('/company/:symbol', requireAuth, async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();

    const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.ticker) {
      res.json({
        symbol: data.ticker,
        name: data.name,
        industry: data.finnhubIndustry,
        marketCap: data.marketCapitalization,
        country: data.country,
        currency: data.currency,
        exchange: data.exchange,
        logo: data.logo,
        webUrl: data.weburl
      });
    } else {
      res.status(404).json({ error: `No se encontró información para ${symbol}` });
    }

  } catch (error) {
    console.error(`Error obteniendo info de ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Error al obtener información de la empresa' });
  }
});

// ════════════════════════════════════════════════════════
// DATOS HISTÓRICOS — cache, cálculos y correlaciones
// ════════════════════════════════════════════════════════
const historicalCache = {};
const HIST_CACHE_TTL  = 24 * 60 * 60 * 1000; // 24 horas

// Correlación de Pearson entre dos arrays del mismo largo
function pearsonCorr(a, b) {
  const n = a.length;
  if (n < 6) return null;
  const ma = a.reduce((s,v)=>s+v,0)/n;
  const mb = b.reduce((s,v)=>s+v,0)/n;
  let num=0, da=0, db=0;
  for (let i=0;i<n;i++) {
    num += (a[i]-ma)*(b[i]-mb);
    da  += (a[i]-ma)**2;
    db  += (b[i]-mb)**2;
  }
  const denom = Math.sqrt(da*db);
  return denom < 1e-12 ? 0 : parseFloat((num/denom).toFixed(4));
}

// Obtiene datos históricos mensuales usando Yahoo Finance (5 años, gratis, sin key)
// Reemplaza el endpoint Finnhub /stock/candle que requiere plan pago.
async function fetchHistorical(symbol) {
  const cached = historicalCache[symbol];
  if (cached && (Date.now() - cached.timestamp) < HIST_CACHE_TTL) {
    return cached.data;
  }

  const yahooSym = toYahooSymbol(symbol); // BRK.B → BRK-B, etc.
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1mo&range=5y`;

  let response;
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AureoBot/1.0)',
        'Accept': 'application/json',
      }
    });
  } catch (err) {
    console.error(`[Hist] Network error ${symbol}:`, err.message);
    return null;
  }

  if (!response.ok) {
    console.warn(`[Hist] Yahoo HTTP ${response.status} for ${symbol}`);
    return null;
  }

  const body = await response.json();
  const chart = body?.chart?.result?.[0];

  if (!chart || !chart.timestamp || !chart.indicators?.quote?.[0]?.close) {
    console.log(`[Hist] Sin datos Yahoo para ${symbol}`);
    return null;
  }

  const rawCloses = chart.indicators.quote[0].close;
  const rawTimestamps = chart.timestamp;

  // Filtrar nulos (fines de semana, feriados sin precio)
  const valid = rawTimestamps.reduce((acc, ts, i) => {
    if (rawCloses[i] != null) { acc.ts.push(ts); acc.c.push(rawCloses[i]); }
    return acc;
  }, { ts: [], c: [] });

  const N = valid.c.length;
  if (N < 12) {
    console.log(`[Hist] Datos insuficientes para ${symbol}: ${N} puntos`);
    return null;
  }

  // Retornos logarítmicos mensuales
  const returns = [];
  const returnsByMonth = {};
  for (let i = 1; i < N; i++) {
    const r = Math.log(valid.c[i] / valid.c[i - 1]);
    returns.push(r);
    const d   = new Date(valid.ts[i] * 1000);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    returnsByMonth[key] = r;
  }

  if (returns.length < 6) return null;

  const mean     = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, returns.length - 1);

  const mu        = parseFloat((mean * 12).toFixed(4));
  const sigma     = parseFloat((Math.sqrt(variance) * Math.sqrt(12)).toFixed(4));
  const return_5y = parseFloat(((valid.c[N - 1] / valid.c[0]) - 1).toFixed(4));

  let maxDD = 0, peak = valid.c[0];
  for (const c of valid.c) {
    if (c > peak) peak = c;
    const dd = (peak - c) / peak;
    if (dd > maxDD) maxDD = dd;
  }

  const result = {
    symbol, mu, sigma, return_5y,
    max_drawdown : parseFloat(maxDD.toFixed(4)),
    data_points  : N,
    period       : `${new Date(valid.ts[0] * 1000).toISOString().slice(0, 7)} – ${new Date(valid.ts[N - 1] * 1000).toISOString().slice(0, 7)}`,
    returnsByMonth,
  };

  historicalCache[symbol] = { data: result, timestamp: Date.now() };
  console.log(`[Hist] ${symbol}: μ=${mu.toFixed(3)} σ=${sigma.toFixed(3)} 5y=${(return_5y * 100).toFixed(1)}% pts=${N}`);
  return result;
}

// ════════════════════════════════════════════════════════
// GET /api/market/historical/batch?symbols=SPY,QQQ,GLD
// DEBE ir ANTES de /historical/:symbol para que Express
// no confunda "batch" como un parámetro de ruta
// ════════════════════════════════════════════════════════
router.get('/historical/batch', requireAuth, async (req, res) => {
  const raw     = (req.query.symbols || '').trim();
  const symbols = [...new Set(
    raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
  )].slice(0, 12); // Máximo 12 para no saturar rate limit

  if (symbols.length === 0) {
    return res.status(400).json({ error: 'Param ?symbols=SYM1,SYM2 requerido' });
  }

  const results = {};
  // Yahoo Finance no tiene rate-limit documentado → paralelo puro
  const batchData = await Promise.all(symbols.map(s => fetchHistorical(s)));
  symbols.forEach((s, idx) => {
    const d = batchData[idx];
    if (d) {
      results[s] = {
        mu          : d.mu,
        sigma       : d.sigma,
        return_5y   : d.return_5y,
        max_drawdown: d.max_drawdown,
        data_points : d.data_points,
        period      : d.period,
      };
    }
  });

  // Correlaciones para todos los pares con datos disponibles
  const correlations = {};
  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      const ha = historicalCache[symbols[i]]?.data;
      const hb = historicalCache[symbols[j]]?.data;
      if (!ha?.returnsByMonth || !hb?.returnsByMonth) continue;

      const keysA  = Object.keys(ha.returnsByMonth);
      const setB   = new Set(Object.keys(hb.returnsByMonth));
      const common = keysA.filter(k => setB.has(k)).sort();

      if (common.length < 6) continue;

      const ra   = common.map(k => ha.returnsByMonth[k]);
      const rb   = common.map(k => hb.returnsByMonth[k]);
      const corr = pearsonCorr(ra, rb);
      if (corr !== null) {
        correlations[`${symbols[i]}-${symbols[j]}`] = corr;
      }
    }
  }

  res.json({
    results,
    correlations,
    symbols_requested: symbols.length,
    symbols_found    : Object.keys(results).length,
    fetched_at       : new Date().toISOString()
  });
});

// ════════════════════════════════════════════════════════
// GET /api/market/historical/:symbol
// ════════════════════════════════════════════════════════
router.get('/historical/:symbol', requireAuth, async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const hist = await fetchHistorical(symbol);
    if (!hist) {
      return res.status(404).json({ error: `Sin datos históricos para ${symbol}` });
    }
    const { returnsByMonth: _, ...pub } = hist; // no exponer arrays internos
    res.json(pub);
  } catch (err) {
    console.error(`[Hist] Error ${symbol}:`, err);
    res.status(500).json({ error: 'Error al obtener datos históricos' });
  }
});

// ════════════════════════════════════════════════════════
// GET /api/market/correlations?symbols=SPY,QQQ,GLD
// Dedicated endpoint for the Correlaciones view.
// Returns: full NxN matrix, beta vs SPY, market regime.
// ════════════════════════════════════════════════════════
router.get('/correlations', requireAuth, async (req, res) => {
  const raw     = (req.query.symbols || '').trim();
  const symbols = [...new Set(
    raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
  )].slice(0, 10);

  if (symbols.length < 2) {
    return res.status(400).json({ error: 'Se necesitan al menos 2 símbolos (?symbols=A,B,...)' });
  }

  // Always include SPY for beta/regime calculation
  const allSyms = symbols.includes('SPY') ? symbols : ['SPY', ...symbols];

  const results = {};
  // Yahoo Finance: paralelo puro, sin delays
  const fetched = await Promise.all(allSyms.map(s => fetchHistorical(s)));
  allSyms.forEach((s, i) => { if (fetched[i]) results[s] = fetched[i]; });

  // Full NxN correlation matrix (only for the requested symbols)
  const matrix = {};
  for (const a of symbols) {
    matrix[a] = {};
    for (const b of symbols) {
      if (a === b) { matrix[a][b] = 1; continue; }
      const ha = results[a], hb = results[b];
      if (!ha?.returnsByMonth || !hb?.returnsByMonth) { matrix[a][b] = null; continue; }
      const common = Object.keys(ha.returnsByMonth).filter(k => hb.returnsByMonth[k] !== undefined).sort();
      if (common.length < 6) { matrix[a][b] = null; continue; }
      matrix[a][b] = pearsonCorr(common.map(k => ha.returnsByMonth[k]), common.map(k => hb.returnsByMonth[k]));
    }
  }

  // Beta vs SPY for each requested symbol
  const spyData = results['SPY'];
  const betas = {};
  for (const sym of symbols) {
    const h = results[sym];
    if (!h?.returnsByMonth || !spyData?.returnsByMonth) { betas[sym] = null; continue; }
    const common = Object.keys(h.returnsByMonth).filter(k => spyData.returnsByMonth[k] !== undefined).sort();
    if (common.length < 12) { betas[sym] = null; continue; }
    const rs  = common.map(k => h.returnsByMonth[k]);
    const rsp = common.map(k => spyData.returnsByMonth[k]);
    const n   = rs.length;
    const msp = rsp.reduce((a,b) => a+b, 0) / n;
    const ms  = rs.reduce((a,b) => a+b, 0) / n;
    let cov = 0, varSpy = 0;
    for (let i = 0; i < n; i++) {
      cov    += (rsp[i] - msp) * (rs[i] - ms);
      varSpy += (rsp[i] - msp) ** 2;
    }
    betas[sym] = varSpy > 1e-12 ? parseFloat((cov / varSpy).toFixed(3)) : null;
  }

  // Market regime from SPY recent returns (last 6 months)
  let regime = 'desconocido';
  if (spyData?.returnsByMonth) {
    const recentKeys = Object.keys(spyData.returnsByMonth).sort().slice(-6);
    const recentAvg  = recentKeys.reduce((s, k) => s + spyData.returnsByMonth[k], 0) / recentKeys.length;
    regime = recentAvg > 0.005 ? 'alcista' : recentAvg < -0.005 ? 'bajista' : 'lateral';
  }

  // Stats for each requested symbol
  const stats = {};
  for (const sym of symbols) {
    const h = results[sym];
    if (!h) continue;
    stats[sym] = { mu: h.mu, sigma: h.sigma, return_5y: h.return_5y, max_drawdown: h.max_drawdown };
  }

  res.json({
    symbols,
    matrix,
    betas,
    stats,
    regime,
    spy_included: !!spyData,
    fetched_at: new Date().toISOString(),
  });
});

// ════════════════════════════════════════════════════════
// BACKGROUND PRICE PRELOADER
// Fetches all extended symbols sequentially (1 per 2s = 30/min)
// so we stay under the 60/min Finnhub free-plan limit while
// the ticker batch may also be running.
// ════════════════════════════════════════════════════════
async function fetchPriceSimple(symbol) {
  const finnhubSym = QUOTE_SYMBOL_MAP[symbol] || symbol;
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(finnhubSym)}&token=${FINNHUB_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok || data.error) return null;
    if (data.c && data.c > 0) {
      return { symbol, price: parseFloat(data.c.toFixed(2)), change_pct: parseFloat(data.dp?.toFixed(2) || 0) };
    }
    if (data.pc && data.pc > 0) {
      return { symbol, price: parseFloat(data.pc.toFixed(2)), change_pct: 0 };
    }
    return null;
  } catch { return null; }
}

async function startBackgroundPreload() {
  if (preloadRunning) return;
  preloadRunning = true;
  const symbols = [...EXTENDED_SYMBOLS, 'BTC-USD', 'ETH-USD'];
  console.log(`[Market] Background preload started — ${symbols.length} symbols @ 1 per 2s`);
  let loaded = 0;
  for (const sym of symbols) {
    const p = await fetchPriceSimple(sym);
    if (p) { extendedCache[sym] = p; loaded++; }
    await new Promise(r => setTimeout(r, 2000));
  }
  extendedTimestamp = Date.now();
  preloadRunning = false;
  console.log(`[Market] Preload done: ${loaded}/${symbols.length} prices cached`);
}

// Run immediately on module load, then every 15 minutes
startBackgroundPreload();
setInterval(startBackgroundPreload, 15 * 60 * 1000).unref();

// ════════════════════════════════════════════════════════
// GET /api/market/allprices
// Returns merged prices from ticker + extended cache.
// No auth — used by the public asset explorer.
// ════════════════════════════════════════════════════════
router.get('/allprices', (_req, res) => {
  const all = {};
  // Ticker symbols first (freshest)
  for (const p of tickerCache) {
    all[p.symbol] = { price: p.price, change_pct: p.change_pct };
  }
  // Extended symbols fill in the rest
  for (const [sym, p] of Object.entries(extendedCache)) {
    if (!all[sym]) all[sym] = { price: p.price, change_pct: p.change_pct };
  }
  res.json({
    prices: all,
    count: Object.keys(all).length,
    preload_complete: !preloadRunning,
  });
});

// ════════════════════════════════════════════════════════
// GET /api/market/candle/:symbol?tf=D
// Uses Yahoo Finance — free, no key, supports all symbols
// including crypto (BTC-USD, ETH-USD) natively.
// Finnhub /stock/candle requires a paid plan, so we avoid it.
// tf: 1H (1h candles, 5 days), D (daily, 1 year),
//     M (monthly, 5 years), Y (monthly, max)
// ════════════════════════════════════════════════════════

// Some symbols differ between our DB and Yahoo Finance
const YAHOO_SYMBOL_MAP = {
  'BRK.B': 'BRK-B',
};

function toYahooSymbol(sym) {
  return YAHOO_SYMBOL_MAP[sym] || sym;
}

router.get('/candle/:symbol', async (req, res) => {
  const raw      = req.params.symbol.toUpperCase();
  const tf       = req.query.tf || 'D';
  const cacheKey = `${raw}:${tf}`;

  const cached = candleCache[cacheKey];
  if (cached && (Date.now() - cached.ts) < CANDLE_CACHE_TTL) {
    return res.json({ ...cached.data, cached: true });
  }

  // Map tf → Yahoo Finance interval + range
  let interval, range;
  switch (tf) {
    case '1H': interval = '1h';  range = '5d';  break; // 5 days, hourly candles
    case 'M':  interval = '1mo'; range = '5y';  break; // 5 years, monthly candles
    case 'Y':  interval = '1mo'; range = 'max'; break; // max history, monthly candles
    default:   interval = '1d';  range = '1y';  break; // 1 year, daily candles
  }

  const yahooSym = toYahooSymbol(raw);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=${interval}&range=${range}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AureoBot/1.0)',
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      console.warn(`[Candle] Yahoo HTTP ${response.status} for ${raw}`);
      return res.status(404).json({ error: `Sin datos para ${raw}` });
    }

    const body = await response.json();
    const result = body?.chart?.result?.[0];

    if (!result || !result.timestamp || !result.indicators?.quote?.[0]?.close) {
      console.warn(`[Candle] Yahoo: no data for ${raw} tf=${tf}`);
      return res.status(404).json({ error: `Sin datos de velas para ${raw}` });
    }

    const q      = result.indicators.quote[0];
    const closes = q.close;
    const timestamps = result.timestamp;

    // Filter out null values (market closures etc.)
    const filtered = timestamps.reduce((acc, ts, i) => {
      if (closes[i] != null) {
        acc.t.push(ts);
        acc.o.push(q.open[i]   ?? closes[i]);
        acc.h.push(q.high[i]   ?? closes[i]);
        acc.l.push(q.low[i]    ?? closes[i]);
        acc.c.push(closes[i]);
        acc.v.push(q.volume[i] ?? 0);
      }
      return acc;
    }, { t:[], o:[], h:[], l:[], c:[], v:[] });

    if (filtered.c.length === 0) {
      return res.status(404).json({ error: `Sin datos de velas para ${raw}` });
    }

    const out = {
      symbol:     raw,
      tf,
      timestamps: filtered.t,
      open:       filtered.o,
      high:       filtered.h,
      low:        filtered.l,
      close:      filtered.c,
      volume:     filtered.v,
      points:     filtered.c.length,
      currency:   result.meta?.currency || 'USD',
    };

    candleCache[cacheKey] = { data: out, ts: Date.now() };
    console.log(`[Candle] ${raw} tf=${tf}: ${out.points} candles (Yahoo)`);
    res.json({ ...out, cached: false });

  } catch (err) {
    console.error(`[Candle] Error ${raw}:`, err.message);
    res.status(500).json({ error: 'Error al obtener datos de velas' });
  }
});

module.exports = router;