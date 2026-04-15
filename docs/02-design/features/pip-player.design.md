# Design: pip-player

> Feature: pip-player
> Architecture: Option C — Pragmatic Balance
> Date: 2026-04-12
> Status: active

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 재생 연속성 — IFrame이 스크롤/페이지 이동마다 파괴되는 구조를 레이아웃 레벨로 올려 "틀어두고 탐색" 경험 제공 |
| **WHO** | 플리 재생하면서 트랙리스트·댓글·타 플리를 동시에 탐색하고 싶은 사용자 |
| **RISK** | IFrame DOM 이동 불가(reload) → 인라인 영역은 플레이스홀더로 대체 필수. layout.tsx Server Component 경계 처리 필요 |
| **SUCCESS** | 스크롤 PiP 등장 / 크로스 페이지 생존 / 좌우 드래그(touch 포함) / X·새플리 종료 |
| **SCOPE** | pip feature 신규 3파일 + layout.tsx·PlaylistPlayer.tsx 수정. 배포 제외. |

---

## 1. Overview

### 1.1 아키텍처 개요

```
[locale]/layout.tsx (Server Component)
└── <PipPlayerPortal /> (Client Component, 'use client')
     ├── YouTube IFrame (단 하나, 항상 여기 존재)
     ├── isPip=false: position:fixed, 인라인 영역 좌표에 크게 겹쳐 표시
     └── isPip=true:  position:fixed, 우/좌 하단 코너 240×135

PlaylistPlayer.tsx (Client Component, 기존 유지)
├── IFrame 자리 → InlinePlayerPlaceholder (썸네일 or "재생 중" 표시)
├── 재생 버튼 → usePipStore.play() 호출
├── containerRef + IntersectionObserver → usePipStore.setPip() 트리거
└── 트랙 클릭 → usePipStore.seekTo(startSec) 호출
```

### 1.2 상태 흐름

```
[재생 전]
  PipPlayerPortal: isPlaying=false → display:none
  PlaylistPlayer: 썸네일 + 재생 버튼

[재생 버튼 클릭]
  store.play({ playlistId, youtubeId, title, thumbnailUrl })
  → isPlaying=true, isPip=false
  → PipPlayerPortal: 인라인 영역 좌표에 크게 표시
  → PlaylistPlayer: "재생 중" 플레이스홀더

[스크롤 다운 (인라인 영역 뷰포트 이탈)]
  IntersectionObserver → store.setPip(true)
  → PipPlayerPortal: 코너로 이동 (CSS transition)

[스크롤 업 (인라인 영역 재진입)]
  IntersectionObserver → store.setPip(false)
  → PipPlayerPortal: 인라인 영역 좌표로 복귀

[다른 페이지 이동]
  PlaylistPlayer 언마운트 → observer 해제
  isPip=true 유지 → PipPlayerPortal 코너에서 생존

[드래그 (좌/우)]
  mousedown/touchstart → 드래그 추적
  화면 중앙 기준으로 side('left'|'right') 계산
  mouseup/touchend → snap 완료

[X 버튼]
  store.stop() → isPlaying=false, isPip=false
  → PipPlayerPortal: display:none + player.stopVideo()

[새 플리 재생]
  store.play(newPayload) → youtubeId 교체
  → PipPlayerPortal: loadVideoById(newYoutubeId)
```

---

## 2. 데이터 모델

### 2.1 Zustand PiP Store

```ts
// src/features/pip/store.ts

interface PlayPayload {
  playlistId: string;
  youtubeId: string;
  title: string;
  thumbnailUrl: string;
}

interface PipState {
  playlistId: string | null;
  youtubeId: string | null;
  title: string;
  thumbnailUrl: string;
  isPlaying: boolean;   // 재생 중 여부 (IFrame 활성)
  isPip: boolean;       // 코너 PiP 모드 여부
  side: 'right' | 'left';  // snap 위치

  // actions
  play: (payload: PlayPayload) => void;
  stop: () => void;
  setPip: (v: boolean) => void;
  setSide: (side: 'right' | 'left') => void;
  seekTo: (startSec: number) => void;  // 트랙 클릭 전달용 콜백 주입
  registerSeek: (fn: (sec: number) => void) => void;
}
```

### 2.2 인라인 영역 좌표 공유

```ts
// PlaylistPlayer → PipPlayerPortal 좌표 전달
// Zustand store에 inlineRect 저장 (DOMRect 대신 plain object)
interface InlineRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// store에 추가
inlineRect: InlineRect | null;
setInlineRect: (rect: InlineRect) => void;
```

