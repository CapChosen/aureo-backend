/**
 * Áureo — Servicio WebSocket de precios en tiempo real (Finnhub)
 * Singleton: una sola conexión compartida por todo el backend.
 * Uso:
 *   const rt = require('./services/realtimePrices');
 *   rt.subscribe('AAPL');
 *   rt.on('price', ({ symbol, price, timestamp }) => ...);
 */
const EventEmitter = require('events');
const WebSocket    = require('ws');
const supabase     = require('../lib/supabase');

const WS_URL      = `wss://ws.finnhub.io?token=${process.env.FINNHUB_API_KEY}`;
const MAX_RETRIES = 5;

class RealtimePriceService extends EventEmitter {
  constructor() {
    super();
    this._ws          = null;
    this._subscribed  = new Set();  // símbolos activos
    this._retries     = 0;
    this._connected   = false;
    this._stopped     = false;
    // Debounce Supabase writes: acumular precios y escribir cada 30s
    this._priceBuffer = {};
    this._flushTimer  = setInterval(() => this._flushToSupabase(), 30_000);
  }

  // ── Conexión ─────────────────────────────────────────
  connect() {
    if (this._stopped || !process.env.FINNHUB_API_KEY) return;

    console.log(`[RT] Conectando a Finnhub WS (intento ${this._retries + 1}/${MAX_RETRIES})...`);
    this._ws = new WebSocket(WS_URL);

    this._ws.on('open', () => {
      console.log('[RT] WebSocket conectado');
      this._connected = true;
      this._retries   = 0;
      // Re-suscribir a todos los símbolos activos tras reconexión
      for (const sym of this._subscribed) this._sendSubscribe(sym);
    });

    this._ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type !== 'trade' || !msg.data?.length) return;
        for (const trade of msg.data) {
          const symbol = this._reverseMap(trade.s);
          if (!symbol) continue;
          const payload = { symbol, price: trade.p, timestamp: trade.t };
          this.emit('price', payload);
          this._priceBuffer[symbol] = { price: trade.p, ts: trade.t };
        }
      } catch { /* JSON inválido, ignorar */ }
    });

    this._ws.on('close', () => {
      this._connected = false;
      console.warn('[RT] WebSocket cerrado');
      this._scheduleReconnect();
    });

    this._ws.on('error', (err) => {
      console.error('[RT] WebSocket error:', err.message);
    });
  }

  _scheduleReconnect() {
    if (this._stopped || this._retries >= MAX_RETRIES) {
      console.error(`[RT] Máximo de reintentos (${MAX_RETRIES}) alcanzado. Servicio detenido.`);
      return;
    }
    const delay = Math.min(5000 * 2 ** this._retries, 80_000); // backoff: 5s, 10s, 20s, 40s, 80s
    this._retries++;
    console.log(`[RT] Reconectando en ${delay / 1000}s...`);
    setTimeout(() => this.connect(), delay);
  }

  // ── API pública ──────────────────────────────────────
  subscribe(symbol) {
    const fSym = this._toFinnhub(symbol);
    this._subscribed.add(symbol);
    if (this._connected) this._sendSubscribe(fSym);
  }

  unsubscribe(symbol) {
    const fSym = this._toFinnhub(symbol);
    this._subscribed.delete(symbol);
    if (this._connected && this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify({ type: 'unsubscribe', symbol: fSym }));
    }
  }

  get connected() { return this._connected; }

  stop() {
    this._stopped = true;
    clearInterval(this._flushTimer);
    this._ws?.close();
  }

  // ── Internos ─────────────────────────────────────────
  _toFinnhub(symbol) {
    const MAP = { 'BTC-USD': 'BINANCE:BTCUSDT', 'ETH-USD': 'BINANCE:ETHUSDT' };
    return MAP[symbol] || symbol;
  }

  _reverseMap(finnhubSym) {
    const REV = { 'BINANCE:BTCUSDT': 'BTC-USD', 'BINANCE:ETHUSDT': 'ETH-USD' };
    return REV[finnhubSym] || finnhubSym;
  }

  _sendSubscribe(finnhubSym) {
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify({ type: 'subscribe', symbol: finnhubSym }));
    }
  }

  async _flushToSupabase() {
    const entries = Object.entries(this._priceBuffer);
    if (!entries.length) return;
    this._priceBuffer = {};

    for (const [symbol, { price }] of entries) {
      const { error } = await supabase
        .from('asset_metrics_cache')
        .update({ current_price: price, last_updated: new Date().toISOString() })
        .eq('symbol', symbol);
      if (error) console.error(`[RT] Supabase flush ${symbol}:`, error.message);
    }
  }
}

// Singleton
const instance = new RealtimePriceService();
module.exports = instance;
