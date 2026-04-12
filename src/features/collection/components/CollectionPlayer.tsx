'use client';
// Design Ref: §3.4 — 하단 고정 플레이어 바 + 트랙리스트 패널 + YouTube IFrame

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import type { Playlist, Track } from '@/types';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface CollectionPlayerProps {
  playlists: Playlist[];
  currentIndex: number | null;
  isPlaying: boolean;
  isTracklistOpen: boolean;
  tracks: Track[];
  tracksLoading: boolean;
  activeTrackIndex: number | null;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onStop: () => void;
  onToggleTracklist: () => void;
  onSeek: (sec: number, trackIndex: number) => void;
  registerPlayer: (player: any) => void;
}

function formatDuration(sec: number | null) {
  if (!sec) return '--:--';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function CollectionPlayer({
  playlists,
  currentIndex,
  isPlaying,
  isTracklistOpen,
  tracks,
  tracksLoading,
  activeTrackIndex,
  onTogglePlay,
  onPrev,
  onNext,
  onStop,
  onToggleTracklist,
  onSeek,
  registerPlayer,
}: CollectionPlayerProps) {
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  const current = currentIndex !== null ? playlists[currentIndex] : null;

  // YouTube IFrame API 로드
  useEffect(() => {
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  }, []);

  // 플리 변경 시 player 초기화 또는 loadVideoById
  useEffect(() => {
    if (!current) return;
    const videoId = current.youtube_id;

    const initPlayer = () => {
      if (!iframeContainerRef.current) return;
      if (playerRef.current) {
        playerRef.current.loadVideoById(videoId);
        return;
      }
      playerRef.current = new window.YT.Player(iframeContainerRef.current, {
        videoId,
        playerVars: { autoplay: 1, rel: 0 },
        events: {
          onReady: (e: any) => {
            e.target.playVideo();
            registerPlayer(playerRef.current);
          },
          onStateChange: (e: any) => {
            if (e.data === 0) onNext(); // ENDED → 다음
          },
        },
      });
      registerPlayer(playerRef.current);
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); initPlayer(); };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  // 종료 시 정지
  useEffect(() => {
    if (currentIndex === null) playerRef.current?.stopVideo?.();
  }, [currentIndex]);

  // play/pause 토글
  useEffect(() => {
    if (!playerRef.current) return;
    isPlaying ? playerRef.current.playVideo?.() : playerRef.current.pauseVideo?.();
  }, [isPlaying]);

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === playlists.length - 1;

  return (
    <>
      {/* YouTube IFrame — ToS 준수: 항상 존재, 화면 밖 배치 */}
      <div style={{ position: 'fixed', bottom: 64, left: -9999, width: 1, height: 1, overflow: 'hidden' }}>
        <div ref={iframeContainerRef} />
      </div>

      {/* 트랙리스트 패널 */}
      <div
        className="fixed left-0 right-0 z-40 bg-[var(--card)] border-t border-[var(--border)] overflow-y-auto transition-transform duration-300 ease-in-out"
        style={{
          bottom: 64,
          maxHeight: '60vh',
          transform: isTracklistOpen ? 'translateY(0)' : 'translateY(100%)',
        }}
      >
        {/* 패널 헤더 */}
        <div className="sticky top-0 bg-[var(--card)] flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <span className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            트랙리스트
          </span>
          <button
            onClick={onToggleTracklist}
            className="p-1 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
            aria-label="트랙리스트 닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* 트랙 목록 */}
        {tracksLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-[var(--text-secondary)]">
            로딩 중...
          </div>
        ) : tracks.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-[var(--text-secondary)]">
            트랙 정보가 없습니다.
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {tracks.map((track, i) => {
                  const isActive = activeTrackIndex === i;
                  return (
                    <tr
                      key={track.id}
                      onClick={() => track.start_sec !== null && onSeek(track.start_sec, i)}
                      className={`border-b border-[var(--border)] last:border-0 cursor-pointer transition-colors ${
                        isActive ? 'bg-[var(--muted)]' : 'hover:bg-[var(--muted)]'
                      }`}
                    >
                      <td className="py-2.5 pr-3 w-8 text-right pl-4">
                        {isActive ? (
                          <span className="text-[var(--accent)] text-xs">▶</span>
                        ) : (
                          <span className="text-[var(--text-secondary)] tabular-nums">{track.position}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2">
                        <p className="font-medium line-clamp-1">{track.title}</p>
                        {track.artist && (
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{track.artist}</p>
                        )}
                      </td>
                      <td className="py-2.5 pl-3 pr-4 text-[var(--text-secondary)] tabular-nums text-right whitespace-nowrap text-xs">
                        {formatDuration(track.start_sec)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 하단 플레이어 바 */}
      {currentIndex !== null && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--card)] border-t border-[var(--border)]"
          style={{ height: 64, paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* body 정렬 컨테이너 — 썸네일(좌) / 컨트롤(중앙) / 트랙리스트(우) */}
          <div className="max-w-4xl mx-auto px-4 h-full grid grid-cols-3 items-center">
            {/* 좌: 썸네일 (body 좌측 정렬) */}
            <div className="flex items-center">
              <div className="relative flex-shrink-0 w-10 h-10 rounded-md overflow-hidden bg-[var(--muted)]">
                {current?.thumbnail_url && (
                  <Image
                    src={current.thumbnail_url}
                    alt={current.title}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                )}
              </div>
            </div>

            {/* 중앙: 이전 | 재생/정지 | 다음 — 모바일 좁게, 데스크톱 넓게 */}
            <div className="flex items-center justify-center gap-4 sm:gap-7">
              <button
                onClick={onPrev}
                disabled={isFirst}
                className={`p-1.5 transition-opacity ${isFirst ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-70'}`}
                aria-label="이전 플리"
              >
                <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
                </svg>
              </button>

              <button
                onClick={onTogglePlay}
                className="p-1.5 hover:opacity-70 transition-opacity"
                aria-label={isPlaying ? '일시정지' : '재생'}
              >
                {isPlaying ? (
                  <svg className="w-8 h-8 sm:w-9 sm:h-9" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 sm:w-9 sm:h-9" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <button
                onClick={onNext}
                disabled={isLast}
                className={`p-1.5 transition-opacity ${isLast ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-70'}`}
                aria-label="다음 플리"
              >
                <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18 14.5 12 6 6v12zm2.5-6 5.5 4V8zM16 6h2v12h-2z" />
                </svg>
              </button>
            </div>

            {/* 우: 트랙리스트 — 닫기 버튼 너비만큼 패딩 확보 */}
            <div className="flex items-center justify-end pr-8 sm:pr-0">
              <button
                onClick={onToggleTracklist}
                className={`p-2 transition-opacity hover:opacity-70 ${isTracklistOpen ? 'text-[var(--accent)]' : ''}`}
                aria-label="트랙리스트"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24">
                  <path d="M4 6h16M4 10h16M4 14h10" />
                </svg>
              </button>
            </div>
          </div>

          {/* 닫기 — 페이지 제일 우측 고정 */}
          <button
            onClick={onStop}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:opacity-70 transition-opacity p-1.5"
            aria-label="재생 종료"
          >
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
