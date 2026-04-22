// Design Ref: §5.1 — v2 홈 5섹션 재구성
// 순서: (hero 유지) → § 1 이어듣기 → § 2 에디토리얼·컬렉션 → § 3 팔로우 큐레이터 → § 4 전체 피드 → § 5 장르·아티스트 탐색
// § 1, § 3는 조건부 렌더 (로그인 + 데이터 있을 때만 — 컴포넌트 내부에서 null 반환)

import { createClient } from '@/lib/supabase/server';
import CuratedCollectionSection from '@/features/playlist/components/CuratedCollectionSection';
import HomeSection from '@/components/layout/HomeSection';
import HomeContinueRail from '@/features/home/components/HomeContinueRail';
import FollowedCuratorsSection from '@/features/home/components/FollowedCuratorsSection';
import MixedShelf from '@/features/curation/components/MixedShelf';
import PlaylistHomeSection from '@/features/home/components/PlaylistHomeSection';
import GenreHomeSection from '@/features/genre/components/GenreHomeSection';
import ArtistHomeSection from '@/features/home/components/ArtistHomeSection';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // 로그인 여부만 서버에서 판별 — 로그인한 유저에게만 § 1, § 3 렌더 시도
  // (실제 데이터 유무는 각 컴포넌트 클라이언트 쿼리로 판단, 비어 있으면 null)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return (
    <div>
      {/* Hero 배너 — 레이블 없이 유지 (v1.1 유지) */}
      <CuratedCollectionSection />

      {/* § 1 이어듣기 — 로그인 + listens 있을 때만 자체 렌더 */}
      {/* "더 보기" 없음: listens는 저장이 아닌 최근 재생 큐라 별도 페이지 없음 */}
      {isLoggedIn && (
        <HomeSection label="이어듣기">
          <HomeContinueRail />
        </HomeSection>
      )}

      {/* § 2 에디토리얼·컬렉션 (관리자 + 유저 발행 혼합) */}
      <HomeSection label="에디토리얼·컬렉션">
        <MixedShelf limit={12} />
      </HomeSection>

      {/* § 3 팔로우 큐레이터 — 로그인 + 팔로우 있을 때만 자체 렌더 */}
      {isLoggedIn && (
        <HomeSection label="팔로우 큐레이터">
          <FollowedCuratorsSection />
        </HomeSection>
      )}

      {/* § 4 전체 피드 */}
      <HomeSection label="전체 피드" href={`/${locale}/playlists`}>
        <PlaylistHomeSection limit={12} />
      </HomeSection>

      {/* § 5 장르·아티스트 탐색 — 2 sub-rail */}
      <section className="max-w-6xl mx-auto px-4 mt-6">
        <h2 className="text-xl font-bold leading-snug text-[var(--foreground)] mb-4">
          장르·아티스트 탐색
        </h2>

        <div className="mb-6">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              장르
            </h3>
            <a
              href={`/${locale}/genres`}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
            >
              더 보기
            </a>
          </div>
          <GenreHomeSection limit={8} />
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              아티스트
            </h3>
            <a
              href={`/${locale}/artists`}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
            >
              더 보기
            </a>
          </div>
          <ArtistHomeSection limit={8} size={126} />
        </div>
      </section>
    </div>
  );
}
