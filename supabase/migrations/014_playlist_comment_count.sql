-- Migration 014: playlists.comment_count 비정규화 컬럼 + INSERT/DELETE 트리거

-- ─── 1. 컬럼 추가 ────────────────────────────────────────────────────────────
ALTER TABLE playlists
  ADD COLUMN IF NOT EXISTS comment_count INT NOT NULL DEFAULT 0;

-- ─── 2. 기존 댓글 수 백필 ────────────────────────────────────────────────────
UPDATE playlists p
SET comment_count = (
  SELECT COUNT(*) FROM comments c WHERE c.playlist_id = p.id
);

-- ─── 3. INSERT 트리거 함수 ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE playlists SET comment_count = comment_count + 1
  WHERE id = NEW.playlist_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_comment_count
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION increment_comment_count();

-- ─── 4. DELETE 트리거 함수 ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION decrement_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE playlists SET comment_count = GREATEST(0, comment_count - 1)
  WHERE id = OLD.playlist_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decrement_comment_count
  AFTER DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION decrement_comment_count();
