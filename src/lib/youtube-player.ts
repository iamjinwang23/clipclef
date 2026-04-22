// Design Ref: §2.1 — YouTube IFrame API singleton loader
// Plan SC: R1 Persistent Player — API script는 세션 1회만 로드, iframe 단일 마운트 원칙 지원

import type { YTPlayer, YTPlayerOptions } from '@/types/youtube';

let apiReadyPromise: Promise<NonNullable<Window['YT']>> | null = null;

// YouTube IFrame API 스크립트 로더 (세션 1회)
// 이미 로드됐으면 즉시 resolve, 아니면 스크립트 주입 + onYouTubeIframeAPIReady 대기
export function loadYouTubeAPI(): Promise<NonNullable<Window['YT']>> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube API는 브라우저에서만 로드 가능합니다'));
  }

  if (apiReadyPromise) return apiReadyPromise;

  apiReadyPromise = new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT?.Player) resolve(window.YT);
    };
  });

  return apiReadyPromise;
}

// YT.Player 인스턴스 생성. element는 이 호출 후 iframe으로 replace됨.
// 주의: element는 DOM에 항상 존재해야 하며 unmount 금지 (Design Ref: §1.2 원칙 3)
export async function createYouTubePlayer(
  element: HTMLElement,
  opts: YTPlayerOptions
): Promise<YTPlayer> {
  const YT = await loadYouTubeAPI();
  return new YT.Player(element, opts) as YTPlayer;
}
