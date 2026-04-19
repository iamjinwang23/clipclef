-- Migration 018: genres table for home genre section + /genres listing + /genres/[name] detail
-- Plan Ref: home-redesign.plan.md §1.4
-- Design Ref: home-redesign.design.md §3.1

CREATE TABLE IF NOT EXISTS genres (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT UNIQUE NOT NULL,
  thumbnail_url TEXT,
  position      INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS genres_position_idx ON genres (position) WHERE is_active;
CREATE INDEX IF NOT EXISTS genres_name_idx ON genres (name);

-- Seed from existing GENRE_OPTIONS constant
INSERT INTO genres (name, position) VALUES
  ('Pop', 1),
  ('Hip-hop', 2),
  ('Jazz', 3),
  ('Classical', 4),
  ('Lo-fi', 5),
  ('K-pop', 6),
  ('R&B', 7),
  ('Electronic', 8),
  ('Rock', 9),
  ('Indie', 10),
  ('Soul', 11),
  ('기타', 12)
ON CONFLICT (name) DO NOTHING;

-- RLS: public read active rows; admin writes via service role (follows curated_collections pattern)
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "genres_public_read" ON genres
  FOR SELECT USING (is_active = TRUE);
