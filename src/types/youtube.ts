// YouTube IFrame Player API 경량 타입
// any 사용을 피하기 위한 narrow interface.
// 공식 @types/youtube 를 쓰지 않는 이유: 프로젝트가 실제로 쓰는 메서드가 적어서 자체 정의가 더 간결.

export interface YTPlayer {
  loadVideoById: (videoId: string) => void;
  playVideo?: () => void;
  pauseVideo?: () => void;
  stopVideo?: () => void;
  destroy?: () => void;
  seekTo: (sec: number, allowSeekAhead: boolean) => void;
}

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
