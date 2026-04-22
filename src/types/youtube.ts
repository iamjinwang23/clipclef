// YouTube IFrame Player API 경량 타입
// any 사용을 피하기 위한 narrow interface.
// 공식 @types/youtube 를 쓰지 않는 이유: 프로젝트가 실제로 쓰는 메서드가 적어서 자체 정의가 더 간결.

export interface YTPlayer {
  loadVideoById: (videoIdOrOpts: string | { videoId: string; startSeconds?: number }) => void;
  cueVideoById?: (videoIdOrOpts: string | { videoId: string; startSeconds?: number }) => void;
  playVideo?: () => void;
  pauseVideo?: () => void;
  stopVideo?: () => void;
  destroy?: () => void;
  seekTo: (sec: number, allowSeekAhead: boolean) => void;
  getCurrentTime?: () => number;
  getDuration?: () => number;
  // YT.PlayerState: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
  getPlayerState?: () => number;
}

// YT.PlayerState enum (v2 Design Ref: §4 — onStateChange numeric codes)
export const YT_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

export interface YTPlayerEvent {
  target: YTPlayer;
  data: number;
}

export interface YTPlayerOptions {
  videoId: string;
  playerVars?: Record<string, unknown>;
  events?: {
    onReady?: (e: YTPlayerEvent) => void;
    onStateChange?: (e: YTPlayerEvent) => void;
  };
}

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, opts: YTPlayerOptions) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export {};
