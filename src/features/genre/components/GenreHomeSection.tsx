'use client';
// Design Ref: home-redesign.design.md §5.3.3 — 홈 장르 섹션
// Top N 앨범 레이어드 카드 수평 스크롤

import { useLocale } from 'next-intl';
import { useGenres } from '../hooks/useGenres';
import GenreCard from './GenreCard';

interface GenreHomeSectionProps {
  limit?: number;
  size?: number;
}

function Skeletons({ count, size }: { count: number; size: number }) {
  return (
    <div className="flex gap-[14px] overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 flex-shrink-0 animate-pulse" style={{ width: size }}>
          <div className="rounded-md bg-[var(--muted)]" style={{ width: size, height: size }} />
          <div className="h-3 w-20 bg-[var(--muted)] rounded" />
        </div>
      ))}
    </div>
  );
}

export default function GenreHomeSection({ limit = 8, size = 162 }: GenreHomeSectionProps) {
  const locale = useLocale();
  const { data, isLoading } = useGenres(limit);

  if (isLoading) return <Skeletons count={limit} size={size} />;
  const genres = data ?? [];
  if (genres.length === 0) return null;

  return (
    <div className="flex gap-[14px] overflow-x-auto scrollbar-hide py-1">
      {genres.map((g) => (
        <GenreCard
          key={g.id}
          name={g.name}
          thumbnailUrl={g.thumbnail_url}
          count={g.playlistCount}
          locale={locale}
          size={size}
        />
      ))}
    </div>
  );
}
