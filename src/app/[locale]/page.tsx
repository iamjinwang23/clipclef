// Design Ref: home-redesign.design.md §5.2 — 홈 오케스트레이터
// M2 기준: 큐레이션(배너) + 채널 섹션 + 플레이리스트 섹션.
// 필터/소팅/무한스크롤은 /playlists 로 이전 완료.
// 아티스트·장르 섹션은 M4·M5에서 추가.

import ChannelStoriesBar from '@/features/playlist/components/ChannelStoriesBar';
import CuratedCollectionSection from '@/features/playlist/components/CuratedCollectionSection';
import HomeSection from '@/components/layout/HomeSection';
import PlaylistHomeSection from '@/features/home/components/PlaylistHomeSection';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div>
      {/* 큐레이션 배너 — 섹션 레이블 없이 그대로 (배너 자체가 큐레이션 표현) */}
      <CuratedCollectionSection />

      {/* 채널 섹션 (홈: Top 10) — /channels 전체 페이지는 M3에서 신설 */}
      <HomeSection label="채널">
        <ChannelStoriesBar limit={10} />
      </HomeSection>

      {/* 플레이리스트 섹션 (홈: Top 12 인기순) — /playlists 에 필터·소팅·무한스크롤 */}
      <HomeSection label="플레이리스트" href={`/${locale}/playlists`}>
        <PlaylistHomeSection limit={12} />
      </HomeSection>
    </div>
  );
}
