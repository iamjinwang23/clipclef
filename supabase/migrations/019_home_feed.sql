-- Migration 019: Home feed RPC — single round-trip aggregation
-- Replaces client-side aggregation in:
--   useGenres, useChannelStories (+useAllPlaylists), usePopularArtists, usePopularPlaylists
-- All 4 home sections now read from one RPC.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Helper: tracks.artist 원문 → slug (client의 toArtistSlug 재현)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION artist_to_slug(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  main text;
  result text;
BEGIN
  IF input IS NULL THEN
    RETURN '';
  END IF;
  -- feat./ft./featuring/×/x /&// /with 뒤 콜라보 제거
  main := regexp_replace(input, '\s+(ft\.|feat\.|featuring|×|x |&|/|with)\s.*$', '', 'i');
  -- 괄호 안 텍스트 제거
  main := regexp_replace(main, '\s+\([^)]*\)', '', 'g');
  main := trim(main);
  result := lower(main);
  result := regexp_replace(result, '\s+', '-', 'g');
  -- UTF-8 로케일 기준 alnum만 유지(한글/일본어/중문 포함) + 하이픈
  result := regexp_replace(result, '[^[:alnum:]-]', '', 'g');
  result := regexp_replace(result, '-{2,}', '-', 'g');
  result := regexp_replace(result, '(^-|-$)', '', 'g');
  RETURN result;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. 지원 인덱스 (이미 있을 수도 있으므로 IF NOT EXISTS)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_playlists_active_created
  ON playlists (created_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_playlists_active_like
  ON playlists (like_count DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tracks_artist_notnull
  ON tracks (artist) WHERE artist IS NOT NULL AND artist <> '';

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. home_feed RPC — 한 번의 호출로 장르/채널/아티스트/플리 Top N 반환
--    응답: jsonb { genres, channels, artists, playlists }
-- ──────────────────────────────────────────────────────────────────────────────
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
  -- ─── 플레이리스트 Top N (like_count desc) ────────────────────────────────
  top_playlists AS (
    SELECT id, title, thumbnail_url, channel_id, channel_name,
           editor_note, is_ai, like_count, comment_count, created_at
    FROM playlists
    WHERE is_active = true
    ORDER BY like_count DESC
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
    'playlists', COALESCE((SELECT jsonb_agg(to_jsonb(tp) ORDER BY tp.like_count DESC) FROM top_playlists tp), '[]'::jsonb)
  );
$$;

GRANT EXECUTE ON FUNCTION artist_to_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION home_feed(int, int, int, int) TO anon, authenticated;
