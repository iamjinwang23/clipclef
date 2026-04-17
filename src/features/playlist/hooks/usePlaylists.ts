'use client';
// Design Ref: §4.3 — Supabase 목록 쿼리 (필터 + 정렬 + 무한스크롤)
// Plan SC: 16개씩 offset 페이지네이션, 필터 변경 시 자동 리셋

import { useInfiniteQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useFilterStore } from '@/features/filter/store';
import type { Playlist } from '@/types';

const PAGE_SIZE = 16;

export function usePlaylists() {
  const { genre, mood, place, era, sort, channelId, query } = useFilterStore();

  return useInfiniteQuery<Playlist[]>({
    queryKey: ['playlists', { genre, mood, place, era, sort, channelId, query }],
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      // 마지막 페이지 결과가 PAGE_SIZE 미만이면 더 이상 없음
      if (lastPage.length < PAGE_SIZE) return undefined;
      return (lastPageParam as number) + 1;
    },
    queryFn: async ({ pageParam }) => {
      const supabase = createClient();
      const page = pageParam as number;
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const term = query.trim().replace(/[%_]/g, '\\$&');

      // 트랙 검색: 검색어가 있을 때 title/artist 매칭되는 playlist_id 수집
      let trackPlaylistIds: string[] = [];
      if (term) {
        const { data: trackMatches } = await supabase
          .from('tracks')
          .select('playlist_id')
          .or(`title.ilike.%${term}%,artist.ilike.%${term}%`);
        trackPlaylistIds = [...new Set((trackMatches ?? []).map((t) => t.playlist_id))];
      }

      let q = supabase
        .from('playlists')
        .select('*')
        .eq('is_active', true);

      if (channelId) q = q.eq('channel_id', channelId);
      if (genre.length > 0) q = q.overlaps('genre', genre);
      if (mood.length > 0) q = q.overlaps('mood', mood);
      if (place.length > 0) q = q.overlaps('place', place);
      if (era.length > 0) q = q.overlaps('era', era);

      if (term) {
        const titleFilter = `title.ilike.%${term}%,channel_name.ilike.%${term}%`;
        if (trackPlaylistIds.length > 0) {
          q = q.or(`${titleFilter},id.in.(${trackPlaylistIds.join(',')})`);
        } else {
          q = q.or(titleFilter);
        }
      }

      if (sort === 'latest') q = q.order('created_at', { ascending: false });
      else if (sort === 'likes') q = q.order('like_count', { ascending: false });
      else if (sort === 'views') q = q.order('view_count', { ascending: false });

      const { data, error } = await q.range(from, to);
      if (error) throw new Error(error.message);
      return (data ?? []) as Playlist[];
    },
    placeholderData: (prev) => prev, // Plan SC: 필터 변경 시 이전 데이터 유지하며 부드럽게 교체
  });
}
