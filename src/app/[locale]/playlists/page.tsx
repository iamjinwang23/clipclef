// Design Ref: home-redesign.design.md §5.9 — 전체 플레이리스트 페이지
// 홈에서 이전된 FilterBar + PlaylistGrid (필터/소팅/무한스크롤). 홈에는 Top 12 요약 섹션만 남음.

import FilterBar from '@/features/filter/components/FilterBar';
import PlaylistGrid from '@/features/playlist/components/PlaylistGrid';

export default function PlaylistsPage() {
  return (
    <div>
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <h1 className="text-xl font-semibold leading-snug">플레이리스트</h1>
      </div>
      <FilterBar />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <PlaylistGrid />
      </div>
    </div>
  );
}
