'use client';
// 채널 스토리 바 전용 — 채널 필터 없이 전체 플레이리스트 조회 (채널 목록 도출용)

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Playlist } from '@/types';

export function useAllPlaylists() {
  return useQuery<Playlist[]>({
    queryKey: ['playlists-all'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('playlists')
        .select('id, channel_id, channel_name, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Playlist[];
    },
    staleTime: 1000 * 60 * 5,
  });
}
