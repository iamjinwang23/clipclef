'use client';
// Design Ref: §5.1 — ArtistStrip: React Query 2-step
// Plan SC-04: staleTime 30분으로 세션 중 중복 호출 없음
// Plan SC-06: searchMbid는 클라이언트 직접 호출 (MusicBrainz IP 분산)

import { useQuery } from '@tanstack/react-query';
import ArtistCard from './ArtistCard';
import { searchMbid } from '@/lib/artist-apis';
import type { ArtistRow } from '@/features/artist/lib/artist.server';
import ScrollRail from '@/components/ui/ScrollRail';

interface ArtistStripProps {
  artists: { name: string; slug: string }[];
  locale: string;
  /** ScrollRail 그라데이션 색 — 부모 bg 와 일치해야 함 (기본 var(--background)). 패널은 var(--card) 전달 */
  fadeFrom?: string;
}

type ArtistResult = ArtistRow | { not_found: true };

const STALE_TIME = 30 * 60 * 1000; // 30분

/** 단일 아티스트 카드: MBID 조회 → 아티스트 데이터 조회 2-step */
function ArtistStripItem({
  name,
  slug,
  locale,
}: {
  name: string;
  slug: string;
  locale: string;
}) {
  // Step 1: MusicBrainz 클라이언트 직접 호출 → MBID
  const { data: mbid, isPending: mbidPending } = useQuery({
    queryKey: ['mbid', slug, name],
    queryFn: () => searchMbid(name),
    staleTime: STALE_TIME,
    retry: 1,
  });

  // Step 2: mbid 조회 완료 후 아티스트 데이터 요청 (null 포함 — not_found upsert 방지 목적 없음)
  const { data: artist, isPending: artistPending } = useQuery({
    queryKey: ['artist', slug, mbid],
    queryFn: async () => {
      const params = new URLSearchParams({ name });
      if (mbid) params.set('mbid', mbid);
      const res = await fetch(
        `/api/artists/${encodeURIComponent(slug)}?${params.toString()}`
      );
      return res.json() as Promise<ArtistResult>;
    },
    enabled: !mbidPending, // mbid 쿼리 완료 후 실행 (mbid가 null이어도 진행)
    staleTime: STALE_TIME,
    retry: 1,
  });

  // 로딩 중: 스켈레톤
  if (mbidPending || artistPending) {
    return (
      <div className="flex flex-col items-center gap-2 flex-shrink-0" style={{ width: 126 }}>
        <div className="rounded-full bg-[var(--muted)] animate-pulse" style={{ width: 126, height: 126 }} />
        <div className="w-12 h-3 rounded bg-[var(--muted)] animate-pulse" />
      </div>
    );
  }

  // not_found 또는 에러 → 미표시
  if (!artist || !('id' in artist)) return null;

  return (
    <ArtistCard
      name={artist.name}
      slug={artist.slug}
      imageUrl={artist.image_url}
      locale={locale}
      size={126}
    />
  );
}

export default function ArtistStrip({ artists, locale, fadeFrom }: ArtistStripProps) {
  if (artists.length === 0) return null;

  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
        아티스트
      </h2>
      <ScrollRail fadeFrom={fadeFrom}>
        {artists.map(({ name, slug }) => (
          <ArtistStripItem key={slug} name={name} slug={slug} locale={locale} />
        ))}
      </ScrollRail>
    </div>
  );
}