---

## 3. 컴포넌트 설계

### 3.1 PipPlayerPortal

```tsx
// src/features/pip/components/PipPlayerPortal.tsx
'use client';
// Design Ref: §3.1 — 레이아웃 레벨 YouTube IFrame 컨테이너

// 역할:
// - YouTube IFrame API 초기화 및 단일 플레이어 인스턴스 관리
// - isPip/side/inlineRect에 따라 position:fixed CSS 동적 변경
// - 드래그(mouse + touch) 처리 → side snap
// - X 버튼, 제목 표시

// CSS 전략:
// isPip=false, isPlaying=true:
//   style={{ position: 'fixed', top: inlineRect.top, left: inlineRect.left,
//            width: inlineRect.width, height: inlineRect.height, zIndex: 50 }}
// isPip=true, side='right':
//   style={{ position: 'fixed', bottom: 16, right: 16,
//            width: 240, height: 135, zIndex: 50 }}
// isPip=true, side='left':
//   style={{ position: 'fixed', bottom: 16, left: 16,
//            width: 240, height: 135, zIndex: 50 }}
// isPlaying=false:
//   style={{ display: 'none' }}

// 드래그:
// onMouseDown/onTouchStart → 드래그 시작, e.preventDefault()
// onMouseMove/onTouchMove → 추적 (passive: false)
// onMouseUp/onTouchEnd → 화면 중앙 기준 side 결정 → setSide()

// PiP 모드일 때만 드래그 핸들 표시 (영상 상단 바)
// 구성 요소:
//   - 상단 바: 제목(truncate) + X 버튼
//   - IFrame 컨테이너 (ref로 YT.Player 초기화)
//   - transition: 'all 200ms ease' (snap 애니메이션)
```

### 3.2 usePipObserver

```ts
// src/features/pip/hooks/usePipObserver.ts
// Design Ref: §3.2 — IntersectionObserver PiP 트리거

// 역할:
// - containerRef (인라인 영역 div)를 observe
// - isIntersecting=false → setPip(true)
// - isIntersecting=true  → setPip(false)
// - 마운트 시 getBoundingClientRect() → setInlineRect()
// - 언마운트 시 observer.disconnect()

// 시그니처:
// usePipObserver(containerRef: RefObject<HTMLDivElement>): void
```

### 3.3 PlaylistPlayer (수정)

```tsx
// src/features/playlist/components/PlaylistPlayer.tsx (수정)
// Design Ref: §3.3 — 인라인 플레이스홀더 + PiP store 연동

// 변경 사항:
// 1. YouTube IFrame 초기화 로직 제거 (playerRef, YT.Player 등)
// 2. inlineContainerRef: 인라인 영역 div에 부착
//    - usePipObserver(inlineContainerRef) 호출
// 3. IFrame 자리 → InlinePlayerPlaceholder:
//    - isPlaying=false: 썸네일 이미지 + 재생 버튼 오버레이
//    - isPlaying=true:  어두운 배경 + "▶ 재생 중" 텍스트
// 4. 재생 버튼 클릭:
//    store.play({ playlistId, youtubeId, title, thumbnailUrl })
// 5. 트랙 클릭 (seekToTrack):
//    store.seekTo(track.startSec)
//    → PipPlayerPortal에서 player.seekTo() 실행

// 썸네일 URL:
// https://img.youtube.com/vi/{youtubeId}/mqdefault.jpg
```

---

## 4. 상세 동작 설계

### 4.1 인라인 ↔ PiP 좌표 동기화

```
문제: PiP가 인라인 영역 위에 겹쳐 보이려면 정확한 좌표 필요
해결:
  1. PlaylistPlayer mount 시 getBoundingClientRect() → setInlineRect()
  2. window resize 이벤트 시 재계산 (ResizeObserver 또는 window.addEventListener)
  3. PipPlayerPortal이 inlineRect로 style 적용

주의: scroll offset 고려
  - getBoundingClientRect()는 이미 뷰포트 기준이므로 scroll 무관
  - position:fixed이므로 그대로 사용 가능
```

### 4.2 드래그 snap 로직

```ts
// PipPlayerPortal 내부
const handleDragEnd = (clientX: number) => {
  const center = window.innerWidth / 2;
  setSide(clientX < center ? 'left' : 'right');
};

// mousedown → dragStartX 저장 (드래그 시작)
// mousemove → 드래그 중 시각적 이동 (transform:translateX)
// mouseup → handleDragEnd(e.clientX)
// touchend → handleDragEnd(e.changedTouches[0].clientX)

// snap 후 transform 초기화, CSS transition으로 애니메이션
```

