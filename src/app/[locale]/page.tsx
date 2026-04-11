// Design Ref: §5.1 — 홈 목록 페이지 (Server Component shell + Client 필터/그리드)
// Plan SC: 홈(목록) → 상세 전체 유저 플로우

import FilterBar from '@/features/filter/components/FilterBar';
import ChannelStoriesBar from '@/features/playlist/components/ChannelStoriesBar';
import PlaylistGrid from '@/features/playlist/components/PlaylistGrid';
import CuratedCollectionSection from '@/features/playlist/components/CuratedCollectionSection';

export default function HomePage() {
  return (
    <div>
      <CuratedCollectionSection />
      <ChannelStoriesBar />
      <FilterBar />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <PlaylistGrid />
      </div>
    </div>
  );
}
