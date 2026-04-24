-- Run this in Supabase SQL Editor to enable the Community feature
-- Dashboard: https://supabase.com/dashboard → SQL Editor

-- Posts table
CREATE TABLE IF NOT EXISTS community_posts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_email  text NOT NULL,
  content       text NOT NULL CHECK (char_length(content) >= 10 AND char_length(content) <= 2000),
  portfolio_context jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Index for feed (newest first)
CREATE INDEX IF NOT EXISTS community_posts_created_at_idx ON community_posts (created_at DESC);

-- Likes table (unique per user per post)
CREATE TABLE IF NOT EXISTS community_likes (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id  uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

-- RLS: authenticated users can read all posts
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read posts"
  ON community_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own posts"
  ON community_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own posts"
  ON community_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS: likes
ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read likes"
  ON community_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage their own likes"
  ON community_likes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
