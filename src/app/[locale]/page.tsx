// Design Ref: home-redesign.design.md §5.2 — 홈 오케스트레이터
// M1: 큐레이션(배너) + 채널 섹션(HomeSection 래핑). 아티스트·장르·플리 섹션은 후속 모듈에서 추가.
// FilterBar + PlaylistGrid 는 M2에서 /playlists 로 이전 예정 (현재는 임시 유지).

import FilterBar from '@/features/filter/components/FilterBar';
import ChannelStoriesBar from '@/features/playlist/components/ChannelStoriesBar';
import PlaylistGrid from '@/features/playlist/components/PlaylistGrid';
import CuratedCollectionSection from '@/features/playlist/components/CuratedCollectionSection';
import HomeSection from '@/components/layout/HomeSection';

export default function HomePage() {
  return (
    <div>
      {/* 큐레이션 배너 — 섹션 레이블 없이 그대로 (배너 자체가 큐레이션 표현) */}
      <CuratedCollectionSection />

      {/* 채널 섹션 (홈: Top 10) — /channels 전체 페이지는 M3에서 신설 */}
      <HomeSection label="채널">
        <ChannelStoriesBar limit={10} />
      </HomeSection>

      {/* 플레이리스트 — 현재는 FilterBar + PlaylistGrid 임시 유지 (M2에서 /playlists로 이전) */}
      <FilterBar />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <PlaylistGrid />
      </div>
    </div>
  );
}
