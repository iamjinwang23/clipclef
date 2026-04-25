'use client';
// Design Ref: §5.1 — 홈 § 4 전체 플레이리스트
// v2 통일: 220px ScrollRail (다른 홈 섹션과 동일 시각 리듬)
// 홈은 Top 12 샘플, /playlists 더보기는 grid + 필터/무한스크롤

import { useHomeFeed } from '@/features/home/hooks/useHomeFeed';
import PlaylistCard from '@/features/playlist/components/PlaylistCard';
import ScrollRail from '@/components/ui/ScrollRail';

interface PlaylistHomeSectionProps {
  limit?: number;
}

function Skeletons({ count }: { count: number }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-[220px] flex-shrink-0 animate-pulse">
          <div className="aspect-video rounded-md sm:rounded-xl bg-[var(--muted)] mb-2" />
          <div className="h-3.5 bg-[var(--muted)] rounded w-4/5 mb-1.5" />
          <div className="h-3.5 bg-[var(--muted)] rounded w-3/5" />
        </div>
      ))}
    </div>
  );
}

export default function PlaylistHomeSection({ limit = 12 }: PlaylistHomeSectionProps) {
  const { data, isLoading } = useHomeFeed({ playlists: limit });

  if (isLoading) return <Skeletons count={6} />;

  const playlists = data?.playlists ?? [];
  if (playlists.length === 0) return null;

  return (
    <ScrollRail>
      {playlists.map((p) => (
        <div key={p.id} className="w-[220px] flex-shrink-0">
          <PlaylistCard playlist={p} />
        </div>
      ))}
    </ScrollRail>
  );
}
