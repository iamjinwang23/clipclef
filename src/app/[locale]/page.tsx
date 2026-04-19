// Design Ref: home-redesign.design.md §5.2 — 홈 오케스트레이터
// 섹션 순서: 큐레이션 배너 → 장르 → 채널 → 플레이리스트 → 아티스트

import ChannelStoriesBar from '@/features/playlist/components/ChannelStoriesBar';
import CuratedCollectionSection from '@/features/playlist/components/CuratedCollectionSection';
import HomeSection from '@/components/layout/HomeSection';
import ArtistHomeSection from '@/features/home/components/ArtistHomeSection';
import GenreHomeSection from '@/features/genre/components/GenreHomeSection';
import PlaylistHomeSection from '@/features/home/components/PlaylistHomeSection';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div>
      {/* 큐레이션 배너 — 섹션 레이블 없이 그대로 */}
      <CuratedCollectionSection />

      {/* 장르 */}
      <HomeSection label="장르" href={`/${locale}/genres`}>
        <GenreHomeSection limit={8} />
      </HomeSection>

      {/* 채널 */}
      <HomeSection label="채널" href={`/${locale}/channels`}>
        <ChannelStoriesBar limit={10} />
      </HomeSection>

      {/* 플레이리스트 */}
      <HomeSection label="플레이리스트" href={`/${locale}/playlists`}>
        <PlaylistHomeSection limit={12} />
      </HomeSection>

      {/* 아티스트 */}
      <HomeSection label="아티스트" href={`/${locale}/artists`}>
        <ArtistHomeSection limit={8} />
      </HomeSection>
    </div>
  );
}
