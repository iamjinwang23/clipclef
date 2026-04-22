'use client';

// Design Ref: §2.2 Data Flow — Scrobble polling + track boundary detection
// Plan SC: SC-2 scrobble/DAU ≥ 1.0 — 4min/50% 임계값으로 listens 테이블에 write
// Plan SC: R2 Scrobble 정확도 — 중복/누락 < 10%. seek·throttle 보정

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../store';
import type { Track } from '@/types';

const POLL_INTERVAL_MS = 1000;
// 자연스러운 tick: 1초 전후 + 약간의 지터 허용
const NATURAL_TICK_MAX_MS = 2000;
const NATURAL_POS_DELTA_MAX_SEC = 2;

// Last.fm 규칙: 4분 또는 50% 중 빠른 쪽
const THRESHOLD_MS = 4 * 60 * 1000;
const THRESHOLD_PCT = 0.5;
// 50% 규칙의 최소 절대값 (너무 짧은 트랙 방어)
const MIN_LISTENED_FOR_PCT_MS = 30_000;

// 트랙 시작초 계산 — store의 resolveTrackStartSec와 동일 규칙
function getTrackStartSec(tracks: Track[], index: number): number {
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

// currentTime 기반 트랙 인덱스 찾기 — 가장 큰 startSec ≤ pos 인 트랙
function findTrackIndex(tracks: Track[], pos: number): number {
  if (tracks.length === 0) return 0;
  let found = 0;
  for (let i = 0; i < tracks.length; i++) {
    const startSec = getTrackStartSec(tracks, i);
    if (startSec <= pos) found = i;
    else break;
  }
  return found;
}

async function postScrobble(payload: {
  track_id: string;
  playlist_id: string;
  duration_ms: number;
}) {
  try {
    const res = await fetch('/api/listens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    // 409 = 1분 내 중복 (unique index), 정상 동작이므로 silent ignore
    // 401 = 비로그인, 재시도 없음
    // 5xx = 서버 오류, 현재는 silent (M7에서 retry queue 고려)
    if (!res.ok && res.status !== 409) {
      console.warn('[scrobble] failed', res.status);
    }
  } catch (err) {
    console.warn('[scrobble] network error', err);
  }
}

export function useScrobble() {
  // 렌더링 트리거는 필요 없음 — store.getState()로 직접 구독
  // 다만 hook이 mount될 때만 polling 시작되도록 useEffect 의존성 처리
  const loopRunning = useRef(false);

  useEffect(() => {
    if (loopRunning.current) return;
    loopRunning.current = true;

    // 로컬 상태 (이 hook 인스턴스 내부)
    let trackIndex = 0;
    let listenedMs = 0;
    let committed = false;          // 현 트랙 scrobble 제출 여부
    let trackIdForCommit: string | null = null; // 현재 트래킹 중인 track.id
    let lastTickWall = Date.now();
    let lastPos = 0;

    const resetForTrack = (tracks: Track[], index: number) => {
      trackIndex = index;
      listenedMs = 0;
      committed = false;
      trackIdForCommit = tracks[index]?.id ?? null;
    };

    const interval = setInterval(() => {
      const s = usePlayerStore.getState();

      // 재생 중이 아니면 폴링 자체는 유지하되 누적 차단
      // (pause 중에도 사용자가 seek 할 수 있으므로 position 갱신은 계속)
      const player = s._player;
      if (!player?.getCurrentTime) {
        lastTickWall = Date.now();
        return;
      }

      const pos = player.getCurrentTime();
      const now = Date.now();
      const wallDelta = now - lastTickWall;
      const posDelta = pos - lastPos;

      // 1) 트랙 로드됐는데 로컬 state 초기화 안 된 경우 (첫 tick)
      if (trackIdForCommit === null && s.tracks.length > 0) {
        const idx = findTrackIndex(s.tracks, pos);
        resetForTrack(s.tracks, idx);
        if (s.currentTrackIndex !== idx) s.setCurrentTrackIndex(idx);
      }

      // 2) 플리가 바뀌었으면 로컬 상태 리셋
      if (trackIdForCommit && !s.tracks.some((t) => t.id === trackIdForCommit)) {
        if (s.tracks.length > 0) {
          const idx = findTrackIndex(s.tracks, pos);
          resetForTrack(s.tracks, idx);
          if (s.currentTrackIndex !== idx) s.setCurrentTrackIndex(idx);
        } else {
          trackIdForCommit = null;
        }
        lastTickWall = now;
        lastPos = pos;
        s.setCurrentTime(pos);
        return;
      }

      // 3) 트랙 경계 감지 (seek으로 인한 점프 포함)
      const newIndex = s.tracks.length > 0 ? findTrackIndex(s.tracks, pos) : trackIndex;
      if (newIndex !== trackIndex) {
        // 이전 트랙이 임계값 넘었으면 commit
        maybeCommit(s, trackIndex, listenedMs, committed, trackIdForCommit);
        resetForTrack(s.tracks, newIndex);
        if (s.currentTrackIndex !== newIndex) s.setCurrentTrackIndex(newIndex);
        lastTickWall = now;
        lastPos = pos;
        s.setCurrentTime(pos);
        return;
      }

      // 4) 재생 중일 때만 누적
      if (s.status === 'playing') {
        const naturalAdvance =
          posDelta > 0 &&
          posDelta < NATURAL_POS_DELTA_MAX_SEC &&
          wallDelta < NATURAL_TICK_MAX_MS;
        if (naturalAdvance) {
          listenedMs += posDelta * 1000;
        }
        // posDelta < 0 (seek back): 누적 유지, 이번 tick 증분 없음
        // posDelta > MAX 또는 wallDelta > MAX: seek forward 또는 tab throttle, 증분 없음
      }

      lastTickWall = now;
      lastPos = pos;
      s.setCurrentTime(pos);

      // 5) 임계값 체크
      if (!committed && trackIdForCommit) {
        const track = s.tracks[trackIndex];
        const durationMs = (track?.duration_sec ?? 0) * 1000;
        const pctReached =
          durationMs > 0 &&
          listenedMs / durationMs >= THRESHOLD_PCT &&
          listenedMs >= MIN_LISTENED_FOR_PCT_MS;
        const absReached = listenedMs >= THRESHOLD_MS;

        if ((pctReached || absReached) && s.playlistId) {
          committed = true;
          // 파이어 앤 포겟
          postScrobble({
            track_id: trackIdForCommit,
            playlist_id: s.playlistId,
            duration_ms: Math.floor(listenedMs),
          });
        }
      }
    }, POLL_INTERVAL_MS);

    // 플리 언로드 시 (store clear) 로컬 상태 정리
    const unsub = usePlayerStore.subscribe((state, prev) => {
      if (!state.playlistId && prev.playlistId) {
        maybeCommit(prev, trackIndex, listenedMs, committed, trackIdForCommit);
        trackIdForCommit = null;
        listenedMs = 0;
        committed = false;
        trackIndex = 0;
      }
    });

    return () => {
      clearInterval(interval);
      unsub();
      loopRunning.current = false;
    };
  }, []);
}

// 유틸: 현재 누적이 임계값 넘었으면 커밋
function maybeCommit(
  s: ReturnType<typeof usePlayerStore.getState>,
  trackIndex: number,
  listenedMs: number,
  committed: boolean,
  trackId: string | null
) {
  if (committed || !trackId || !s.playlistId) return;
  const track = s.tracks[trackIndex];
  const durationMs = (track?.duration_sec ?? 0) * 1000;
  const pctReached =
    durationMs > 0 &&
    listenedMs / durationMs >= THRESHOLD_PCT &&
    listenedMs >= MIN_LISTENED_FOR_PCT_MS;
  const absReached = listenedMs >= THRESHOLD_MS;
  if (!(pctReached || absReached)) return;
  postScrobble({
    track_id: trackId,
    playlist_id: s.playlistId,
    duration_ms: Math.floor(listenedMs),
  });
}
