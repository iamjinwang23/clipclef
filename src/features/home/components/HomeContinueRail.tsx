'use client';

// Design Ref: §5.1 — 홈 § 1 이어듣기 (최근 5 FIFO 큐)
// Plan FR-11: listens 기반 최근 5개 플리, 순서대로
// 조건: 로그인 + listens.length > 0 — 외부에서 렌더 여부 판단

import { useQuery } from '@tanstack/react-query';
import type { Playlist } from '@/types';
import ScrollRail from '@/components/ui/ScrollRail';
import PlaylistCard from '@/features/playlist/components/PlaylistCard';

interface RecentItem {
  playlist_id: string;
  last_played_at: string;
  playlist: Playlist;
}

function Skeletons() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="w-[220px] flex-shrink-0 animate-pulse">
          <div className="aspect-video rounded-md sm:rounded-xl bg-[var(--muted)] mb-2" />
          <div className="h-3.5 bg-[var(--muted)] rounded w-4/5 mb-1.5" />
          <div className="h-3 bg-[var(--muted)] rounded w-3/5" />
        </div>
      ))}
    </div>
  );
}

export default function HomeContinueRail() {
  const { data, isLoading } = useQuery<RecentItem[]>({
    queryKey: ['listens', 'recent'],
    queryFn: async () => {
      const res = await fetch('/api/listens/recent?limit=5');
      if (!res.ok) {
        // 401 (비로그인) 시 빈 배열 반환 — 외부에서 섹션 숨김 판단
        return [];
      }
      const json = await res.json();
      return (json.data ?? []) as RecentItem[];
    },
    staleTime: 30_000,
  });

  if (isLoading) return <Skeletons />;
  if (!data || data.length === 0) return null;

  return (
    <ScrollRail>
      {data.map((item) => (
        <div key={item.playlist_id} className="w-[220px] flex-shrink-0">
          <PlaylistCard playlist={item.playlist} />
        </div>
      ))}
    </ScrollRail>
  );
}
