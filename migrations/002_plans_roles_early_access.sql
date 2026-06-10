-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 002 — Plans, Roles & Early Access
-- Run once in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Add 'role' column to users (admin bypasses all gates)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

-- 2. Normalize plan column: add 'free' and 'premium' as valid values
--    Existing 'starter' rows → 'free'
--    Existing 'pro' / 'elite' / 'family' rows → 'premium'
UPDATE users SET plan = 'free'    WHERE plan IN ('starter');
UPDATE users SET plan = 'premium' WHERE plan IN ('pro', 'elite', 'family');

-- 3. Rename AI usage columns to match new weekly/monthly semantics
--    Keep old column names as aliases so existing code doesn't break immediately
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS ai_queries_used      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_queries_reset_at  DATE;

-- Migrate existing data
UPDATE users
SET ai_queries_used     = COALESCE(ai_calls_this_month, 0),
    ai_queries_reset_at = COALESCE(ai_calls_reset_date::DATE, CURRENT_DATE)
WHERE ai_queries_used = 0;

-- 4. Premium expiry for promotional plans
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ;

-- 5. Set admin role for the primary developer account
UPDATE users
SET role = 'admin'
WHERE email = 'vice.valder.m@gmail.com';

-- 6. Create early_access table for pre-launch registrations
CREATE TABLE IF NOT EXISTS early_access (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  name        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed    BOOLEAN NOT NULL DEFAULT false,
  redeemed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS early_access_email_idx ON early_access (email);
CREATE INDEX IF NOT EXISTS early_access_redeemed_idx ON early_access (redeemed);

-- ═══════════════════════════════════════════════════════════════
-- Verify
-- ═══════════════════════════════════════════════════════════════
-- SELECT id, email, plan, role, ai_queries_used, premium_expires_at FROM users LIMIT 10;
-- SELECT COUNT(*) FROM early_access;
