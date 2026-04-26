'use client';

// Design Ref: §1.2 — iframe은 세션 1회만 마운트. DOM 이동 절대 금지. transform만 허용
// Plan SC: R1 — layout.tsx가 유일한 마운트 지점. 이 컴포넌트는 언마운트되지 않음.
//
// M2 part 1 범위: iframe 마운트 + playerStore 연결 + hidden 위치 유지.
// MiniBar / ExpandedView (시각 UI)는 M2 part 2에서 추가.

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../store';
import { useScrobble } from '../hooks/useScrobble';
import { createYouTubePlayer } from '@/lib/youtube-player';
import type { YTPlayer, YTPlayerEvent } from '@/types/youtube';
import { YT_STATE } from '@/types/youtube';

export default function PersistentPlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const view = usePlayerStore((s) => s.view);
  // Lazy-init: 첫 playlist 가 로드되어 videoId 가 생기면 그때 iframe 생성.
  // 빈 videoId 로 미리 만들면 외부 직진입 시 iframe 이 'no video' 상태에 갇혀
  // postMessage(cue/load)가 적용되지 않아 사용자가 플레이 누르면 "재생 ID는 ..." 오류가 남.
  const initialVideoId = usePlayerStore((s) => s.playlist?.youtube_id ?? null);

  // Scrobble polling — 세션당 1회 (PersistentPlayer도 단일 마운트)
  useScrobble();

  useEffect(() => {
    if (!containerRef.current) return;
    if (playerRef.current) return; // 이미 생성됨 — 재생성 절대 금지
    if (!initialVideoId) return;   // 첫 playlist 로드 전에는 iframe 생성 보류

    let cancelled = false;

    createYouTubePlayer(containerRef.current, {
      // 첫 playlist 의 youtube_id 로 시작 — 빈 videoId 로 인한 cue/load 무력화 방지
      videoId: initialVideoId,
      playerVars: {
        // autoplay=1 시도. 콜드 직진입(no user gesture)은 브라우저 정책으로 차단되지만
        // iframe 자체는 실제 영상이 로드된 상태라 사용자가 플레이 누르면 정상 재생.
        // 내부 네비게이션(user gesture 후)은 그대로 자동 재생.
        autoplay: 1,
        rel: 0,
        playsinline: 1,
        modestbranding: 1,
        origin: typeof window !== 'undefined' ? window.location.origin : undefined,
        enablejsapi: 1,
      },
      events: {
        onReady: (e: YTPlayerEvent) => {
          if (cancelled) return;
          playerRef.current = e.target;
          usePlayerStore.getState().setPlayer(e.target);
          usePlayerStore.getState().setStatus('ready');
        },
        onStateChange: (e: YTPlayerEvent) => {
          if (cancelled) return;
          const set = usePlayerStore.getState().setStatus;
          switch (e.data) {
            case YT_STATE.PLAYING:
              set('playing');
              break;
            case YT_STATE.PAUSED:
              set('paused');
              break;
            case YT_STATE.ENDED:
              set('ended');
              break;
            case YT_STATE.BUFFERING:
              // buffering은 상태 유지 (playing/paused 중 일시 상태)
              break;
            case YT_STATE.CUED:
              set('ready');
              break;
          }
        },
      },
    })
      .then((player) => {
        // onReady가 먼저 불릴 수도 있으므로 방어적 재설정
        if (cancelled) return;
        if (!playerRef.current) {
          playerRef.current = player;
          usePlayerStore.getState().setPlayer(player);
        }
      })
      .catch(() => {
        if (cancelled) return;
        usePlayerStore.getState().setStatus('error');
      });

    return () => {
      cancelled = true;
      // 주의: playerRef.current.destroy() 호출 금지 — 이 컴포넌트는 세션 동안 언마운트되지 않음.
      // 만약 언마운트된다면 (locale 전환 등) React가 DOM을 제거하면서 iframe도 사라지므로
      // 별도 destroy 없어도 됨. store._player 초기화만.
      // 또한 playerRef.current 가 set 된 이후 effect 가 cleanup 되면 새 iframe 을 만들면
      // 안 됨 (재생성 금지). 의존배열에 initialVideoId 가 들어있어 변경 시 effect 가
      // 재실행되지만, playerRef.current 가드로 두번째 생성은 차단됨.
      if (!playerRef.current) {
        usePlayerStore.getState().setPlayer(null);
      }
    };
  }, [initialVideoId]);

  // view별 위치·크기: iframe DOM 이동 절대 금지, CSS만 제어
  // hidden / mini: 1×1 invisible (audio only)
  // expanded: ExpandedView 슬롯의 viewport-relative 좌표에 iframe 배치
  //   (스크롤·리사이즈 시 슬롯이 실시간 rect 업데이트 → 여기가 따라감)
  const expandedRect = usePlayerStore((s) => s.expandedRect);
  const isExpanded = view === 'expanded' && expandedRect !== null;

  const expandedStyle: React.CSSProperties | undefined =
    isExpanded && expandedRect
      ? {
          position: 'fixed',
          top: expandedRect.top,
          left: expandedRect.left,
          width: expandedRect.width,
          height: expandedRect.height,
          zIndex: 30,
        }
      : undefined;

  return (
    <div
      aria-hidden={!isExpanded}
      className={
        isExpanded
          ? 'sm:rounded-lg overflow-hidden'
          : 'fixed bottom-0 right-0 w-px h-px opacity-0 pointer-events-none overflow-hidden z-40'
      }
      style={expandedStyle}
    >
      <div className={isExpanded ? 'w-full h-full bg-black' : 'w-full h-full'}>
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
