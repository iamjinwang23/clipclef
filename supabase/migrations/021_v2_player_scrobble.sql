-- Migration 021: v2 Pivot — Scrobble 인프라 + user_playlists 발행 확장
-- Design Ref: §3.3 — listens 테이블 + user_playlists 컬럼 확장 + RLS 재정의 + RPC 2개
-- Plan SC: SC-2 (scrobble/DAU), SC-3 (publish rate)

-- ============================================================================
-- 1. listens 테이블 (F2 Scrobble) — 트랙 감상 기록
-- ============================================================================

CREATE TABLE IF NOT EXISTS listens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  track_id     UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  playlist_id  UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  played_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms  INTEGER NOT NULL CHECK (duration_ms >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_listens_user_played
  ON listens (user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_listens_playlist
  ON listens (playlist_id);
CREATE INDEX IF NOT EXISTS idx_listens_track
  ON listens (track_id);

-- 중복 방지는 클라이언트 useScrobble의 committed 플래그로 처리
-- (DB unique partial index는 DATE_TRUNC(timestamptz) IMMUTABLE 이슈로 제외)

-- RLS
ALTER TABLE listens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listens_read_own" ON listens;
CREATE POLICY "listens_read_own"
  ON listens FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "listens_insert_own" ON listens;
CREATE POLICY "listens_insert_own"
  ON listens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 본인만 삭제 가능 (잘못 기록된 scrobble 수동 정리용 — Design §6 Error Handling)
DROP POLICY IF EXISTS "listens_delete_own" ON listens;
CREATE POLICY "listens_delete_own"
  ON listens FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================================
-- 2. user_playlists 컬럼 확장 (F5 발행)
-- ============================================================================

ALTER TABLE user_playlists
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cover_url    TEXT,
  ADD COLUMN IF NOT EXISTS caption      VARCHAR(140);

-- 발행된 것만 홈 선반에 노출 — published_at DESC 정렬용 부분 인덱스
CREATE INDEX IF NOT EXISTS idx_user_playlists_published
  ON user_playlists (published_at DESC)
  WHERE published_at IS NOT NULL;


-- ============================================================================
-- 3. RLS 재정의: 발행상태(published_at IS NOT NULL) = 공개
-- ============================================================================

-- user_playlists: 기존 is_public 기반 정책을 published_at 기반으로 교체
-- is_public 컬럼은 유지 (backward compat, 새 의미: 링크 공유 플래그)
DROP POLICY IF EXISTS "user_playlists_read" ON user_playlists;
CREATE POLICY "user_playlists_read"
  ON user_playlists FOR SELECT
  USING (published_at IS NOT NULL OR auth.uid() = user_id);

-- user_playlist_items: 상위 리스트가 발행상태면 공개
DROP POLICY IF EXISTS "user_playlist_items_read" ON user_playlist_items;
CREATE POLICY "user_playlist_items_read"
  ON user_playlist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_playlists
      WHERE id = user_playlist_id
        AND (published_at IS NOT NULL OR auth.uid() = user_id)
    )
  );


-- ============================================================================
-- 4. Backfill (FR-14) — 기존 is_public=true AND items 1+ AND 90일 내 → 자동 발행
-- ============================================================================

UPDATE user_playlists up
SET published_at = up.created_at
WHERE up.is_public = TRUE
  AND up.published_at IS NULL
  AND up.created_at >= NOW() - INTERVAL '90 days'
  AND EXISTS (
    SELECT 1 FROM user_playlist_items upi
    WHERE upi.user_playlist_id = up.id
  );


-- ============================================================================
-- 5. RPC: 이어듣기 섹션 (F8 § 1) — 최근 들은 플리 FIFO 큐
-- ============================================================================

