'use client';
// Design Ref: home-redesign.design.md §5.3.2 — 홈 아티스트 섹션
// useHomeFeed 의 artists 슬라이스만 사용. 더 이상 tracks 테이블을 클라이언트에서 스캔하지 않음.

import { useLocale } from 'next-intl';
import { useHomeFeed } from '@/features/home/hooks/useHomeFeed';
import ArtistCard from '@/features/artist/components/ArtistCard';
import ScrollRail from '@/components/ui/ScrollRail';

interface ArtistHomeSectionProps {
  limit?: number;
  size?: number;
}

function Skeletons({ count, size }: { count: number; size: number }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0 animate-pulse" style={{ width: size }}>
          <div className="rounded-full bg-[var(--muted)]" style={{ width: size, height: size }} />
          <div className="h-3 w-16 bg-[var(--muted)] rounded" />
        </div>
      ))}
    </div>
  );
}

export default function ArtistHomeSection({ limit = 8, size = 162 }: ArtistHomeSectionProps) {
  const locale = useLocale();
  const { data, isLoading } = useHomeFeed({ artists: limit });

  if (isLoading) return <Skeletons count={limit} size={size} />;

  const artists = data?.artists ?? [];
  if (artists.length === 0) return null;

  return (
    <ScrollRail>
      {artists.map((a) => (
        <ArtistCard
          key={a.slug}
          name={a.name}
          slug={a.slug}
          imageUrl={a.image_url}
          locale={locale}
          size={size}
        />
      ))}
    </ScrollRail>
  );
}
