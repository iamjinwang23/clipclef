'use client';
// Design Ref: §4.3 — Supabase 목록 쿼리 (필터 + 정렬)

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useFilterStore } from '@/features/filter/store';
import type { Playlist } from '@/types';

export function usePlaylists() {
  const { genre, mood, place, era, sort, channelId, query } = useFilterStore();

  return useQuery<Playlist[]>({
    queryKey: ['playlists', { genre, mood, place, era, sort, channelId, query }],
    queryFn: async () => {
      const supabase = createClient();
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
        // 플리 제목/채널명 OR 트랙 제목/아티스트 매칭
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

      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data as Playlist[];
    },
  });
}
