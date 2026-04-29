'use client';
// Design Ref: home-redesign.design.md §5.7 — 전체 장르 페이지
// 앨범 레이어드 카드 그리드. 정렬은 useGenres 점수 순.

import { useLocale } from 'next-intl';
import { useGenres } from '@/features/genre/hooks/useGenres';
import GenreCard from '@/features/genre/components/GenreCard';

export default function GenresPage() {
  const locale = useLocale();
  const { data, isLoading } = useGenres(); // 전체 (플리 0인 장르는 훅이 제외)

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold leading-snug mb-6">장르</h1>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-[var(--subtle)]">불러오는 중…</p>
      ) : !data || data.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--subtle)]">등록된 장르가 없어요</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4 gap-y-6">
          {data.map((g) => (
            <div key={g.id} className="flex justify-center">
              <GenreCard
                name={g.name}
                thumbnailUrl={g.thumbnail_url}
                locale={locale}
                size={140}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