-- 보안: auth.uid()로 본인 기록만 조회 (arbitrary UUID 파라미터 배제)
CREATE OR REPLACE FUNCTION recent_playlists_for_user(
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  playlist_id     UUID,
  last_played_at  TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- DISTINCT ON으로 중복 플리 제거, 가장 최근 played_at 1건만 유지
  -- ORDER BY (playlist_id, played_at DESC)로 DISTINCT 비교 기준 맞춤
  -- 외부 ORDER BY로 FIFO 큐 정렬 (가장 최근이 맨 앞)
  SELECT playlist_id, last_played_at
  FROM (
    SELECT DISTINCT ON (l.playlist_id)
      l.playlist_id,
      l.played_at AS last_played_at
    FROM listens l
    WHERE l.user_id = auth.uid()
    ORDER BY l.playlist_id, l.played_at DESC
  ) sub
  ORDER BY last_played_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION recent_playlists_for_user(INT) TO authenticated;


-- ============================================================================
-- 6. RPC: 혼합 선반 (F6) — curated_collections + published user_playlists
-- ============================================================================

CREATE OR REPLACE FUNCTION mixed_shelf(
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  source        TEXT,           -- 'curated' | 'user'
  id            UUID,
  title         TEXT,
  cover_url     TEXT,
  caption       TEXT,
  creator_id    UUID,           -- user source일 때만 채워짐
  published_at  TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH unified AS (
    -- 관리자 에디토리얼
    SELECT
      'curated'::TEXT              AS source,
      cc.id                        AS id,
      cc.title                     AS title,
      cc.banner_image_url          AS cover_url,
      cc.description               AS caption,
      NULL::UUID                   AS creator_id,
      cc.created_at                AS published_at
    FROM curated_collections cc
    WHERE cc.is_active = TRUE

    UNION ALL

    -- 유저 발행 컬렉션
    SELECT
      'user'::TEXT                 AS source,
      up.id                        AS id,
      up.name                      AS title,
      up.cover_url                 AS cover_url,
      up.caption                   AS caption,
      up.user_id                   AS creator_id,
      up.published_at              AS published_at
    FROM user_playlists up
    WHERE up.published_at IS NOT NULL
  )
  SELECT source, id, title, cover_url, caption, creator_id, published_at
  FROM unified
  ORDER BY published_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION mixed_shelf(INT) TO anon, authenticated;


-- ============================================================================
-- Rollback (문제 시 수동 실행용)
-- ============================================================================
-- DROP FUNCTION IF EXISTS mixed_shelf(INT);
-- DROP FUNCTION IF EXISTS recent_playlists_for_user(INT);
-- DROP POLICY IF EXISTS "user_playlist_items_read" ON user_playlist_items;
-- DROP POLICY IF EXISTS "user_playlists_read" ON user_playlists;
-- -- 이전 정책 복원
-- CREATE POLICY "user_playlists_read" ON user_playlists
--   FOR SELECT USING (is_public = TRUE OR auth.uid() = user_id);
-- CREATE POLICY "user_playlist_items_read" ON user_playlist_items
--   FOR SELECT USING (
--     EXISTS (SELECT 1 FROM user_playlists
--             WHERE id = user_playlist_id
--               AND (is_public = TRUE OR auth.uid() = user_id)));
-- -- 백필된 published_at 초기화는 의도적 수행 시만
-- -- UPDATE user_playlists SET published_at = NULL;
-- DROP INDEX IF EXISTS idx_user_playlists_published;
-- ALTER TABLE user_playlists
--   DROP COLUMN IF EXISTS caption,
--   DROP COLUMN IF EXISTS cover_url,
--   DROP COLUMN IF EXISTS published_at;
-- DROP POLICY IF EXISTS "listens_delete_own" ON listens;
-- DROP POLICY IF EXISTS "listens_insert_own" ON listens;
-- DROP POLICY IF EXISTS "listens_read_own" ON listens;
-- DROP INDEX IF EXISTS idx_listens_dedupe;
-- DROP INDEX IF EXISTS idx_listens_track;
-- DROP INDEX IF EXISTS idx_listens_playlist;
-- DROP INDEX IF EXISTS idx_listens_user_played;
-- DROP TABLE IF EXISTS listens;
