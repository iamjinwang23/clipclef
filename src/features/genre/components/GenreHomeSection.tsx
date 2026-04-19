'use client';
// Design Ref: home-redesign.design.md §5.3.3 — 홈 장르 섹션
// 모바일 128 / 데스크톱 168 — 두 인스턴스를 responsive visibility로 전환

import { Fragment } from 'react';
import { useLocale } from 'next-intl';
import { useGenres } from '../hooks/useGenres';
import GenreCard from './GenreCard';
import ScrollRail from '@/components/ui/ScrollRail';

interface GenreHomeSectionProps {
  limit?: number;
  mobileSize?: number;
  desktopSize?: number;
}

function Skeletons({ count }: { count: number }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <Fragment key={i}>
          <div className="sm:hidden flex flex-col gap-2 flex-shrink-0 animate-pulse" style={{ width: 128 }}>
            <div className="rounded-lg bg-[var(--muted)]" style={{ width: 128, height: 128 }} />
            <div className="h-3 w-20 bg-[var(--muted)] rounded" />
          </div>
          <div className="hidden sm:flex flex-col gap-2 flex-shrink-0 animate-pulse" style={{ width: 168 }}>
            <div className="rounded-xl bg-[var(--muted)]" style={{ width: 168, height: 168 }} />
            <div className="h-3 w-20 bg-[var(--muted)] rounded" />
          </div>
        </Fragment>
      ))}
    </div>
  );
}

export default function GenreHomeSection({
  limit = 8,
  mobileSize = 128,
  desktopSize = 168,
}: GenreHomeSectionProps) {
  const locale = useLocale();
  const { data, isLoading } = useGenres(limit);

  if (isLoading) return <Skeletons count={limit} />;
  const genres = data ?? [];
  if (genres.length === 0) return null;

  return (
    <ScrollRail>
      {genres.map((g) => (
        <Fragment key={g.id}>
          {/* 모바일 */}
          <div className="sm:hidden flex-shrink-0">
            <GenreCard
              name={g.name}
              thumbnailUrl={g.thumbnail_url}
              count={g.playlistCount}
              locale={locale}
              size={mobileSize}
            />
          </div>
          {/* 데스크톱 */}
          <div className="hidden sm:block flex-shrink-0">
            <GenreCard
              name={g.name}
              thumbnailUrl={g.thumbnail_url}
              count={g.playlistCount}
              locale={locale}
              size={desktopSize}
            />
          </div>
        </Fragment>
      ))}
    </ScrollRail>
  );
}
