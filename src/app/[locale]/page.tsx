// Design Ref: §5.1 — v2 홈 5섹션 재구성
// 순서: (hero 유지) → § 1 이어듣기 → § 2 큐레이션 → § 3 팔로우 큐레이터 → § 4 전체 플레이리스트 → § 5 장르·아티스트 탐색
// § 1, § 3는 서버에서 존재 여부 확인 후 조건부 렌더 — 데이터 없으면 레이블도 제거.
// (이전엔 inner 컴포넌트가 null 반환해도 HomeSection 의 label 은 노출돼 빈 섹션처럼 보임)

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

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  // § 1 이어듣기 / § 3 팔로우 큐레이터 는 데이터 0건일 때 섹션 자체를 숨김.
  // 단일 행 존재 체크 (limit 1) — 인덱스 hit 으로 비용 무시.
  let hasListens = false;
  let hasFollows = false;
  if (isLoggedIn && user) {
    const [listensRes, followsRes] = await Promise.all([
      supabase.from('listens').select('id').eq('user_id', user.id).limit(1),
      supabase.from('follows').select('follower_id').eq('follower_id', user.id).limit(1),
    ]);
    hasListens = (listensRes.data ?? []).length > 0;
    hasFollows = (followsRes.data ?? []).length > 0;
  }

  return (
    <div>
      {/* Hero 배너 — 레이블 없이 유지 (v1.1 유지) */}
      <CuratedCollectionSection />

      {/* § 1 이어듣기 — 로그인 + listens 있을 때만 렌더 */}
      {/* "더 보기" 없음: listens는 저장이 아닌 최근 재생 큐라 별도 페이지 없음 */}
      {isLoggedIn && hasListens && (
        <HomeSection label="이어듣기">
          <HomeContinueRail />
        </HomeSection>
      )}

      {/* § 2 큐레이션 (관리자 + 유저 발행 혼합) */}
      <HomeSection label="큐레이션">
        <MixedShelf limit={12} />
      </HomeSection>

      {/* § 3 팔로우 큐레이터 — 로그인 + 팔로우 있을 때만 렌더 */}
      {isLoggedIn && hasFollows && (
        <HomeSection label="팔로우 큐레이터">
          <FollowedCuratorsSection />
        </HomeSection>
      )}

      {/* § 4 전체 플레이리스트 */}
      <HomeSection label="전체 플레이리스트" href={`/${locale}/playlists`}>
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
