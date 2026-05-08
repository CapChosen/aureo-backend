-- ════════════════════════════════════════════════════════
-- Áureo — Caché de datos históricos financieros
-- Ejecutar en el SQL Editor de Supabase
-- ════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS asset_price_history (
  symbol     TEXT        NOT NULL,
  date       DATE        NOT NULL,
  close      NUMERIC     NOT NULL,
  volume     NUMERIC     DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (symbol, date)
);

CREATE TABLE IF NOT EXISTS asset_metrics_cache (
  symbol        TEXT    PRIMARY KEY,
  annual_return NUMERIC,
  volatility    NUMERIC,
  sharpe        NUMERIC,
  max_drawdown  NUMERIC,
  beta_vs_spy   NUMERIC,
  current_price NUMERIC,
  last_updated  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS correlation_cache (
  symbol_a     TEXT    NOT NULL,
  symbol_b     TEXT    NOT NULL,
  correlation  NUMERIC NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (symbol_a, symbol_b)
);

-- Índices para acelerar consultas
CREATE INDEX IF NOT EXISTS idx_price_history_symbol ON asset_price_history (symbol);
CREATE INDEX IF NOT EXISTS idx_price_history_date   ON asset_price_history (date DESC);
CREATE INDEX IF NOT EXISTS idx_corr_a               ON correlation_cache (symbol_a);
CREATE INDEX IF NOT EXISTS idx_corr_b               ON correlation_cache (symbol_b);
