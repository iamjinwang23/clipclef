'use client';
// Design Ref: home-redesign.design.md §5.3.4 — 홈 플리 섹션
// useHomeFeed 의 playlists 슬라이스만 사용. 같은 RPC 결과를 다른 섹션들과 공유.

import { useHomeFeed } from '@/features/home/hooks/useHomeFeed';
import PlaylistCard from '@/features/playlist/components/PlaylistCard';

interface PlaylistHomeSectionProps {
  limit?: number;
}

const GRID_CLASS = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';

function SkeletonCards({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-video rounded-md sm:rounded-xl bg-[var(--muted)] mb-2" />
          <div className="h-3.5 bg-[var(--muted)] rounded w-full mb-1.5" />
          <div className="h-3.5 bg-[var(--muted)] rounded w-4/5" />
        </div>
      ))}
    </>
  );
}

export default function PlaylistHomeSection({ limit = 12 }: PlaylistHomeSectionProps) {
  const { data, isLoading } = useHomeFeed({ playlists: limit });

  if (isLoading) {
    return (
      <div className={GRID_CLASS}>
        <SkeletonCards count={limit} />
      </div>
    );
  }

  const playlists = data?.playlists ?? [];
  if (playlists.length === 0) return null;

  return (
    <div className={GRID_CLASS}>
      {playlists.map((p) => (
        <PlaylistCard key={p.id} playlist={p} />
      ))}
    </div>
  );
}
