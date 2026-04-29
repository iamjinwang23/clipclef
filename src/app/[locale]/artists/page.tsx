'use client';
// Design Ref: home-redesign.design.md §5.6 — 전체 아티스트 페이지
// ArtistCard 그리드. 정렬은 usePopularArtists 점수 순.

import { useLocale } from 'next-intl';
import { usePopularArtists } from '@/features/artist/hooks/usePopularArtists';
import ArtistCard from '@/features/artist/components/ArtistCard';

export default function ArtistsPage() {
  const locale = useLocale();
  const { data, isLoading } = usePopularArtists(); // 전체

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold leading-snug mb-6">아티스트</h1>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-[var(--subtle)]">불러오는 중…</p>
      ) : !data || data.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--subtle)]">등록된 아티스트가 없어요</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-4 gap-y-6">
          {data.map((a) => (
            <div key={a.slug} className="flex justify-center">
              <ArtistCard
                name={a.name}
                slug={a.slug}
                imageUrl={a.image_url}
                locale={locale}
                size={108}
                sizeMobile={96}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