### 4.3 YouTube Player 생명주기

```
PipPlayerPortal mount:
  - YT script 로드 (중복 방지: document.querySelector 확인)
  - onYouTubeIframeAPIReady → YT.Player 초기화

store.play(newYoutubeId) 수신 (useEffect):
  - player.loadVideoById(newYoutubeId) → 새 영상 로드
  - 재생 자동 시작

store.stop() 수신:
  - player.stopVideo()
  - (IFrame 자체는 파괴하지 않음 — 재사용)

store.seekTo(sec) 수신:
  - player.seekTo(sec, true)
  - player.playVideo()

PipPlayerPortal unmount (앱 종료 시):
  - player.destroy()
```

### 4.4 페이지 이동 시 동작

```
상세 페이지 → 홈 이동:
  PlaylistPlayer 언마운트 → usePipObserver disconnect
  isPip 상태 유지 (store는 살아있음)
  PipPlayerPortal은 layout에 있어 생존 → 코너에 표시 유지

홈 → 상세 페이지(같은 플리) 이동:
  PlaylistPlayer mount → inlineRect 재계산
  isPip=true 이면: 스크롤 위치 확인
    → 인라인 영역이 뷰포트 안: setPip(false) (자동)
    → 인라인 영역이 뷰포트 밖: isPip=true 유지

홈 → 다른 상세 페이지:
  새 재생 버튼 클릭 시 store.play(new) → 교체
  (기존 isPip=true 상태에서 새 youtubeId로 교체)
```

---

## 5. UI 스펙

### 5.1 PiP 컴포넌트 (isPip=true)

```
┌─────────────────────────────────┐  ← 드래그 핸들 (cursor:grab)
│ ▷ 플레이리스트 제목...     [X] │  ← 상단 바 h-7, bg-black/80
├─────────────────────────────────┤
│                                 │
│        YouTube IFrame           │  ← 240×135 (isPip=true)
│                                 │
└─────────────────────────────────┘
  총 높이: 135 + 28 = 163px
  border-radius: 8px
  box-shadow: 0 4px 20px rgba(0,0,0,0.5)
  z-index: 50
```

### 5.2 인라인 플레이스홀더

```
재생 전:
┌─────────────────────────────────┐
│         [썸네일 이미지]          │  ← aspect-video, 썸네일 URL
│    ┌──────────────────┐         │
│    │  ▶  재생         │         │  ← 중앙 재생 버튼 오버레이
│    └──────────────────┘         │
└─────────────────────────────────┘

재생 중 (isPip=false):
  → PipPlayerPortal이 정확히 이 위에 겹쳐 있음
  → 플레이스홀더는 display:none 또는 투명

재생 중 (isPip=true):
┌─────────────────────────────────┐
│  bg-black/90, aspect-video       │
│     ▶ 재생 중 (PiP 모드)         │  ← 텍스트 + 작은 썸네일
└─────────────────────────────────┘
```

### 5.3 트랜지션

| 상태 전환 | 애니메이션 |
|---------|-----------|
| 인라인 → PiP | `transition: all 200ms ease` (위치 + 크기 동시 변경) |
| PiP → 인라인 | `transition: all 200ms ease` |
| 드래그 snap | `transition: right/left 200ms ease` |
| 등장 (isPlaying true) | `transition: opacity 150ms` |
| 종료 (X 버튼) | `transition: opacity 150ms` → display:none |

---

## 6. 파일 구조

```
src/
├── features/
│   └── pip/
│       ├── store.ts                          # Zustand PiP 상태 (신규)
│       ├── components/
│       │   └── PipPlayerPortal.tsx            # 레이아웃 레벨 IFrame 컨테이너 (신규)
│       └── hooks/
│           └── usePipObserver.ts              # IntersectionObserver hook (신규)
└── features/
    └── playlist/
        └── components/
            └── PlaylistPlayer.tsx             # 수정 (IFrame 제거, 플레이스홀더 교체)

src/app/[locale]/layout.tsx                    # 수정 (PipPlayerPortal 삽입)
```

---

## 7. 타입 정의

```ts
// src/features/pip/store.ts 타입 요약

export interface PlayPayload {
  playlistId: string;
  youtubeId: string;
  title: string;
  thumbnailUrl: string;   // https://img.youtube.com/vi/{id}/mqdefault.jpg
}

export interface InlineRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export type PipSide = 'right' | 'left';
```

