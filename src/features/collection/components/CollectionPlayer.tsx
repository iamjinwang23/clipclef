'use client';
// Design Ref: §3.4 — 하단 고정 플레이어 바 + 트랙리스트 패널 + YouTube IFrame

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import type { Playlist, Track } from '@/types';
import type { YTPlayer, YTPlayerEvent } from '@/types/youtube';

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
  onToggleTracklist: () => void;
  onSeek: (sec: number, trackIndex: number) => void;
  registerPlayer: (player: YTPlayer | null) => void;
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
  onToggleTracklist,
  onSeek,
  registerPlayer,
}: CollectionPlayerProps) {
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  const current = currentIndex !== null ? playlists[currentIndex] : null;

  // YouTube IFrame API 로드
  useEffect(() => {
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  }, []);

  // 플레이리스트 변경 시 player 초기화 또는 loadVideoById
  useEffect(() => {
    if (!current) return;
    const videoId = current.youtube_id;

    const initPlayer = () => {
      if (!iframeContainerRef.current) return;
      if (playerRef.current) {
        playerRef.current.loadVideoById(videoId);
        return;
      }
      if (!window.YT) return;
      playerRef.current = new window.YT.Player(iframeContainerRef.current, {
        videoId,
        playerVars: {
          autoplay: 1,
          rel: 0,
          // 외부 직진입(공유 링크) 대응 — origin/enablejsapi 누락 시 일반 재생 오류 발생
          origin: typeof window !== 'undefined' ? window.location.origin : undefined,
          enablejsapi: 1,
        },
        events: {
          onReady: (e: YTPlayerEvent) => {
            e.target.playVideo?.();
            registerPlayer(playerRef.current);
          },
          onStateChange: (e: YTPlayerEvent) => {
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
    if (isPlaying) playerRef.current.playVideo?.();
    else playerRef.current.pauseVideo?.();
  }, [isPlaying]);

  // 트랙리스트 열릴 때 배경 스크롤 잠금
  useEffect(() => {
    if (!isTracklistOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isTracklistOpen]);

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === playlists.length - 1;

  return (
    <>
      {/* YouTube IFrame — ToS 준수: 항상 존재, 화면 밖 배치 */}
      <div style={{ position: 'fixed', bottom: 64, left: -9999, width: 1, height: 1, overflow: 'hidden' }}>
        <div ref={iframeContainerRef} />
      </div>

      {/* 딤 오버레이 — 트랙리스트 열릴 때 (페이지 전체 덮음) */}
      {currentIndex !== null && (
        <div
          onClick={onToggleTracklist}
          className="fixed inset-0 z-30 bg-black transition-opacity duration-300"
          style={{
            opacity: isTracklistOpen ? 0.8 : 0,
            pointerEvents: isTracklistOpen ? 'auto' : 'none',
          }}
        />
      )}

      {/* 트랙리스트 패널 — 페이지 맨 아래(하단바 아래)까지 꽉 차게 */}
      {currentIndex !== null && <div
        className="fixed left-0 right-0 bottom-0 z-40 bg-[var(--card)] border-t border-[var(--border)] overflow-y-auto transition-transform duration-300 ease-in-out"
        style={{
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
          <div className="overflow-hidden pb-[calc(64px+56px+env(safe-area-inset-bottom))] sm:pb-16">
            {/* 모바일: 플레이어 바(64) + 하단 탭바(56 + safe-area), 데스크톱: 플레이어 바만 */}
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
      </div>}

      {/* 하단 플레이어 바 — 모바일에선 탭바(56px + safe-area) 위에 고정 */}
      {currentIndex !== null && (
        <div
          className="fixed left-0 right-0 z-40 bg-[var(--card)] border-t border-[var(--border)] bottom-[calc(56px+env(safe-area-inset-bottom))] sm:bottom-0 sm:pb-[env(safe-area-inset-bottom)]"
          style={{ height: 64 }}
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
                aria-label="이전 플레이리스트"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/backward.svg" alt="" aria-hidden="true" className="w-6 h-6 max-sm:w-10 max-sm:h-10 invert" />
              </button>

              <button
                onClick={onTogglePlay}
                className="p-1.5 hover:opacity-70 transition-opacity"
                aria-label={isPlaying ? '일시정지' : '재생'}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={isPlaying ? '/Pause.svg' : '/Play.svg'}
                  alt=""
                  aria-hidden="true"
                  className="w-8 h-8 max-sm:w-12 max-sm:h-12 invert"
                />
              </button>

              <button
                onClick={onNext}
                disabled={isLast}
                className={`p-1.5 transition-opacity ${isLast ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-70'}`}
                aria-label="다음 플레이리스트"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/Forward.svg" alt="" aria-hidden="true" className="w-6 h-6 max-sm:w-10 max-sm:h-10 invert" />
              </button>
            </div>

            {/* 우: 트랙리스트 */}
            <div className="flex items-center justify-end">
              <button
                onClick={onToggleTracklist}
                className={`p-2 transition-opacity hover:opacity-70 ${isTracklistOpen ? 'opacity-100' : 'opacity-60'}`}
                aria-label="트랙리스트"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/tracklist.svg" alt="" aria-hidden="true" className="w-5 h-5 invert" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
