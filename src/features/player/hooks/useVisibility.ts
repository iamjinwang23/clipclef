'use client';

// Design Ref: §6.3 — Tab 백그라운드 감지 (useScrobble 보정용)
// 백그라운드 시 YouTube iframe이 autoplay 정책으로 throttle될 수 있으므로
// 복귀 시 scrobble 타이머 재동기화 필요

import { useEffect, useState } from 'react';

export function useVisibility(): DocumentVisibilityState {
  const [state, setState] = useState<DocumentVisibilityState>(() =>
    typeof document !== 'undefined' ? document.visibilityState : 'visible'
  );

  useEffect(() => {
    const handler = () => setState(document.visibilityState);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  return state;
}
