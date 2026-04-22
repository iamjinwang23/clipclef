'use client';

// Design Ref: §5.1 — 홈 § 3 팔로우 큐레이터
// 데이터: follows(follower_id=me) → following profiles → 그들이 업로드한 최근 플리
// 조건: 로그인 + 팔로우 ≥ 1 — 외부에서 렌더 여부 판단 (이 컴포넌트는 자체 null 반환)

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Playlist } from '@/types';
import ScrollRail from '@/components/ui/ScrollRail';
import PlaylistCard from '@/features/playlist/components/PlaylistCard';

function Skeletons() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="w-[220px] flex-shrink-0 animate-pulse">
          <div className="aspect-video rounded-md sm:rounded-xl bg-[var(--muted)] mb-2" />
          <div className="h-3.5 bg-[var(--muted)] rounded w-4/5 mb-1.5" />
          <div className="h-3 bg-[var(--muted)] rounded w-3/5" />
        </div>
      ))}
    </div>
  );
}

export default function FollowedCuratorsSection() {
  const { data, isLoading } = useQuery<Playlist[]>({
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

      // 2) 그들이 업로드한 최근 활성 플리 Top 12
      const { data: playlists } = await supabase
        .from('playlists')
        .select('*')
        .in('uploaded_by', followingIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(12);
      return (playlists ?? []) as Playlist[];
    },
    staleTime: 60_000,
  });

  if (isLoading) return <Skeletons />;
  if (!data || data.length === 0) return null;

  return (
    <ScrollRail>
      {data.map((p) => (
        <div key={p.id} className="w-[220px] flex-shrink-0">
          <PlaylistCard playlist={p} />
        </div>
      ))}
    </ScrollRail>
  );
}
