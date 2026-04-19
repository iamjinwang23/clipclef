'use client';
// Design Ref: home-redesign.design.md §4.4 — 장르 목록 + 플리 개수 + 신규 개수 집계
// /api/genres 로 장르 메타 가져온 뒤, 클라 집계로 playlistCount·new30Count 계산

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export interface GenreWithStats {
  id: string;
  name: string;
  thumbnail_url: string | null;
  position: number;
  playlistCount: number;
  new30Count: number;
  score: number; // 정렬용: log(1+count)*1 + new30*0.5
}

const DAY_30_MS = 30 * 24 * 60 * 60 * 1000;

export function useGenres(limit?: number) {
  return useQuery<GenreWithStats[]>({
    queryKey: ['genres', limit ?? 'all'],
    queryFn: async () => {
      const supabase = createClient();

      // 장르 메타(API) + 전체 active 플리 병렬 조회
      const [genresRes, playlistsRes] = await Promise.all([
        fetch('/api/genres').then((r) => r.json()) as Promise<Array<{
          id: string; name: string; thumbnail_url: string | null; position: number;
        }>>,
        supabase
          .from('playlists')
          .select('genre, created_at')
          .eq('is_active', true),
      ]);

      const genres = Array.isArray(genresRes) ? genresRes : [];
      const playlists = (playlistsRes.data ?? []) as Array<{ genre: string[]; created_at: string }>;

      // 장르명별 집계
      const now = Date.now();
      const counts = new Map<string, { playlistCount: number; new30Count: number }>();
      for (const pl of playlists) {
        const isNew = now - new Date(pl.created_at).getTime() < DAY_30_MS;
        for (const g of pl.genre ?? []) {
          const prev = counts.get(g);
          if (prev) {
            prev.playlistCount += 1;
            if (isNew) prev.new30Count += 1;
          } else {
            counts.set(g, { playlistCount: 1, new30Count: isNew ? 1 : 0 });
          }
        }
      }

      const withStats: GenreWithStats[] = genres.map((g) => {
        const c = counts.get(g.name) ?? { playlistCount: 0, new30Count: 0 };
        const score = Math.log(1 + c.playlistCount) * 1.0 + c.new30Count * 0.5;
        return {
          ...g,
          playlistCount: c.playlistCount,
          new30Count: c.new30Count,
          score,
        };
      });

      // 플리가 1개 이상인 장르만 + 점수 내림차순
      const sorted = withStats
        .filter((g) => g.playlistCount > 0)
        .sort((a, b) => b.score - a.score);

      return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
    },
    staleTime: 1000 * 60 * 30,
  });
}
