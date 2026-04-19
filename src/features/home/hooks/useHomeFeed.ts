'use client';
// Design Ref: perf-iter-1 — 홈 섹션 4종을 한 번의 Supabase RPC 호출로 대체
// 클라이언트 집계(useGenres/useChannelStories+useAllPlaylists/usePopularArtists/usePopularPlaylists)
// 제거. 같은 queryKey를 가진 useQuery는 React Query가 자동 dedupe.

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export interface HomeGenre {
  id: string;
  name: string;
  thumbnail_url: string | null;
  position: number;
  playlist_count: number;
  new30_count: number;
  score: number;
}

export interface HomeChannel {
  channel_id: string;
  channel_name: string;
  playlist_count: number;
  score: number;
}

export interface HomeArtist {
  slug: string;
  name: string;
  image_url: string | null;
  playlist_count: number;
  new30_count: number;
  score: number;
}

export interface HomePlaylist {
  id: string;
  title: string;
  thumbnail_url: string;
  channel_id: string;
  channel_name: string;
  editor_note: string | null;
  is_ai: boolean;
  like_count: number;
  comment_count: number;
  created_at: string;
}

export interface HomeFeed {
  genres: HomeGenre[];
  channels: HomeChannel[];
  artists: HomeArtist[];
  playlists: HomePlaylist[];
}

export interface HomeFeedLimits {
  genres?: number;
  channels?: number;
  artists?: number;
  playlists?: number;
}

const DEFAULTS: Required<HomeFeedLimits> = {
  genres: 8,
  channels: 10,
  artists: 8,
  playlists: 12,
};

export function useHomeFeed(limits: HomeFeedLimits = {}) {
  const merged = { ...DEFAULTS, ...limits };
  return useQuery<HomeFeed>({
    queryKey: ['home-feed', merged],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('home_feed', {
        p_limit_genres: merged.genres,
        p_limit_channels: merged.channels,
        p_limit_artists: merged.artists,
        p_limit_playlists: merged.playlists,
      });
      if (error) throw error;
      return (data ?? { genres: [], channels: [], artists: [], playlists: [] }) as HomeFeed;
    },
    staleTime: 1000 * 60 * 5,
  });
}
