'use client';

// Design Ref: §4.1 — /me/library 데이터 통합 fetch
// Plan FR-07: 저장한 플리 + 내가 만든 user_playlists 통합 뷰

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Playlist, UserPlaylist } from '@/types';

export interface LibraryData {
  savedPlaylists: Playlist[];              // 기본 저장함(is_default)에 담긴 플리들
  userPlaylists: UserPlaylist[];           // 본인이 만든 user_playlists (발행/비발행 모두)
  publishedCount: number;                  // published_at IS NOT NULL 개수
}

export function useLibrary() {
  return useQuery<LibraryData>({
    queryKey: ['library'],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { savedPlaylists: [], userPlaylists: [], publishedCount: 0 };
      }

      // 본인 모든 user_playlists
      const { data: ups } = await supabase
        .from('user_playlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const userPlaylists = (ups ?? []) as UserPlaylist[];
      const publishedCount = userPlaylists.filter((up) => up.published_at !== null).length;

      // 기본 저장함(is_default=true)에 담긴 플리들 → 저장한 플리 목록
      const defaultList = userPlaylists.find((up) => up.is_default);
      let savedPlaylists: Playlist[] = [];
      if (defaultList) {
        const { data: items } = await supabase
          .from('user_playlist_items')
          .select('playlist_id, position, playlists(*)')
          .eq('user_playlist_id', defaultList.id)
          .order('position');
        savedPlaylists = ((items ?? []) as unknown as Array<{ playlists: Playlist | null }>)
          .map((r) => r.playlists)
          .filter((p): p is Playlist => p !== null);
      }

      return { savedPlaylists, userPlaylists, publishedCount };
    },
    staleTime: 30_000,
  });
}
