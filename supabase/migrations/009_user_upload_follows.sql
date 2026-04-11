-- Migration 009: 일반 회원 플리 업로드 + 팔로우 기능

-- playlists 에 uploaded_by 컬럼 추가 (nullable — 기존 데이터 호환)
ALTER TABLE playlists
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_playlists_uploaded_by ON playlists (uploaded_by);

-- 일반 회원이 자신의 플리를 등록할 수 있도록 RLS 정책 추가
CREATE POLICY "playlists_user_insert"
  ON playlists FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (uploaded_by = auth.uid()));

-- 업로더 본인이 수정/삭제 가능
CREATE POLICY "playlists_user_update_own"
  ON playlists FOR UPDATE
  USING (auth.uid() = uploaded_by);

CREATE POLICY "playlists_user_delete_own"
  ON playlists FOR DELETE
  USING (auth.uid() = uploaded_by);

-- follows 테이블
CREATE TABLE IF NOT EXISTS follows (
  follower_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower  ON follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows (following_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_read_all"   ON follows FOR SELECT USING (TRUE);
CREATE POLICY "follows_own"        ON follows FOR ALL USING (auth.uid() = follower_id);
