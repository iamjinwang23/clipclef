'use client';
// Design Ref: home-redesign.design.md §5.3.4 — 홈 플리 섹션
// 인기순 Top N 그리드. 필터/소팅 없음 (전용 조작은 /playlists 로)

import { usePopularPlaylists } from '@/features/playlist/hooks/usePopularPlaylists';
import PlaylistCard from '@/features/playlist/components/PlaylistCard';

interface PlaylistHomeSectionProps {
  limit?: number;
}

const GRID_CLASS = 'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';

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
  const { data, isLoading } = usePopularPlaylists(limit);

  if (isLoading) {
    return (
      <div className={GRID_CLASS}>
        <SkeletonCards count={limit} />
      </div>
    );
  }

  const playlists = data ?? [];
  if (playlists.length === 0) {
    // 빈 섹션 숨김 — 부모에서 length 체크도 가능하지만 방어적으로 null 반환
    return null;
  }

  return (
    <div className={GRID_CLASS}>
      {playlists.map((p) => (
        <PlaylistCard key={p.id} playlist={p} />
      ))}
    </div>
  );
}
