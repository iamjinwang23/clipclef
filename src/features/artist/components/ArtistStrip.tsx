'use client';
// Design Ref: §5.2 — ArtistStrip: slug 배열 받아 /api/artists/[slug] 병렬 fetch
// 로딩 스켈레톤 → 결과 카드 렌더, not_found 카드 미표시

import { useEffect, useState } from 'react';
import ArtistCard from './ArtistCard';
import type { ArtistRow } from '@/features/artist/lib/artist.server';

interface ArtistStripProps {
  artists: { name: string; slug: string }[];
  locale: string;
}

type ArtistResult = (ArtistRow & { not_found?: false }) | { not_found: true };

export default function ArtistStrip({ artists, locale }: ArtistStripProps) {
  const [results, setResults] = useState<(ArtistRow | null)[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (artists.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    Promise.all(
      artists.map(({ name, slug }) =>
        fetch(`/api/artists/${encodeURIComponent(slug)}?name=${encodeURIComponent(name)}`)
          .then((r) => r.json() as Promise<ArtistResult>)
          .then((data) => ('not_found' in data && data.not_found ? null : (data as ArtistRow)))
          .catch(() => null)
      )
    ).then((data) => {
      if (!cancelled) {
        setResults(data);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [artists]);

  const visible = results.filter((r): r is ArtistRow => r !== null && !r.not_found);

  if (!loading && visible.length === 0) return null;

  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
        아티스트
      </h2>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {loading
          ? // 스켈레톤
            Array.from({ length: artists.length }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0 w-20">
                <div className="w-14 h-14 rounded-full bg-[var(--muted)] animate-pulse" />
                <div className="w-12 h-3 rounded bg-[var(--muted)] animate-pulse" />
              </div>
            ))
          : visible.map((artist) => (
              <ArtistCard
                key={artist.slug}
                name={artist.name}
                slug={artist.slug}
                imageUrl={artist.image_url}
                locale={locale}
              />
            ))}
      </div>
    </div>
  );
}
