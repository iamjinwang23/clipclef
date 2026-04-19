'use client';
// Design Ref: home-redesign.design.md §4.3 — 아티스트 인기 점수 훅
// log(1 + playlistCount) * 1.0 + new30Count * 0.5 로 정렬
// 이미지 없는 아티스트(not_found=true 또는 image_url null)는 제외

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toArtistSlug, extractMainArtist } from '@/lib/artist-apis';

export interface PopularArtist {
  slug: string;
  name: string;
  image_url: string | null;
  playlistCount: number;
  new30Count: number;
  score: number;
}

const DAY_30_MS = 30 * 24 * 60 * 60 * 1000;

type TrackRow = {
  artist: string | null;
  playlist_id: string;
  playlists: { is_active: boolean; created_at: string } | null;
};

export function usePopularArtists(limit?: number) {
  return useQuery<PopularArtist[]>({
    queryKey: ['popular-artists', limit ?? 'all'],
    queryFn: async () => {
      const supabase = createClient();

      // 아티스트 메타 + 트랙(플리 조인) 병렬 조회
      const [artistsRes, tracksRes] = await Promise.all([
        supabase
          .from('artists')
          .select('name, slug, image_url')
          .eq('not_found', false)
          .not('image_url', 'is', null),
        supabase
          .from('tracks')
          .select('artist, playlist_id, playlists!inner(is_active, created_at)')
          .eq('playlists.is_active', true),
      ]);

      const artists = artistsRes.data ?? [];
      const tracks = (tracksRes.data ?? []) as unknown as TrackRow[];

      // 트랙에서 아티스트(slug)별 집계
      const now = Date.now();
      const agg = new Map<string, { playlistIds: Set<string>; new30Ids: Set<string> }>();

      for (const t of tracks) {
        if (!t.artist || !t.playlists) continue;
        const slug = toArtistSlug(extractMainArtist(t.artist));
        if (!slug) continue;
        let entry = agg.get(slug);
        if (!entry) {
          entry = { playlistIds: new Set(), new30Ids: new Set() };
          agg.set(slug, entry);
        }
        entry.playlistIds.add(t.playlist_id);
        if (now - new Date(t.playlists.created_at).getTime() < DAY_30_MS) {
          entry.new30Ids.add(t.playlist_id);
        }
      }

      // 이미지 있는 아티스트만 추림 + 점수화
      const scored: PopularArtist[] = [];
      for (const a of artists) {
        const e = agg.get(a.slug);
        if (!e || e.playlistIds.size === 0) continue;
        const playlistCount = e.playlistIds.size;
        const new30Count = e.new30Ids.size;
        const score = Math.log(1 + playlistCount) * 1.0 + new30Count * 0.5;
        scored.push({
          slug: a.slug,
          name: a.name,
          image_url: a.image_url,
          playlistCount,
          new30Count,
          score,
        });
      }

      scored.sort((a, b) => b.score - a.score);
      return typeof limit === 'number' ? scored.slice(0, limit) : scored;
    },
    staleTime: 1000 * 60 * 30,
  });
}
