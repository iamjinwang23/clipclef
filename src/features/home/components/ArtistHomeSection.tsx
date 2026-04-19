'use client';
// Design Ref: home-redesign.design.md §5.3.2 — 홈 아티스트 섹션
// 96px 원형 카드 수평 스크롤, Top N

import { useLocale } from 'next-intl';
import { usePopularArtists } from '@/features/artist/hooks/usePopularArtists';
import ArtistCard from '@/features/artist/components/ArtistCard';

interface ArtistHomeSectionProps {
  limit?: number;
  size?: number;
}

function Skeletons({ count, size }: { count: number; size: number }) {
  return (
    <div className="flex gap-[14px] overflow-hidden">
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
  const { data, isLoading } = usePopularArtists(limit);

  if (isLoading) return <Skeletons count={limit} size={size} />;

  const artists = data ?? [];
  if (artists.length === 0) return null;

  return (
    <div className="flex gap-[14px] overflow-x-auto scrollbar-hide py-1">
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
    </div>
  );
}
