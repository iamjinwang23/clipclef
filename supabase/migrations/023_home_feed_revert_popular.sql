-- Migration 023: home_feed § 4 정렬을 인기순으로 되돌림
-- 022에서 created_at DESC로 바꿨으나, § 3 팔로우 큐레이터(최신순)와
-- 노출 중복이 발생 → like_count DESC + created_at DESC tie-break로 복귀.
-- 다른 섹션(장르/채널/아티스트)의 score 기반 정렬은 그대로 유지.

-- 인기순 정렬 인덱스 (idempotent — 이미 있으면 무시)
CREATE INDEX IF NOT EXISTS idx_playlists_active_likes
  ON playlists (like_count DESC, created_at DESC)
  WHERE is_active = true;

CREATE OR REPLACE FUNCTION home_feed(
  p_limit_genres    INT DEFAULT 8,
  p_limit_channels  INT DEFAULT 10,
  p_limit_artists   INT DEFAULT 8,
  p_limit_playlists INT DEFAULT 12
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
  active_pl AS (
    SELECT id, channel_id, channel_name, genre, created_at,
           like_count, view_count, comment_count
    FROM playlists
    WHERE is_active = true
  ),
  -- ─── 플레이리스트 Top N (인기순 — like_count, created_at tie-break) ──────
  top_playlists AS (
    SELECT id, title, thumbnail_url, channel_id, channel_name,
           editor_note, is_ai, like_count, comment_count, created_at
    FROM playlists
    WHERE is_active = true
    ORDER BY like_count DESC, created_at DESC
    LIMIT p_limit_playlists
  ),
  -- ─── 장르 집계 ───────────────────────────────────────────────────────────
  genre_counts AS (
    SELECT unnest(genre) AS genre_name,
           COUNT(*) AS playlist_count,
           COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS new30_count
    FROM active_pl
    WHERE array_length(genre, 1) > 0
    GROUP BY unnest(genre)
  ),
  top_genres AS (
    SELECT g.id, g.name, g.thumbnail_url, g.position,
           COALESCE(gc.playlist_count, 0)::int AS playlist_count,
           COALESCE(gc.new30_count, 0)::int AS new30_count,
           (ln(1 + COALESCE(gc.playlist_count, 0)) * 1.0
            + COALESCE(gc.new30_count, 0) * 0.5)::numeric AS score
    FROM genres g
    LEFT JOIN genre_counts gc ON gc.genre_name = g.name
    WHERE g.is_active = true
      AND COALESCE(gc.playlist_count, 0) > 0
    ORDER BY score DESC
    LIMIT p_limit_genres
  ),
  -- ─── 채널 집계 ───────────────────────────────────────────────────────────
  channel_agg AS (
    SELECT channel_id,
           MAX(channel_name) AS channel_name,
           SUM(like_count)::bigint    AS likes,
           SUM(view_count)::bigint    AS views,
           SUM(comment_count)::bigint AS comments,
           COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS new30,
           COUNT(*)::int AS playlist_count
    FROM active_pl
    GROUP BY channel_id
  ),
  top_channels AS (
    SELECT channel_id, channel_name, playlist_count,
           (ln(1 + likes) * 1.0
            + ln(1 + views / 1000.0) * 0.8
            + ln(1 + comments) * 2.0
            + new30 * 1.5)::numeric AS score
    FROM channel_agg
    ORDER BY score DESC
    LIMIT p_limit_channels
  ),
  -- ─── 아티스트 집계 ───────────────────────────────────────────────────────
  track_artists AS (
    SELECT artist_to_slug(t.artist) AS slug,
           t.playlist_id,
           p.created_at AS pl_created_at
    FROM tracks t
    INNER JOIN playlists p ON p.id = t.playlist_id AND p.is_active = true
    WHERE t.artist IS NOT NULL AND t.artist <> ''
  ),
  artist_agg AS (
    SELECT slug,
           COUNT(DISTINCT playlist_id)::int AS playlist_count,
           COUNT(DISTINCT playlist_id) FILTER
             (WHERE pl_created_at > NOW() - INTERVAL '30 days')::int AS new30_count
    FROM track_artists
    WHERE slug <> ''
    GROUP BY slug
  ),
  top_artists AS (
    SELECT a.slug, a.name, a.image_url,
           ag.playlist_count, ag.new30_count,
           (ln(1 + ag.playlist_count) * 1.0 + ag.new30_count * 0.5)::numeric AS score
    FROM artists a
    INNER JOIN artist_agg ag ON ag.slug = a.slug
    WHERE a.not_found = false AND a.image_url IS NOT NULL
    ORDER BY score DESC
    LIMIT p_limit_artists
  )
  SELECT jsonb_build_object(
    'genres',    COALESCE((SELECT jsonb_agg(to_jsonb(tg) ORDER BY tg.score DESC) FROM top_genres   tg), '[]'::jsonb),
    'channels',  COALESCE((SELECT jsonb_agg(to_jsonb(tc) ORDER BY tc.score DESC) FROM top_channels tc), '[]'::jsonb),
    'artists',   COALESCE((SELECT jsonb_agg(to_jsonb(ta) ORDER BY ta.score DESC) FROM top_artists  ta), '[]'::jsonb),
    'playlists', COALESCE((SELECT jsonb_agg(to_jsonb(tp) ORDER BY tp.like_count DESC, tp.created_at DESC) FROM top_playlists tp), '[]'::jsonb)
  );
$$;
