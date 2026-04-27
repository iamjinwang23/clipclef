'use client';

// Design Ref: §5.1 — 플리 상세 페이지의 대형 플레이어 슬롯
// v2 fix: iframe이 이 슬롯의 viewport-relative 좌표를 따라다님.
// 슬롯이 뷰포트를 벗어나면 view='mini'로 전환되어 MiniBar + 오디오만.
// Plan SC: R1 — iframe은 PersistentPlayer가 소유. 이 컴포넌트는 위치만 보고.

import { useEffect, useRef } from 'react';
import { usePlayerStore, type PlayerView } from '../store';

interface ExpandedViewProps {
  /** 마운트 시 expanded로 전환할지 (기본 true) */
  autoExpand?: boolean;
  /** 언마운트 시 복귀할 view (기본 mini) */
  exitView?: PlayerView;
}

export default function ExpandedView({
  autoExpand = true,
  exitView = 'mini',
}: ExpandedViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const playlistId = usePlayerStore((s) => s.playlistId);

  const panelActive = usePlayerStore((s) => s.panelActive);

  useEffect(() => {
    const el = ref.current;
    if (!el || !autoExpand) return;
    // Phase 2: RightNowPlayingPanel 이 마운트된 경우 (데스크톱) 패널이 슬롯을 차지.
    // in-page ExpandedView 는 슬롯 등록을 건너뛰어 iframe 좌표 충돌 방지.
    if (panelActive) return;

    let raf: number | null = null;

    const measure = () => {
      const r = el.getBoundingClientRect();
      usePlayerStore.getState().setExpandedRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });
    };

    const scheduleMeasure = () => {
      if (raf != null) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        measure();
      });
    };

    // 뷰포트 교차 감지 — 슬롯 보이면 expanded, 벗어나면 mini
    const io = new IntersectionObserver(
      ([entry]) => {
        const current = usePlayerStore.getState().view;
        if (current === 'hidden') return; // 플리 미로드 시 hidden 유지
        if (entry.isIntersecting) {
          usePlayerStore.getState().setView('expanded');
          measure();
        } else {
          usePlayerStore.getState().setView('mini');
        }
      },
      { threshold: 0.1 }
    );
    io.observe(el);

    // 크기 변화 (창 리사이즈, 레이아웃 shift)
    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(el);

    // 스크롤/리사이즈 — rAF 스로틀
    window.addEventListener('scroll', scheduleMeasure, { passive: true });
    window.addEventListener('resize', scheduleMeasure);

    // 초기 측정
    scheduleMeasure();

    return () => {
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('scroll', scheduleMeasure);
      window.removeEventListener('resize', scheduleMeasure);
      if (raf != null) cancelAnimationFrame(raf);

      // 페이지 이탈 — mini 또는 지정 view로 복귀 (hidden은 건드리지 않음)
      const state = usePlayerStore.getState();
      if (state.view !== 'hidden') state.setView(exitView);
      state.setExpandedRect(null);
    };
    // playlistId 변화 시 재측정 — 같은 컴포넌트지만 다른 플리 로드됐을 때
    // panelActive 변화 시 effect 재실행 — 패널 마운트/언마운트에 반응
  }, [autoExpand, exitView, playlistId, panelActive]);

  // 슬롯은 항상 aspect-video 공간 예약. 배경 투명 — iframe이 이 위치에 와서 덮음.
  // 뷰 벗어날 땐 슬롯도 함께 스크롤 아웃되므로 비주얼 이슈 없음.
  return (
    <div
      ref={ref}
      className="relative w-[calc(100%+2rem)] sm:w-full aspect-video rounded-none sm:rounded-lg overflow-hidden -mx-4 sm:mx-0"
      data-player-slot={playlistId ?? ''}
      aria-hidden="true"
    />
  );
}
