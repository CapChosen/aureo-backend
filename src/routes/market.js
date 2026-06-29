const express  = require('express');
const supabase  = require('../lib/supabase');
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
  // Chile — IPSA / Bolsa de Santiago
  'FALABELLA.SN','CENCOSUD.SN','COPEC.SN','SQM-B.SN','BSANTANDER.SN','BCI.SN',
  'CHILE.SN','CMPC.SN','ENEL.SN','COLBUN.SN','ENELAM.SN','ECL.SN','RIPLEY.SN',
  'FORUS.SN','CAP.SN','VAPORES.SN','ITAUCL.SN','SECURITY.SN','CONCHA.SN',
  // ETFs Chile / LATAM
  'ECH','ILF',
  // Crypto adicional
  'SOL-USD','BNB-USD','XRP-USD','DOGE-USD',
];

// Mapeo de símbolos propios → formato Finnhub
const QUOTE_SYMBOL_MAP = {
  'BTC-USD':  'BINANCE:BTCUSDT',
  'ETH-USD':  'BINANCE:ETHUSDT',
  'SOL-USD':  'BINANCE:SOLUSDT',
  'BNB-USD':  'BINANCE:BNBUSDT',
  'XRP-USD':  'BINANCE:XRPUSDT',
  'DOGE-USD': 'BINANCE:DOGEUSDT',
};

// ════════════════════════════════════════════════════════
// Inferir exchange/currency a partir del sufijo del símbolo
// (Finnhub /search y /quote no devuelven estos campos en el plan free)
// ════════════════════════════════════════════════════════
const SUFFIX_EXCHANGE_MAP = {
  '.SN': { exchange: 'Santiago',     currency: 'CLP' },
  '.MX': { exchange: 'Mexico',       currency: 'MXN' },
  '.BA': { exchange: 'Buenos Aires', currency: 'ARS' },
  '.SA': { exchange: 'Sao Paulo',    currency: 'BRL' },
  '.TO': { exchange: 'Toronto',      currency: 'CAD' },
  '.L':  { exchange: 'London',       currency: 'GBP' },
  '.DE': { exchange: 'Frankfurt',    currency: 'EUR' },
  '.PA': { exchange: 'Paris',        currency: 'EUR' },
  '.HK': { exchange: 'Hong Kong',    currency: 'HKD' },
  '.T':  { exchange: 'Tokyo',        currency: 'JPY' },
};
function inferExchangeCurrency(symbol) {
  for (const [suffix, info] of Object.entries(SUFFIX_EXCHANGE_MAP)) {
    if (symbol.endsWith(suffix)) return info;
  }
  return { exchange: 'US', currency: 'USD' };
}

// Patrón de ticker chileno: letras/guiones seguidos de .SN
const CL_TICKER_RE = /^[A-Za-z.\-]+\.SN$/i;

