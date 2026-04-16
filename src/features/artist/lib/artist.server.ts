// Design Ref: §4.1, §5.4 — 캐시 조회/갱신 서버 유틸
// API 라우트(/api/artists/[slug])와 아티스트 상세 페이지에서 공용 사용
// 서버 전용 — createAdminClient는 SUPABASE_SERVICE_ROLE_KEY 필요

import { createClient as createSupabaseJs } from '@supabase/supabase-js';
import { fetchArtistFromLastFm } from '@/lib/lastfm';
import type { Playlist } from '@/types';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7일

export interface ArtistRow {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  bio_en: string | null;
  listeners: number | null;
  not_found: boolean;
  cached_at: string;
  created_at: string;
}

function createAdminClient() {
  return createSupabaseJs(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function isStale(cachedAt: string): boolean {
  return Date.now() - new Date(cachedAt).getTime() > CACHE_TTL_MS;
}

/**
 * slug 기반으로 artists 테이블을 확인하고,
 * 없거나 stale이면 Last.fm에서 재조회 후 upsert.
 * not_found 캐시된 경우 재시도 없이 null 반환.
 */
export async function fetchArtistWithCache(
  slug: string,
  artistName: string
): Promise<ArtistRow | null> {
  const supabase = createAdminClient();

  // 1. DB 조회
  const { data: existing } = await supabase
    .from('artists')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  // not_found 캐시 → 재시도 없음
  if (existing?.not_found) return null;

  // 캐시 유효 → 즉시 반환
  if (existing && !isStale(existing.cached_at)) {
    return existing as ArtistRow;
  }

  // 2. Last.fm 호출
  const lfData = await fetchArtistFromLastFm(artistName);

  if (!lfData) {
    if (existing) return existing as ArtistRow; // stale이지만 네트워크 에러 → 기존 반환

    // 신규 + Last.fm 미발견 → not_found upsert
    await supabase.from('artists').upsert(
      {
        name: artistName,
        slug,
        not_found: true,
        cached_at: new Date().toISOString(),
      },
      { onConflict: 'slug' }
    );
    return null;
  }

  // 3. upsert
  const row = {
    name: lfData.name,
    slug,
    image_url: lfData.imageUrl,
    bio_en: lfData.bioSummary,
    listeners: lfData.listeners,
    not_found: false,
    cached_at: new Date().toISOString(),
  };

  const { data: upserted, error } = await supabase
    .from('artists')
    .upsert(row, { onConflict: 'slug' })
    .select()
    .maybeSingle();

  if (error) {
    // upsert 실패 시 Last.fm 데이터로 임시 반환 (id, created_at 없음)
    return { ...row, id: '', created_at: row.cached_at } as ArtistRow;
  }

  return upserted as ArtistRow;
}

/**
 * 특정 아티스트가 포함된 플리 목록 조회 (최대 20개, like_count 내림차순)
 */
export async function getArtistPlaylists(artistName: string): Promise<Playlist[]> {
  const supabase = createAdminClient();
  const escaped = artistName.replace(/[%_]/g, '\\$&');

  // tracks 테이블에서 아티스트 포함 playlist_id 수집
  const { data: trackMatches } = await supabase
    .from('tracks')
    .select('playlist_id')
    .ilike('artist', `%${escaped}%`);

  const playlistIds = [
    ...new Set(
      (trackMatches ?? []).map((t: { playlist_id: string }) => t.playlist_id)
    ),
  ];

  if (playlistIds.length === 0) return [];

  const { data } = await supabase
    .from('playlists')
    .select('*')
    .in('id', playlistIds)
    .eq('is_active', true)
    .order('like_count', { ascending: false })
    .limit(20);

  return (data ?? []) as Playlist[];
}
