-- ════════════════════════════════════════════════════════════════
-- ÁUREO — Community V2 Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ════════════════════════════════════════════════════════════════

-- ── 1. Extend community_posts ──────────────────────────────────
ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS group_id   uuid,
  ADD COLUMN IF NOT EXISTS title      text CHECK (char_length(title) <= 200),
  ADD COLUMN IF NOT EXISTS post_type  text NOT NULL DEFAULT 'text'
                           CHECK (post_type IN ('text','portfolio','analysis','alert')),
  ADD COLUMN IF NOT EXISTS tickers    text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS community_posts_group_idx
  ON community_posts (group_id, created_at DESC);

-- ── 2. Groups ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_groups (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text UNIQUE NOT NULL,
  name         text NOT NULL,
  description  text,
  icon         text DEFAULT '◎',
  color        text DEFAULT '#2DD4BF',
  is_default   boolean NOT NULL DEFAULT false,
  member_count int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── 3. Group membership ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_group_members (
  group_id  uuid NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS cgm_user_idx ON community_group_members (user_id);

-- ── 4. Comments ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_comments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_email text NOT NULL,
  content      text NOT NULL CHECK (char_length(content) >= 2 AND char_length(content) <= 1000),
  likes_count  int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_comments_post_idx
  ON community_comments (post_id, created_at ASC);

-- ── 5. Comment likes ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_comment_likes (
  comment_id uuid NOT NULL REFERENCES community_comments(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

-- ── 6. Post reactions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_reactions (
  post_id    uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction   text NOT NULL CHECK (reaction IN ('bullish','bearish','insightful')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS community_reactions_post_idx
  ON community_reactions (post_id, reaction);

-- ── 7. Broker performance ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS broker_performance (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_label   text NOT NULL DEFAULT 'Mi Broker',
  recorded_month date NOT NULL,
  real_value     numeric(18,2) NOT NULL,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, broker_label, recorded_month)
);
CREATE INDEX IF NOT EXISTS broker_perf_user_idx
  ON broker_performance (user_id, recorded_month DESC);

-- ── 8. RLS Policies ────────────────────────────────────────────
ALTER TABLE community_groups          ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_group_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comment_likes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_performance        ENABLE ROW LEVEL SECURITY;

-- Groups: public read
CREATE POLICY "read groups" ON community_groups FOR SELECT TO authenticated USING (true);

-- Group members
CREATE POLICY "read memberships" ON community_group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage own membership" ON community_group_members FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Comments
CREATE POLICY "read comments" ON community_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert own comment" ON community_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own comment" ON community_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Comment likes
CREATE POLICY "read comment likes" ON community_comment_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage own comment likes" ON community_comment_likes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Reactions
CREATE POLICY "read reactions" ON community_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage own reactions" ON community_reactions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Broker: strict per-user isolation
CREATE POLICY "own broker data" ON broker_performance FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 9. Seed default groups ─────────────────────────────────────
INSERT INTO community_groups (slug, name, description, icon, color, is_default) VALUES
  ('general',          'General',           'Conversación general sobre inversiones y mercados', '◎',  '#2DD4BF', true),
  ('acciones-usa',     'Acciones USA',      'NYSE, NASDAQ, S&P 500 y empresas americanas',       '🇺🇸', '#60A5FA', true),
  ('etfs-fondos',      'ETFs & Fondos',     'ETFs, fondos mutuos e inversión pasiva',             '📦', '#C4A344', true),
  ('criptomonedas',    'Criptomonedas',     'Bitcoin, Ethereum y el ecosistema crypto',           '₿',  '#A78BFA', true),
  ('mercado-chileno',  'Mercado Chileno',   'BCS, IPSA, acciones y renta fija chilena',           '🇨🇱', '#34D399', true),
  ('analisis-tecnico', 'Análisis Técnico',  'Charts, indicadores, patrones y señales',            '📈', '#FB923C', true),
  ('noticias-macro',   'Noticias & Macro',  'Economía global, Fed, bancos centrales y política',  '📰', '#F87171', true)
ON CONFLICT (slug) DO NOTHING;
