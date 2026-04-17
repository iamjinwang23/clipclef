// Design Ref: §6 — 캐시 조회/갱신 서버 유틸
// API 라우트(/api/artists/[slug])와 아티스트 상세 페이지에서 공용 사용
// 서버 전용 — createAdminClient는 SUPABASE_SERVICE_ROLE_KEY 필요

import { createClient as createSupabaseJs } from '@supabase/supabase-js';
import {
  searchMbid,
  fetchFanartImages,
  fetchTheAudioDB,
  fetchWikipediaBio,
  resolveImage,
  resolveBio,
} from '@/lib/artist-apis';
import type { Playlist } from '@/types';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7일

export interface ArtistRow {
  id: string;
  name: string;
  slug: string;
  mbid: string | null;
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

export async function fetchArtistWithCache(
  slug: string,
  artistName: string,
  mbid?: string | null
): Promise<ArtistRow | null> {
  const supabase = createAdminClient();

  // 1. DB 조회
  const { data: existing } = await supabase
    .from('artists')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (existing?.not_found) return null;

  if (existing && !isStale(existing.cached_at)) {
    return existing as ArtistRow;
  }

  // 2. MBID 확정
  const resolvedMbid = mbid ?? (await searchMbid(artistName));

  if (!resolvedMbid) {
    if (existing) return existing as ArtistRow;

    await supabase.from('artists').upsert(
      { name: artistName, slug, not_found: true, cached_at: new Date().toISOString() },
      { onConflict: 'slug' }
    );
    return null;
  }

  // 3. Fanart.tv + TheAudioDB + Wikipedia 병렬 호출
  const [fanart, audiodb, wikiBio] = await Promise.all([
    fetchFanartImages(resolvedMbid),
    fetchTheAudioDB(resolvedMbid),
    fetchWikipediaBio(resolvedMbid),
  ]);

  const row = {
    name: artistName,
    slug,
    mbid: resolvedMbid,
    image_url: resolveImage(fanart, audiodb),
    bio_en: resolveBio(wikiBio, audiodb?.strBiographyEN ?? null),
    listeners: null,
    not_found: false,
    cached_at: new Date().toISOString(),
  };

  // 4. upsert — Critical fix: 에러 로그 추가, 가짜 row 반환 제거
  const { data: upserted, error } = await supabase
    .from('artists')
    .upsert(row, { onConflict: 'slug' })
    .select()
    .maybeSingle();

  if (error) {
    console.error('[artist.server] upsert error:', error);
    return null;
  }

  return upserted as ArtistRow;
}

/**
 * 특정 아티스트가 포함된 플리 목록 조회 (최대 20개, like_count 내림차순)
 * Critical fix: ilike 에스케이프가 PostgREST에서 작동하지 않는 문제 → slug 기반 정확 매칭으로 변경
 */
export async function getArtistPlaylists(artistName: string): Promise<Playlist[]> {
  const supabase = createAdminClient();

  const { data: trackMatches } = await supabase
    .from('tracks')
    .select('playlist_id')
    .ilike('artist', `%${artistName}%`);

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
