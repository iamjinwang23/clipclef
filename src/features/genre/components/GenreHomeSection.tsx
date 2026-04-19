'use client';
// Design Ref: home-redesign.design.md §5.3.3 — 홈 장르 섹션
// Top N 앨범 레이어드 카드 수평 스크롤

import { useLocale } from 'next-intl';
import { useGenres } from '../hooks/useGenres';
import GenreCard from './GenreCard';

interface GenreHomeSectionProps {
  limit?: number;
}

function Skeletons({ count }: { count: number }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-3 flex-shrink-0 w-[136px] animate-pulse">
          <div className="w-32 h-32 rounded-md bg-[var(--muted)]" />
          <div className="h-3 w-20 bg-[var(--muted)] rounded" />
        </div>
      ))}
    </div>
  );
}

export default function GenreHomeSection({ limit = 8 }: GenreHomeSectionProps) {
  const locale = useLocale();
  const { data, isLoading } = useGenres(limit);

  if (isLoading) return <Skeletons count={limit} />;
  const genres = data ?? [];
  if (genres.length === 0) return null;

  return (
    <div className="flex gap-4 overflow-x-auto scrollbar-hide">
      {genres.map((g) => (
        <GenreCard
          key={g.id}
          name={g.name}
          thumbnailUrl={g.thumbnail_url}
          count={g.playlistCount}
          locale={locale}
          size={128}
        />
      ))}
    </div>
  );
}