// Cache extendida (todos los activos extra)
let extendedCache = {};
let extendedTimestamp = 0;
let preloadRunning = false;
// Rate-limit de reintentos para símbolos sin precio en /price/spot
const _notFoundAttempts = {};

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
    const finnhubSymbol = QUOTE_SYMBOL_MAP[symbol] || symbol;
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(finnhubSymbol)}&token=${FINNHUB_KEY}`;
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
// GET /api/market/price/dynamic/:symbol - Precio con fallback (público)
// Revisa cache (5 min) → si no hay, prueba Finnhub y luego Twelve Data
// (Twelve Data cubre exchanges internacionales que Finnhub free no tiene).
// ════════════════════════════════════════════════════════
router.get('/price/dynamic/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const now = Date.now();
  const FRESH_MS = 5 * 60 * 1000;

  const cached = extendedCache[symbol] || priceCache[symbol];
  if (cached?.price != null && cached.ts && (now - cached.ts) < FRESH_MS) {
    return res.json({
      symbol,
      price:      cached.price,
      change:     cached.change ?? 0,
      change_pct: cached.change_pct ?? 0,
      currency:   cached.currency || inferExchangeCurrency(symbol).currency,
      source:     'cache',
    });
  }

  try {
    const result = await fetchPriceMultiSource(symbol);

    if (!result) {
      return res.status(404).json({ error: `Símbolo ${symbol} no encontrado o sin datos` });
    }

    const currency = inferExchangeCurrency(symbol).currency;
    extendedCache[symbol] = {
      symbol, price: result.price, change: result.change, change_pct: result.change_pct,
      currency, ts: now,
    };

    res.json({
      symbol, price: result.price, change: result.change,
      change_pct: result.change_pct, currency, source: 'live', provider: result.source,
    });
  } catch (error) {
    console.error(`[price/dynamic] Error ${symbol}:`, error.message);
    res.status(500).json({ error: 'Error al obtener precio' });
  }
});

// ════════════════════════════════════════════════════════
// GET /api/market/price/spot/:symbol - Precio spot on-demand (público)
// Usado por el lazy-loading del Explorador de Activos para llenar
// precios faltantes sin esperar el preload completo en background.
// ════════════════════════════════════════════════════════
router.get('/price/spot/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const now = Date.now();
  const FRESH_MS = 10 * 60 * 1000;
  const NOT_FOUND_RETRY_MS = 60 * 1000;

  const cached = extendedCache[symbol] || priceCache[symbol];
  if (cached?.price != null && cached.ts && (now - cached.ts) < FRESH_MS) {
    return res.json({
      symbol, price: cached.price, change: cached.change ?? 0,
      change_pct: cached.change_pct ?? 0, prev_close: cached.prev_close ?? null,
      source: 'cache',
    });
  }

  // Si el último intento sin precio fue hace menos de 60s, no reintentar contra Finnhub
  const lastNotFound = _notFoundAttempts[symbol];
  if (lastNotFound && (now - lastNotFound) < NOT_FOUND_RETRY_MS) {
    return res.json({ symbol, price: null, change: 0, change_pct: 0, prev_close: null, source: 'not_found' });
  }

  try {
    const result = await fetchPriceMultiSource(symbol);

    if (!result) {
      _notFoundAttempts[symbol] = now;
      return res.json({ symbol, price: null, change: 0, change_pct: 0, prev_close: null, source: 'not_found' });
    }

    delete _notFoundAttempts[symbol];
    extendedCache[symbol] = {
      symbol, price: result.price, change: result.change, change_pct: result.change_pct,
      prev_close: result.prev_close ?? null, ts: now,
    };

    res.json({
      symbol, price: result.price, change: result.change,
      change_pct: result.change_pct, prev_close: result.prev_close ?? null, source: 'live', provider: result.source,
    });
  } catch (error) {
    console.error(`[price/spot] Error ${symbol}:`, error.message);
    res.status(500).json({ error: 'Error al obtener precio' });
  }
});

// ════════════════════════════════════════════════════════
// GET /api/market/preload/status - Estado del preload en background
// ════════════════════════════════════════════════════════
router.get('/preload/status', (_req, res) => {
  const total    = EXTENDED_SYMBOLS.length;
  const missing  = EXTENDED_SYMBOLS.filter(s => extendedCache[s]?.price == null);
  const loaded   = total - missing.length;

  res.json({
    running: preloadRunning,
    total,
    loaded,
    pct: total > 0 ? Math.round((loaded / total) * 100) : 100,
    symbols_missing: missing,
  });
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

    if (symbols.length > 50) {
      return res.status(400).json({ error: 'Máximo 50 símbolos por request' });
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
// GET /api/market/search/:query - Buscar símbolos (público)
// ════════════════════════════════════════════════════════
const SEARCH_ALLOWED_TYPES = new Set([
  'Common Stock', 'ETP', 'ETF', 'ADR', 'Crypto', 'Forex', 'Fund', 'Bond',
]);

router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;

    if (!query || query.length < 1) {
      return res.status(400).json({ error: 'Query muy corto' });
    }

    const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.result && data.result.length > 0) {
      let results = data.result
        .filter(item => SEARCH_ALLOWED_TYPES.has(item.type))
        .slice(0, 50)
        .map(item => {
          const { exchange, currency } = inferExchangeCurrency(item.symbol);
          return {
            symbol: item.symbol,
            description: item.description,
            type: item.type,
            displaySymbol: item.displaySymbol,
            exchange,
            currency,
          };
        });

      // Priorizar tickers chilenos cuando el query mismo tiene el patrón .SN
      if (CL_TICKER_RE.test(query)) {
        results = [
          ...results.filter(r => r.symbol.endsWith('.SN')),
          ...results.filter(r => !r.symbol.endsWith('.SN')),
        ];
      }

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
// GET /api/market/exchange/:exchange - Listado de activos por bolsa
// Exchanges soportados: SN (Santiago), BM (México), BA (Buenos Aires).
// 'US' no se implementa — devuelve demasiados resultados; usar /search.
// Cache en memoria 24h (el listado de símbolos por bolsa no cambia seguido).
// ════════════════════════════════════════════════════════
const SUPPORTED_EXCHANGES = new Set(['SN', 'BM', 'BA']);
const _exchangeCache = {}; // { SN: { data, ts } }
const EXCHANGE_CACHE_TTL = 24 * 60 * 60 * 1000;

router.get('/exchange/:exchange', requireAuth, async (req, res) => {
  const exchange = req.params.exchange.toUpperCase();

  if (!SUPPORTED_EXCHANGES.has(exchange)) {
    return res.status(400).json({
      error: `Exchange '${exchange}' no soportado`,
      supported: [...SUPPORTED_EXCHANGES],
    });
  }

  const cached = _exchangeCache[exchange];
  if (cached && (Date.now() - cached.ts) < EXCHANGE_CACHE_TTL) {
    return res.json({ exchange, results: cached.data, count: cached.data.length, cached: true });
  }

  try {
    const url = `https://finnhub.io/api/v1/stock/symbol?exchange=${exchange}&token=${FINNHUB_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !Array.isArray(data)) {
      return res.status(502).json({ error: 'Error al obtener listado de Finnhub' });
    }

    const results = data
      .slice(0, 500)
      .map(item => ({
        symbol:      item.symbol,
        description: item.description,
        type:        item.type,
        currency:    item.currency || inferExchangeCurrency(item.symbol).currency,
      }));

    _exchangeCache[exchange] = { data: results, ts: Date.now() };

    res.json({ exchange, results, count: results.length, cached: false });
  } catch (error) {
    console.error(`Error obteniendo exchange ${exchange}:`, error);
    res.status(500).json({ error: 'Error al obtener listado de activos' });
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

// ────────────────────────────────────────────────────────
// Twelve Data — cloud-friendly, unified endpoint for stocks+crypto
// Env var: TWELVE_DATA_KEY  (get free key at twelvedata.com)
// Free: 800 calls/day, 8 calls/min → 7.5s between calls
// Basic ($8/mo): 120 calls/min → remove delay, instant correlations
// ────────────────────────────────────────────────────────
const CRYPTO_SYMBOLS = new Set(['BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD', 'DOGE-USD']);
function isCrypto(symbol) { return CRYPTO_SYMBOLS.has(symbol); }

// Map internal symbol → Twelve Data symbol
function toTdSymbol(symbol) {
  if (isCrypto(symbol)) return symbol.replace('-', '/');
  return symbol;
}

// Exchanges internacionales que Finnhub free no cubre pero Twelve Data sí
// (confirmado vía symbol_search: BVS=Santiago, BMV=México, BCBA=Buenos Aires)
const TD_EXCHANGE_MAP = { '.SN': 'BVS', '.MX': 'BMV', '.BA': 'BCBA' };
function toTdQuoteTarget(symbol) {
  for (const [suffix, exchange] of Object.entries(TD_EXCHANGE_MAP)) {
    if (symbol.endsWith(suffix)) return { symbol: symbol.slice(0, -suffix.length), exchange };
  }
  return { symbol: toTdSymbol(symbol), exchange: null };
}

// Cotización en vivo via Twelve Data — usado como fallback cuando Finnhub
// no cubre el símbolo (exchanges internacionales en plan free).
async function tdQuote(symbol, exchange) {
  const key = process.env.TWELVE_DATA_KEY;
  if (!key) return null;
  let url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${key}`;
  if (exchange) url += `&exchange=${encodeURIComponent(exchange)}`;
  try {
    const res = await tdGet(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 'error' || data.code || !data.close) {
      if (data.message) console.warn(`[TD] quote ${symbol}:`, data.message);
      return null;
    }
    return {
      price:      parseFloat(data.close),
      change:     parseFloat(data.change || 0),
      change_pct: parseFloat(data.percent_change || 0),
      prev_close: parseFloat(data.previous_close ?? data.close),
    };
  } catch (e) {
    console.error(`[TD] quote ${symbol}:`, e.message);
    return null;
  }
}

// Precio en vivo multi-fuente: Finnhub primero (rápido, US+crypto),
// Twelve Data como fallback (cubre exchanges internacionales: Chile, México, Argentina).
async function fetchPriceMultiSource(symbol) {
  const fh = await fetchPrice(symbol);
  if (fh) return { ...fh, source: 'finnhub' };

  const { symbol: tdSym, exchange } = toTdQuoteTarget(symbol);
  const td = await tdQuote(tdSym, exchange);
  if (td) return { symbol, ...td, source: 'twelvedata' };

  return null;
}

// Rate limiter: max 8 TD calls/min (free plan). Set TD_PREMIUM=1 in Railway to skip delay.
let _tdNextTs = 0;
const TD_INTERVAL = process.env.TD_PREMIUM ? 200 : 8000;

async function tdGet(url) {
  if (!process.env.TD_PREMIUM) {
    const now = Date.now();
    if (now < _tdNextTs) await new Promise(r => setTimeout(r, _tdNextTs - now));
    _tdNextTs = Math.max(_tdNextTs, Date.now()) + TD_INTERVAL;
  }
  return fetch(url, { headers: { 'User-Agent': 'AureoApp/1.0' } });
}

async function avMonthlyRows(symbol) {
  const key = process.env.TWELVE_DATA_KEY;
  if (!key) return null;

  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(toTdSymbol(symbol))}&interval=1month&outputsize=120&apikey=${key}`;
  try {
    const res  = await tdGet(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 'error' || data.code) {
      console.warn(`[TD] monthly ${symbol}:`, data.message);
      return null;
    }
    if (!data.values?.length) return null;
    return data.values
      .map(d => ({ date: d.datetime, close: parseFloat(d.close) }))
      .filter(r => !isNaN(r.close) && r.close > 0)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  } catch (e) {
    console.error(`[TD] monthly ${symbol}:`, e.message);
    return null;
  }
}

async function avDailyRows(symbol) {
  const key = process.env.TWELVE_DATA_KEY;
  if (!key) return null;

  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(toTdSymbol(symbol))}&interval=1day&outputsize=365&apikey=${key}`;
  try {
    const res  = await tdGet(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 'error' || data.code) {
      console.warn(`[TD] daily ${symbol}:`, data.message);
      return null;
    }
    if (!data.values?.length) return null;
    return data.values
      .map(d => ({
        date:   d.datetime,
        open:   parseFloat(d.open),
        high:   parseFloat(d.high),
        low:    parseFloat(d.low),
        close:  parseFloat(d.close),
        volume: parseFloat(d.volume) || 0,
      }))
      .filter(r => r.close > 0)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  } catch (e) {
    console.error(`[TD] daily ${symbol}:`, e.message);
    return null;
  }
}

// Weekly rows para el timeframe Semanal
async function avWeeklyRows(symbol) {
  const key = process.env.TWELVE_DATA_KEY;
  if (!key) return null;
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(toTdSymbol(symbol))}&interval=1week&outputsize=260&apikey=${key}`;
  try {
    const res  = await tdGet(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 'error' || data.code) { console.warn(`[TD] weekly ${symbol}:`, data.message); return null; }
    if (!data.values?.length) return null;
    return data.values
      .map(d => ({ date: d.datetime, open: parseFloat(d.open), high: parseFloat(d.high), low: parseFloat(d.low), close: parseFloat(d.close), volume: parseFloat(d.volume) || 0 }))
      .filter(r => r.close > 0)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  } catch (e) { console.error(`[TD] weekly ${symbol}:`, e.message); return null; }
}

