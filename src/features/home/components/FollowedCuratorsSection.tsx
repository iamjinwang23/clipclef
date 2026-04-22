'use client';

// Design Ref: §5.1 — 홈 § 3 팔로우 큐레이터
// 데이터: follows(follower_id=me) → 그들이 업로드한 최근 플리 + uploader 프로필 join
// 조건: 로그인 + 팔로우 ≥ 1 — 외부에서 로그인 판단, 데이터 0건이면 null

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Playlist } from '@/types';
import ScrollRail from '@/components/ui/ScrollRail';
import UploaderPlaylistCard from './UploaderPlaylistCard';

interface CuratorPlaylistItem {
  playlist: Playlist;
  uploader: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

function Skeletons() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="w-[220px] flex-shrink-0 animate-pulse">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-5 h-5 rounded-full bg-[var(--muted)]" />
            <div className="h-3 w-20 bg-[var(--muted)] rounded" />
          </div>
          <div className="aspect-video rounded-md sm:rounded-xl bg-[var(--muted)] mb-2" />
          <div className="h-3.5 bg-[var(--muted)] rounded w-4/5 mb-1.5" />
          <div className="h-3.5 bg-[var(--muted)] rounded w-3/5" />
        </div>
      ))}
    </div>
  );
}

export default function FollowedCuratorsSection() {
  const { data, isLoading } = useQuery<CuratorPlaylistItem[]>({
    queryKey: ['home', 'followed-curators'],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // 1) 팔로우 중인 유저 id 목록
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      const followingIds = (follows ?? []).map((r) => r.following_id as string);
      if (followingIds.length === 0) return [];

      // 2) 그들이 업로드한 최근 활성 플리 Top 12 + 업로더 프로필 join
      const { data: rows } = await supabase
        .from('playlists')
        .select('*, uploader:profiles!uploaded_by(id, display_name, avatar_url, is_verified)')
        .in('uploaded_by', followingIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(12);

      type Row = Playlist & {
        uploader: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          is_verified: boolean;
        } | null;
      };

      return ((rows ?? []) as unknown as Row[])
        .filter((r) => r.uploader !== null)
        .map((r) => ({
          playlist: r as Playlist,
          uploader: r.uploader as CuratorPlaylistItem['uploader'],
        }));
    },
    staleTime: 60_000,
  });

  if (isLoading) return <Skeletons />;
  if (!data || data.length === 0) return null;

  return (
    <ScrollRail>
      {data.map(({ playlist, uploader }) => (
        <UploaderPlaylistCard key={playlist.id} playlist={playlist} uploader={uploader} />
      ))}
    </ScrollRail>
  );
}
