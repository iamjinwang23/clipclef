'use client';

// Design Ref: §5.1 — 플리 상세 페이지의 대형 플레이어 슬롯
// M2 part 2: aspect-video 플레이스홀더 + view 전환만. iframe 실제 위치 동기화는 M4에서 연결.
// Plan SC: R1 — 이 컴포넌트 언마운트 시 iframe 파괴 금지 (PersistentPlayer가 소유)

import { useEffect } from 'react';
import { usePlayerStore, type PlayerView } from '../store';

interface ExpandedViewProps {
  /** 상세 페이지 진입 시 자동으로 expanded 전환 여부 (기본 true) */
  autoExpand?: boolean;
  /** 언마운트 시 복귀할 view (기본 mini) */
  exitView?: PlayerView;
}

export default function ExpandedView({
  autoExpand = true,
  exitView = 'mini',
}: ExpandedViewProps) {
  const view = usePlayerStore((s) => s.view);
  const playlistId = usePlayerStore((s) => s.playlistId);
  const setView = usePlayerStore((s) => s.setView);

  // playlistId 변화 감지 — 플리 로드되면 expanded, 언로드되면 복귀
  // 페이지 마운트 타이밍과 PlaylistPlayer의 load() 타이밍이 엇갈려도 deps로 정상 동기화
  useEffect(() => {
    if (!autoExpand) return;
    if (playlistId) setView('expanded');

    return () => {
      const currentView = usePlayerStore.getState().view;
      if (currentView !== 'hidden') setView(exitView);
    };
  }, [autoExpand, exitView, setView, playlistId]);

  // 슬롯은 항상 aspect-video로 공간 예약 — 페이지 레이아웃 점프 방지.
  // iframe은 PersistentPlayer가 fixed top 위치에 렌더. ExpandedView는 스크롤되지만
  // iframe은 고정 (YouTube Music mobile 패턴). 스크롤 이탈 시 iframe만 top에 남음.
  return (
    <div
      className="relative w-[calc(100%+2rem)] sm:w-full aspect-video bg-black rounded-none sm:rounded-lg overflow-hidden -mx-4 sm:mx-0"
      data-player-slot={playlistId ?? ''}
      data-view={view}
      aria-hidden="true"
    />
  );
}