// Obtiene datos históricos mensuales — Supabase cache → Twelve Data
// (Stooq se retiró: su endpoint de descarga ahora exige un challenge JS
// anti-bot que bloquea cualquier request server-side, incluyendo Railway).
async function fetchHistorical(symbol) {
  const cached = historicalCache[symbol];
  if (cached && (Date.now() - cached.timestamp) < HIST_CACHE_TTL) {
    return cached.data;
  }

  // 1. Supabase asset_price_history (rápido, sin rate limit — llenado por job nocturno)
  let rows = null;
  try {
    const { data: dbRows } = await supabase
      .from('asset_price_history')
      .select('date, close')
      .eq('symbol', symbol)
      .order('date', { ascending: true })
      .limit(120);
    if (dbRows?.length >= 12) {
      rows = dbRows.map(r => ({ date: r.date, close: parseFloat(r.close) }));
      console.log(`[Hist] ${symbol}: ${rows.length} pts (Supabase cache)`);
    }
  } catch { /* ignorar error de DB, continuar con APIs externas */ }

  // 2. Twelve Data (rate-limited, 8/min free)
  if (!rows) rows = await avMonthlyRows(symbol);

  if (!rows || rows.length < 12) {
    console.log(`[Hist] Sin datos ${symbol}: ${rows?.length ?? 0} pts`);
    return null;
  }

  const closes = rows.map(r => r.close);
  const N = closes.length;

  const returns = [];
  const returnsByMonth = {};
  for (let i = 1; i < N; i++) {
    const r = Math.log(closes[i] / closes[i - 1]);
    returns.push(r);
    returnsByMonth[rows[i].date.slice(0, 7)] = r;
  }

  if (returns.length < 6) return null;

  const mean     = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, returns.length - 1);
  const mu        = parseFloat((mean * 12).toFixed(4));
  const sigma     = parseFloat((Math.sqrt(variance) * Math.sqrt(12)).toFixed(4));
  const return_5y = parseFloat(((closes[N - 1] / closes[0]) - 1).toFixed(4));

  let maxDD = 0, peak = closes[0];
  for (const c of closes) {
    if (c > peak) peak = c;
    const dd = (peak - c) / peak;
    if (dd > maxDD) maxDD = dd;
  }

  const result = {
    symbol, mu, sigma, return_5y,
    max_drawdown : parseFloat(maxDD.toFixed(4)),
    data_points  : N,
    period       : `${rows[0].date.slice(0, 7)} – ${rows[N - 1].date.slice(0, 7)}`,
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
  // Sequential — AV rate limit is 5/min; avGet() serializes internally
  const batchData = [];
  for (const s of symbols) batchData.push(await fetchHistorical(s));
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
  // Sequential — AV rate limit is 5/min; avGet() serializes internally
  for (const s of allSyms) { const h = await fetchHistorical(s); if (h) results[s] = h; }

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
      return {
        symbol, price: parseFloat(data.c.toFixed(2)),
        change: parseFloat(data.d?.toFixed(2) || 0),
        change_pct: parseFloat(data.dp?.toFixed(2) || 0),
        prev_close: parseFloat(data.pc?.toFixed(2) || 0),
        ts: Date.now(),
      };
    }
    if (data.pc && data.pc > 0) {
      return { symbol, price: parseFloat(data.pc.toFixed(2)), change: 0, change_pct: 0, prev_close: parseFloat(data.pc.toFixed(2)), ts: Date.now() };
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
// Fuentes: Supabase cache (job nocturno) → Twelve Data.
// tf: 1H → daily last 30d, D → daily 1y, M/Y → monthly 5y
// ════════════════════════════════════════════════════════

router.get('/candle/:symbol', async (req, res) => {
  const raw      = req.params.symbol.toUpperCase();
  const tf       = req.query.tf || 'D';
  const cacheKey = `${raw}:${tf}`;

  const cached = candleCache[cacheKey];
  if (cached && (Date.now() - cached.ts) < CANDLE_CACHE_TTL) {
    return res.json({ ...cached.data, cached: true });
  }

  try {
    // tf: D=diario 1y, S=semanal 2y, M=mensual 3y, 1A=mensual 1y, 5A=mensual 5y
    const isMonthly = ['M', '1A', '5A', 'Y'].includes(tf);
    const isWeekly  = tf === 'S';
    let rows = null, source = '?';

    // Rango para la consulta Supabase (monthly data only in DB)
    const dbDays = isMonthly ? 10 * 365 : 2 * 365;
    try {
      const cutoffDb = new Date(Date.now() - dbDays * 86400000).toISOString().slice(0, 10);
      const { data: dbRows } = await supabase
        .from('asset_price_history')
        .select('date, close')
        .eq('symbol', raw)
        .gte('date', cutoffDb)
        .order('date', { ascending: true });
      if (dbRows?.length >= 5) {
        rows   = dbRows.map(r => ({ date: r.date, close: parseFloat(r.close) }));
        source = 'Supabase';
      }
    } catch { /* ignorar */ }

    // Twelve Data: elegir resolución correcta
    if (!rows) {
      if (isWeekly)       rows = await avWeeklyRows(raw);
      else if (isMonthly) rows = await avMonthlyRows(raw);
      else                rows = await avDailyRows(raw);
      if (rows) source = 'TwelveData';
    }

    // Filtrar al rango exacto del timeframe
    if (rows) {
      const DAYS = { 'D': 365, 'S': 2*365, 'M': 3*365, '1A': 365, '5A': 5*365, 'Y': 10*365 };
      const cutoff = new Date(Date.now() - (DAYS[tf] ?? 365) * 86400000).toISOString().slice(0, 10);
      rows = rows.filter(r => r.date >= cutoff);
    }

    if (!rows || rows.length === 0) {
      console.warn(`[Candle] No data for ${raw} tf=${tf}`);
      return res.status(404).json({ error: `Sin datos de velas para ${raw}` });
    }

    const toTs = d => Math.floor(new Date(d).getTime() / 1000);
    const out = {
      symbol:     raw,
      tf,
      timestamps: rows.map(r => toTs(r.date)),
      open:       rows.map(r => r.open  ?? r.close),
      high:       rows.map(r => r.high  ?? r.close),
      low:        rows.map(r => r.low   ?? r.close),
      close:      rows.map(r => r.close),
      volume:     rows.map(r => r.volume ?? 0),
      points:     rows.length,
      currency:   'USD',
    };

    candleCache[cacheKey] = { data: out, ts: Date.now() };
    console.log(`[Candle] ${raw} tf=${tf}: ${out.points} pts (${source})`);
    res.json({ ...out, cached: false });

  } catch (err) {
    console.error(`[Candle] Error ${raw}:`, err.message);
    res.status(500).json({ error: 'Error al obtener datos de velas' });
  }
});

// ════════════════════════════════════════════════════════
// GET /api/market/test-td — diagnóstico Twelve Data (sin auth)
// ════════════════════════════════════════════════════════
router.get('/test-td', async (_req, res) => {
  const key = process.env.TWELVE_DATA_KEY;
  if (!key) return res.json({ ok: false, error: 'TWELVE_DATA_KEY no está en las variables de entorno' });

  try {
    const url = `https://api.twelvedata.com/time_series?symbol=SPY&interval=1day&outputsize=5&apikey=${key}`;
    const r    = await fetch(url, { headers: { 'User-Agent': 'AureoTest/1.0' } });
    const data = await r.json();

    if (data.status === 'error' || data.code) {
      return res.json({ ok: false, td_error: data.message || data.code, raw: data });
    }
    const pts = data.values?.length ?? 0;
    return res.json({
      ok:      pts > 0,
      points:  pts,
      sample:  data.values?.[0],
      key_prefix: key.slice(0, 6) + '...',
    });
  } catch (e) {
    return res.json({ ok: false, error: e.message });
  }
});

module.exports = router;
// Exportar para uso en cachedMetrics.js (fallback on-demand)
module.exports.fetchHistorical = fetchHistorical;