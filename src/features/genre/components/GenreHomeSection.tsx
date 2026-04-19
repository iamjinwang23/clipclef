'use client';
// Design Ref: home-redesign.design.md §5.3.3 — 홈 장르 섹션
// 단일 렌더 + CSS 변수로 반응형 크기 제어 (mobile 128 / desktop 168)

import { useLocale } from 'next-intl';
import { useHomeFeed } from '@/features/home/hooks/useHomeFeed';
import GenreCard from './GenreCard';
import ScrollRail from '@/components/ui/ScrollRail';

interface GenreHomeSectionProps {
  limit?: number;
}

function Skeletons({ count }: { count: number }) {
  return (
    <div className="flex gap-4 overflow-hidden [--g-size:128px] sm:[--g-size:168px]">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 flex-shrink-0 animate-pulse"
          style={{ width: 'var(--g-size)' }}
        >
          <div
            className="rounded-lg sm:rounded-xl bg-[var(--muted)]"
            style={{ width: 'var(--g-size)', height: 'var(--g-size)' }}
          />
          <div className="h-3 w-20 bg-[var(--muted)] rounded" />
        </div>
      ))}
    </div>
  );
}

export default function GenreHomeSection({ limit = 8 }: GenreHomeSectionProps) {
  const locale = useLocale();
  const { data, isLoading } = useHomeFeed({ genres: limit });

  if (isLoading) return <Skeletons count={limit} />;
  const genres = data?.genres ?? [];
  if (genres.length === 0) return null;

  return (
    <ScrollRail className="[--g-size:128px] sm:[--g-size:168px]">
      {genres.map((g) => (
        <GenreCard
          key={g.id}
          name={g.name}
          thumbnailUrl={g.thumbnail_url}
          locale={locale}
        />
      ))}
    </ScrollRail>
  );
}
