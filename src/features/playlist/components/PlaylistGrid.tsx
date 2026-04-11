'use client';
// Design Ref: §5.4 — 카드 그리드 (4열/데스크톱, 2열/태블릿, 1열/모바일)
// Plan SC: 목록 페이지 전체 플로우 동작

import { useTranslations } from 'next-intl';
import { usePlaylists } from '../hooks/usePlaylists';
import PlaylistCard from './PlaylistCard';
import { useFilterStore } from '@/features/filter/store';

export default function PlaylistGrid() {
  const t = useTranslations('playlist');
  const tFilter = useTranslations('filter');
  const { data: playlists, isLoading, error } = usePlaylists();
  const { reset } = useFilterStore();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-[var(--muted)] rounded-lg aspect-[4/5] animate-pulse" />
        ))}
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

  if (!playlists || playlists.length === 0) {
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {playlists.map((playlist) => (
        <PlaylistCard key={playlist.id} playlist={playlist} />
      ))}
    </div>
  );
}
