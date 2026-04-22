// Design Ref: §3.1 — Zustand playerStore (single source of truth for playback)
// Plan SC: R1 — UI는 이 store를 구독만. iframe 직접 조작 금지

import { create } from 'zustand';
import type { Playlist, Track } from '@/types';
import type { YTPlayer } from '@/types/youtube';

export type PlayerStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'ended'
  | 'error';

// 'hidden': 재생 없음 → iframe 안보임
// 'mini': 재생 중, 모든 페이지 하단 미니바
// 'expanded': 플리 상세 페이지의 대형 뷰
export type PlayerView = 'hidden' | 'mini' | 'expanded';

interface PlayerState {
  /** YT.Player instance. PersistentPlayer 컴포넌트가 주입, UI는 절대 직접 참조 금지 */
  _player: YTPlayer | null;

  status: PlayerStatus;
  view: PlayerView;

  playlistId: string | null;
  playlist: Playlist | null;
  tracks: Track[];
  currentTrackIndex: number;

  /** currentTime은 useScrobble polling이 1Hz로 갱신 (M3) */
  currentTime: number;
  duration: number;

  // ── actions: internal (called by PersistentPlayer / useScrobble) ────────
  setPlayer: (player: YTPlayer | null) => void;
  setStatus: (status: PlayerStatus) => void;
  setCurrentTime: (sec: number) => void;
  setDuration: (sec: number) => void;
  setCurrentTrackIndex: (index: number) => void;

  // ── actions: UI-facing ─────────────────────────────────────────────────
  /** 플리 로드 + 자동 재생 시도. 에러는 setStatus('error')로 전파 */
  load: (playlist: Playlist, tracks: Track[]) => void;
  play: () => void;
  pause: () => void;
  /** 트랙 경계(start_sec)로 seek. index out-of-range면 무시 */
  seekToTrack: (index: number) => void;
  seekTo: (sec: number) => void;
  next: () => void;
  previous: () => void;
  setView: (view: PlayerView) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  _player: null,
  status: 'idle',
  view: 'hidden',
  playlistId: null,
  playlist: null,
  tracks: [],
  currentTrackIndex: 0,
  currentTime: 0,
  duration: 0,

  setPlayer: (player) => set({ _player: player }),
  setStatus: (status) => set({ status }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setCurrentTrackIndex: (currentTrackIndex) => set({ currentTrackIndex }),

  load: (playlist, tracks) => {
    const { _player } = get();
    set({
      playlistId: playlist.id,
      playlist,
      tracks,
      currentTrackIndex: 0,
      currentTime: 0,
      duration: 0,
      status: 'loading',
      view: 'mini',
    });
    if (_player) {
      _player.loadVideoById({ videoId: playlist.youtube_id, startSeconds: 0 });
    }
  },

  play: () => {
    get()._player?.playVideo?.();
  },

  pause: () => {
    get()._player?.pauseVideo?.();
  },

  seekToTrack: (index) => {
    const { tracks, _player } = get();
    const track = tracks[index];
    if (!track || !_player) return;
    const sec = resolveTrackStartSec(tracks, index);
    _player.seekTo(sec, true);
    _player.playVideo?.();
    set({ currentTrackIndex: index });
  },

  seekTo: (sec) => {
    get()._player?.seekTo(sec, true);
  },

  next: () => {
    const { tracks, currentTrackIndex } = get();
    if (currentTrackIndex < tracks.length - 1) {
      get().seekToTrack(currentTrackIndex + 1);
    }
  },

  previous: () => {
    const { currentTrackIndex } = get();
    if (currentTrackIndex > 0) {
      get().seekToTrack(currentTrackIndex - 1);
    }
  },

  setView: (view) => set({ view }),
}));

// start_sec 우선, 없으면 이전 트랙의 시작초 + duration_sec — v1 PlaylistPlayer 로직 재현
function resolveTrackStartSec(tracks: Track[], index: number): number {
  if (index < 0 || index >= tracks.length) return 0;
  let acc = 0;
  for (let i = 0; i < index; i++) {
    const t = tracks[i];
    if (t.start_sec != null) acc = t.start_sec + (t.duration_sec ?? 0);
    else acc += t.duration_sec ?? 0;
  }
  const target = tracks[index];
  return target.start_sec ?? acc;
}