---

## 8. 테스트 시나리오

| 시나리오 | 기대 결과 |
|---------|---------|
| 상세 페이지 진입 → 재생 버튼 클릭 | PiP 인라인 영역 위에 크게 표시, 재생 시작 |
| 재생 중 스크롤 다운 | PiP 우하단 코너로 200ms 애니메이션 이동 |
| PiP 코너에서 스크롤 업 | PiP 인라인 영역으로 복귀 |
| PiP 드래그 (왼쪽) | 좌하단으로 snap |
| PiP 드래그 (오른쪽) | 우하단으로 snap |
| 모바일 터치 드래그 | 좌/우 snap 정상 동작 |
| 페이지 이동 중 PiP | 재생 유지, 코너 위치 유지 |
| X 버튼 클릭 | PiP 사라짐, 재생 중단 |
| 새 플리 재생 버튼 클릭 | 기존 PiP 교체, 새 영상 재생 |
| 트랙 클릭 (PiP 중) | 해당 타임스탬프로 seek, 재생 유지 |

---

## 9. 구현 주의사항

### 9.1 layout.tsx Server Component 경계

```tsx
// layout.tsx — Server Component이므로 직접 'use client' 불가
// PipPlayerPortal은 별도 파일로 분리하여 import

import PipPlayerPortal from '@/features/pip/components/PipPlayerPortal';

// layout JSX 내부
<main className="flex-1">{children}</main>
<PipPlayerPortal />  // footer 위에 삽입
```

### 9.2 터치 이벤트 passive 옵션

```tsx
// 드래그 중 스크롤 방지
useEffect(() => {
  const el = pipRef.current;
  if (!el) return;
  const onTouchMove = (e: TouchEvent) => {
    if (isDragging) e.preventDefault();
  };
  el.addEventListener('touchmove', onTouchMove, { passive: false });
  return () => el.removeEventListener('touchmove', onTouchMove);
}, [isDragging]);
```

### 9.3 YouTube API 싱글턴

```ts
// window.onYouTubeIframeAPIReady 덮어쓰기 방지
// 기존 핸들러 체인 유지
const prevReady = window.onYouTubeIframeAPIReady;
window.onYouTubeIframeAPIReady = () => {
  prevReady?.();
  initPlayer();
};
```

### 9.4 inlineRect scroll 재계산

```ts
// ResizeObserver로 레이아웃 변경 감지
// window scroll 이벤트는 제외 (fixed position이므로 불필요)
// 단, 첫 mount + resize 시에만 getBoundingClientRect() 호출
```

---

## 10. 구현 순서

### Module Map

| 모듈 | 파일 | 의존성 |
|------|------|--------|
| M1: PiP Store | `pip/store.ts` | 없음 |
| M2: PipPlayerPortal | `pip/components/PipPlayerPortal.tsx` | M1 |
| M3: usePipObserver | `pip/hooks/usePipObserver.ts` | M1 |
| M4: PlaylistPlayer 수정 | `playlist/components/PlaylistPlayer.tsx` | M1, M3 |
| M5: layout.tsx 수정 | `app/[locale]/layout.tsx` | M2 |

### 11. Implementation Guide

#### 11.1 구현 순서

1. **M1** `pip/store.ts` — Zustand store 작성
2. **M2** `pip/components/PipPlayerPortal.tsx` — IFrame + 드래그 + 위치 CSS
3. **M3** `pip/hooks/usePipObserver.ts` — IntersectionObserver hook
4. **M4** `playlist/components/PlaylistPlayer.tsx` — 인라인 IFrame 제거, 플레이스홀더 + store 연동
5. **M5** `app/[locale]/layout.tsx` — `<PipPlayerPortal />` 삽입

#### 11.2 핵심 검증 포인트

- PiP 등장 시 인라인 영역과 pixel-perfect 겹침 (좌표 확인)
- 스크롤 PiP 전환 애니메이션 200ms 자연스러운지
- 페이지 이동 후 IFrame 재생 유지 여부
- 드래그 snap 좌/우 (mouse + touch)
- 새 플리 재생 시 교체 정상 동작

#### 11.3 Session Guide

**추천 세션 플랜 (1세션):**
모든 모듈이 상호 의존적이지 않아 1세션 구현 가능.

| 세션 | 스코프 | 내용 |
|------|--------|------|
| Session 1 | M1~M5 (전체) | Store → Portal → Observer → Player 수정 → Layout 연결 |

`/pdca do pip-player` 로 전체 구현 진행.
