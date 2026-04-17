'use client';
// 상세 페이지 YouTube 플레이어 + 트랙리스트
// 트랙 클릭 시 해당 타임스탬프로 seek

import { useEffect, useRef, useState } from 'react';
import type { Track } from '@/types';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface PlaylistPlayerProps {
  youtubeId: string;
  tracks: Track[];
  children?: React.ReactNode;
}

function formatDuration(sec: number | null) {
  if (!sec) return '--:--';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function PlaylistPlayer({ youtubeId, tracks, children }: PlaylistPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);

  // start_sec 우선 사용, 없으면 duration_sec 누적합으로 폴백
  const tracksWithStart = tracks.reduce<(Track & { startSec: number })[]>((acc, track, i) => {
    let startSec: number;
    if (track.start_sec !== null && track.start_sec !== undefined) {
      startSec = track.start_sec;
    } else {
      const prev = acc[i - 1];
      startSec = prev ? prev.startSec + (prev.duration_sec ?? 0) : 0;
    }
    return [...acc, { ...track, startSec }];
  }, []);

  useEffect(() => {
    let destroyed = false;

    const initPlayer = () => {
      if (destroyed || !containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: youtubeId,
        playerVars: { autoplay: 0, rel: 0 },
        events: {
          onReady: () => {
            if (!destroyed) setIsReady(true);
          },
        },
      });
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        initPlayer();
      };
    }

    return () => {
      destroyed = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      setIsReady(false);
      setActiveIndex(null);
    };
  }, [youtubeId]);

  const seekToTrack = (index: number) => {
    const track = tracksWithStart[index];
    if (!track || !playerRef.current || !isReady) return;
    playerRef.current.seekTo(track.startSec, true);
    playerRef.current.playVideo();
    setActiveIndex(index);
  };

  return (
    <div>
      {/* YouTube 플레이어 */}
      <div className="relative w-[calc(100%+2rem)] sm:w-full aspect-video rounded-none sm:rounded-lg overflow-hidden bg-black -mx-4 sm:mx-0">
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {children}

      {/* 트랙리스트 */}
      {tracks.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
            트랙리스트
          </h2>
          <div className="overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {tracksWithStart.map((track, index) => {
                  const isActive = activeIndex === index;
                  return (
                    <tr
                      key={track.id}
                      onClick={() => seekToTrack(index)}
                      className={`border-b border-[var(--border)] last:border-0 cursor-pointer transition-colors ${
                        isActive ? 'bg-[var(--muted)]' : 'hover:bg-[var(--muted)]'
                      }`}
                    >
                      <td className="py-2.5 pr-3 w-8 text-right">
                        {isActive ? (
                          <span className="text-[var(--accent)] text-xs">▶</span>
                        ) : (
                          <span className="text-[var(--text-secondary)] tabular-nums">{track.position}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 font-medium truncate max-w-0 md:w-[60%]">
                        {track.title}
                        {track.artist && (
                          <p className="md:hidden text-xs font-normal text-[var(--text-secondary)] mt-0.5">{track.artist}</p>
                        )}
                      </td>
                      <td className="hidden md:table-cell py-2.5 px-2 text-[var(--text-secondary)] truncate max-w-0 w-[25%]">
                        {track.artist ?? ''}
                      </td>
                      <td className="py-2.5 pl-3 pr-3 text-[var(--text-secondary)] tabular-nums text-right whitespace-nowrap">
                        {formatDuration(track.duration_sec)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
