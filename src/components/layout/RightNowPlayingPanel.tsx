'use client';
// Phase 2: 데스크톱 우측 now-playing 패널.
// - 데스크톱(`>=sm`) 전용. 모바일은 기존 MiniBar / ExpandedView 패턴 유지.
// - 패널이 마운트되면 panelActive=true 로 표시 → in-page ExpandedView 가 슬롯 등록을 양보.
// - 슬롯 메커니즘: ExpandedView 와 동일한 IntersectionObserver/ResizeObserver/scroll 측정.
// - 영상 슬롯은 패널 상단 sticky aspect-video, 그 아래 영역은 독립 스크롤.

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/features/player/store';

export default function RightNowPlayingPanel() {
  const slotRef = useRef<HTMLDivElement>(null);
  const playlist = usePlayerStore((s) => s.playlist);
  const tracks = usePlayerStore((s) => s.tracks);
  const currentTrackIndex = usePlayerStore((s) => s.currentTrackIndex);
  const playlistId = usePlayerStore((s) => s.playlistId);

  // 패널 자체는 항상 mounted (sticky 위치 유지). panelActive 플래그로
  // ExpandedView 와 슬롯 우선순위 정리.
  useEffect(() => {
    usePlayerStore.getState().setPanelActive(true);
    return () => {
      usePlayerStore.getState().setPanelActive(false);
      // 언마운트 시 expandedRect 도 정리
      const state = usePlayerStore.getState();
      if (state.view !== 'hidden') state.setView('mini');
      state.setExpandedRect(null);
    };
  }, []);

  // 슬롯 측정 — ExpandedView 패턴과 동일
  useEffect(() => {
    const el = slotRef.current;
    if (!el) return;
    if (!playlist) return;

    let raf: number | null = null;

    const measure = () => {
      const r = el.getBoundingClientRect();
      // 슬롯이 0 사이즈(예: 모바일에서 hidden) 면 등록 skip
      if (r.width === 0 || r.height === 0) return;
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

    const io = new IntersectionObserver(
      ([entry]) => {
        const current = usePlayerStore.getState().view;
        if (current === 'hidden') return;
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

    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(el);

    window.addEventListener('scroll', scheduleMeasure, { passive: true });
    window.addEventListener('resize', scheduleMeasure);

    scheduleMeasure();

    return () => {
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('scroll', scheduleMeasure);
      window.removeEventListener('resize', scheduleMeasure);
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [playlist, playlistId]);

  // 플리 미로드 시 패널 자체는 빈 placeholder 로 표시 (자리 유지)
  const currentTrack = tracks[currentTrackIndex];

  return (
    <aside
      className="hidden sm:flex flex-col w-80 h-screen bg-[var(--card)] border-l border-[var(--border)] flex-shrink-0"
      aria-label="현재 재생 패널"
    >
      {playlist ? (
        <>
          {/* 비디오 슬롯 — aspect-video 공간 예약, iframe 이 fixed 로 이 위에 올라옴 */}
          <div
            ref={slotRef}
            className="relative w-full aspect-video bg-black flex-shrink-0"
            data-player-slot={playlistId ?? ''}
            aria-hidden="true"
          />

          {/* 패널 본문 — 독립 스크롤 */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* 트랙 메타 */}
            <h2 className="text-base font-semibold leading-tight mb-1 break-keep">
              {currentTrack?.title ?? playlist.title}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] truncate">
              {playlist.channel_name}
            </p>

            {/* 액션 영역 placeholder — Phase 3: 좋아요 | 저장 | 공유 | 유튜브에서보기 */}
            <div className="mt-4 pt-4 border-t border-[var(--border)] text-xs text-[var(--text-secondary)]">
              액션 영역 (Phase 3 예정)
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-[var(--text-secondary)]">
          재생 중인 항목이 없습니다
        </div>
      )}
    </aside>
  );
}
