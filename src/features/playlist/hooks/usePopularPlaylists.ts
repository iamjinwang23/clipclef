'use client';
// Design Ref: home-redesign.design.md §5.3.4 — 홈 플리 섹션 전용 Top N 조회
// 필터/소팅 적용 없이 is_active=true 중 like_count desc 순으로 limit 만큼 반환

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Playlist } from '@/types';

export function usePopularPlaylists(limit: number = 12) {
  return useQuery<Playlist[]>({
    queryKey: ['playlists-popular', limit],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('is_active', true)
        .order('like_count', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Playlist[];
    },
    staleTime: 1000 * 60 * 5,
  });
}
