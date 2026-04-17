'use client';
// Design Ref: §5.4 — 카드 그리드 (4열/데스크톱, 2열/태블릿, 1열/모바일)
// Plan SC: 무한스크롤 — Intersection Observer sentinel으로 자동 추가 로드

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { usePlaylists } from '../hooks/usePlaylists';
import PlaylistCard from './PlaylistCard';
import { useFilterStore } from '@/features/filter/store';

const GRID_CLASS = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';

function SkeletonCards({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-[var(--card)] rounded-xl overflow-hidden animate-pulse">
          <div className="aspect-video bg-[var(--muted)]" />
          <div className="p-4 space-y-2">
            <div className="h-4 bg-[var(--muted)] rounded w-full" />
            <div className="h-4 bg-[var(--muted)] rounded w-3/4" />
            <div className="flex items-center gap-1.5 pt-0.5">
              <div className="w-4 h-4 rounded-full bg-[var(--muted)] flex-shrink-0" />
              <div className="h-3 bg-[var(--muted)] rounded w-1/3" />
            </div>
            <div className="flex gap-1 pt-0.5">
              <div className="h-5 w-10 bg-[var(--muted)] rounded" />
              <div className="h-5 w-12 bg-[var(--muted)] rounded" />
            </div>
            <div className="h-3 bg-[var(--muted)] rounded w-8" />
          </div>
        </div>
      ))}
    </>
  );
}

export default function PlaylistGrid() {
  const t = useTranslations('playlist');
  const tFilter = useTranslations('filter');
  const { reset } = useFilterStore();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePlaylists();

  // Plan SC: 스크롤 하단 자동감지 → 다음 페이지 로드
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className={GRID_CLASS}>
        <SkeletonCards count={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center text-[var(--text-secondary)]">
        <p className="text-sm">오류가 발생했습니다.</p>
      </div>
    );
  }

  // 모든 페이지 데이터 평탄화
  const playlists = data?.pages.flat() ?? [];

  if (playlists.length === 0) {
    return (
      <div className="py-16 text-center text-[var(--text-secondary)]">
        <p className="text-sm mb-2">{t('noResults')}</p>
        <p className="text-xs mb-4">{t('noResultsHint')}</p>
        <button
          onClick={reset}
          className="text-xs underline hover:text-[var(--foreground)]"
        >
          {tFilter('reset')}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={GRID_CLASS}>
        {playlists.map((playlist) => (
          <PlaylistCard key={playlist.id} playlist={playlist} />
        ))}
        {isFetchingNextPage && <SkeletonCards count={4} />}
      </div>
      {/* Intersection Observer 감지 대상 — hasNextPage 없으면 렌더링 안 함 */}
      {hasNextPage && <div ref={sentinelRef} className="h-1" />}
    </>
  );
}
