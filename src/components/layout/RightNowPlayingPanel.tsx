'use client';
// Phase 2-3: 데스크톱 우측 now-playing 패널.
// - 데스크톱(`>=sm`) 전용. 모바일은 기존 MiniBar / ExpandedView 패턴 유지.
// - 패널이 마운트되면 panelActive=true → in-page ExpandedView 가 슬롯 등록 양보.
// - 슬롯 메커니즘: ExpandedView 와 동일한 IntersectionObserver/ResizeObserver/scroll 측정.
// - 영상 슬롯은 패널 상단 sticky aspect-video, 그 아래 트랙 리스트 + 액션은 독립 스크롤.

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/features/player/store';
import type { Track } from '@/types';

function formatDuration(sec: number | null) {
  if (!sec) return '--:--';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function RightNowPlayingPanel() {
  const slotRef = useRef<HTMLDivElement>(null);
  const playlist = usePlayerStore((s) => s.playlist);
  const tracks = usePlayerStore((s) => s.tracks);
  const currentTrackIndex = usePlayerStore((s) => s.currentTrackIndex);
  const playlistId = usePlayerStore((s) => s.playlistId);
  const seekToTrack = usePlayerStore((s) => s.seekToTrack);

  useEffect(() => {
    usePlayerStore.getState().setPanelActive(true);
    return () => {
      usePlayerStore.getState().setPanelActive(false);
      const state = usePlayerStore.getState();
      if (state.view !== 'hidden') state.setView('mini');
      state.setExpandedRect(null);
    };
  }, []);

  useEffect(() => {
    const el = slotRef.current;
    if (!el) return;
    if (!playlist) return;

    let raf: number | null = null;

    const measure = () => {
      const r = el.getBoundingClientRect();
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

  const currentTrack: Track | undefined = tracks[currentTrackIndex];

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
          <div className="flex-1 overflow-y-auto">
            {/* 트랙 메타 */}
            <div className="p-4 border-b border-[var(--border)]">
              <h2 className="text-base font-semibold leading-tight mb-1 break-keep line-clamp-2">
                {playlist.title}
              </h2>
              <p className="text-sm text-[var(--text-secondary)] truncate">
                {playlist.channel_name}
              </p>
            </div>

            {/* 액션 영역 placeholder — Phase 3-가 후속: 좋아요 | 저장 | 공유 | 유튜브에서보기 */}
            <div className="px-4 py-3 border-b border-[var(--border)] text-xs text-[var(--text-secondary)]">
              액션 영역 (좋아요·저장·공유·유튜브)
            </div>

            {/* 트랙 리스트 */}
            {tracks.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide px-4 pt-3 pb-2">
                  트랙 {tracks.length}개
                </h3>
                <ul className="pb-3">
                  {tracks.map((track, index) => {
                    const isActive = currentTrackIndex === index;
                    return (
                      <li
                        key={track.id}
                        onClick={() => seekToTrack(index)}
                        className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${
                          isActive ? 'bg-[var(--muted)]' : 'hover:bg-[var(--muted)]'
                        }`}
                      >
                        <span className={`w-5 text-right text-xs tabular-nums flex-shrink-0 ${
                          isActive ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                        }`}>
                          {isActive ? '▶' : track.position}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{track.title}</p>
                          {track.artist && (
                            <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                              {track.artist}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-[var(--text-secondary)] tabular-nums flex-shrink-0">
                          {formatDuration(track.duration_sec)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
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
