-- Migration 013: 알림 시스템 — notifications 테이블 + 트리거 + RLS
-- comments.parent_id 추가 (대댓글 선제 준비)

-- ─── 1. comments.parent_id 추가 ─────────────────────────────────────────────
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES comments(id) ON DELETE SET NULL;

-- ─── 2. notifications 테이블 ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('follow', 'like', 'comment', 'reply')),
  entity_id    UUID,        -- playlist_id 또는 comment_id
  entity_type  TEXT,        -- 'playlist' | 'profile'
  is_read      BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON notifications (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications (recipient_id, is_read)
  WHERE is_read = FALSE;

-- ─── 3. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 자신의 알림만 읽기 가능
CREATE POLICY "notifications_read_own"
  ON notifications FOR SELECT
  USING (auth.uid() = recipient_id);

-- 읽음 처리(is_read 갱신)는 본인만
CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- ─── 4. 트리거 함수 ──────────────────────────────────────────────────────────

-- 4-1. follows → notification (팔로우)
CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER AS $$
BEGIN
  -- 자기 자신 팔로우는 follows 테이블 CHECK로 이미 막혀있으나 이중 방어
  IF NEW.follower_id IS DISTINCT FROM NEW.following_id THEN
    INSERT INTO notifications (recipient_id, actor_id, type, entity_id, entity_type)
    VALUES (NEW.following_id, NEW.follower_id, 'follow', NEW.follower_id, 'profile');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_follow
  AFTER INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION notify_on_follow();

-- 4-2. likes → notification (좋아요)
CREATE OR REPLACE FUNCTION notify_on_like()
RETURNS TRIGGER AS $$
DECLARE
  v_uploader UUID;
BEGIN
  -- 플리 업로더 조회 (관리자 등록 플리는 uploaded_by = NULL)
  SELECT uploaded_by INTO v_uploader
  FROM playlists
  WHERE id = NEW.playlist_id;

  -- 업로더가 있고 자기 자신 좋아요가 아닌 경우에만 알림 생성
  IF v_uploader IS NOT NULL AND v_uploader IS DISTINCT FROM NEW.user_id THEN
    INSERT INTO notifications (recipient_id, actor_id, type, entity_id, entity_type)
    VALUES (v_uploader, NEW.user_id, 'like', NEW.playlist_id, 'playlist');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_like
  AFTER INSERT ON likes
  FOR EACH ROW EXECUTE FUNCTION notify_on_like();

-- 4-3. comments → notification (댓글, parent_id IS NULL = 최상위 댓글만)
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_uploader UUID;
BEGIN
  -- 최상위 댓글만 알림 (대댓글은 parent_id가 있으므로 스킵)
  IF NEW.parent_id IS NULL THEN
    SELECT uploaded_by INTO v_uploader
    FROM playlists
    WHERE id = NEW.playlist_id;

    IF v_uploader IS NOT NULL AND v_uploader IS DISTINCT FROM NEW.user_id THEN
      INSERT INTO notifications (recipient_id, actor_id, type, entity_id, entity_type)
      VALUES (v_uploader, NEW.user_id, 'comment', NEW.playlist_id, 'playlist');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_comment
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_comment();
