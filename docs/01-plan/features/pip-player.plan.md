# Plan: pip-player

> Feature: pip-player
> Phase: Plan
> Date: 2026-04-12
> Status: active

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 플리 상세 페이지에서 재생 중 스크롤하거나 다른 페이지로 이동하면 YouTube IFrame이 파괴되어 재생이 중단됨. 트랙리스트·댓글 탐색과 동시 청취 불가. |
| **Solution** | YouTube IFrame을 레이아웃 레벨 PiP 컴포넌트로 이동. 스크롤 아웃 시 코너 고정, 페이지 이동 시 생존, 좌/우 드래그로 위치 조정 가능. |
| **Function UX Effect** | 재생을 멈추지 않고 트랙리스트·댓글·타 페이지 탐색 가능. 좌/우 드래그로 댓글 입력 등 UI 충돌 방지. |
| **Core Value** | 청취 흐름 유지 — 플리를 "틀어두고 탐색"하는 경험을 유튜브 뮤직 수준으로 제공. |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 재생 연속성은 음악 서비스의 핵심 UX. 현재 IFrame이 페이지·스크롤마다 파괴되는 구조를 레이아웃 레벨로 올려야 함. |
| **WHO** | 플리를 재생하면서 트랙리스트 탐색, 댓글 작성, 다른 플리 둘러보기를 동시에 하고 싶은 사용자 |
| **RISK** | IFrame DOM 이동 불가 (reload됨) → 인라인 플레이어는 플레이스홀더로 대체 필요. layout.tsx가 Server Component라 'use client' 경계 설계 필요. |
| **SUCCESS** | 스크롤 내렸을 때 PiP 자동 등장 / 페이지 이동 후 재생 유지 / 드래그로 좌우 이동 / X·새플리로 종료 |
| **SCOPE** | pip-player 기능 전담. 기존 PlaylistPlayer 인라인 플레이어는 플레이스홀더로 교체. 배포 제외(로컬 검증 후 사용자 직접 배포). |

---

## 1. 요구사항

### 1.1 기능 요구사항

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| FR-01 | 플리 상세 페이지에서 재생 시작 후 스크롤 다운하면 PiP가 우하단 코너에 등장 | P0 |
| FR-02 | 플리 상세 페이지에서 스크롤 업하면 PiP가 사라지고 인라인 플레이어 영역 복원 | P0 |
| FR-03 | 다른 페이지로 이동해도 PiP 재생 유지 (크로스 페이지 생존) | P0 |
| FR-04 | PiP를 좌/우로 드래그하여 위치 변경 (우하단 ↔ 좌하단) | P0 |
| FR-05 | 모바일 터치 드래그 지원 (touchstart/touchmove/touchend) | P0 |
| FR-06 | X 버튼 클릭 시 PiP 종료 (재생 중단) | P0 |
| FR-07 | 새로운 플리 재생 시 기존 PiP 종료 후 새 플리로 교체 | P0 |
| FR-08 | PiP 영상 크기: 240×135px (16:9 고정), 좌/우 이동 후 snap | P1 |
| FR-09 | PiP 위에 플리 제목 표시 (한 줄, truncate) | P1 |

### 1.2 비기능 요구사항

| ID | 요구사항 |
|----|---------|
| NFR-01 | IFrame은 레이아웃에 단 하나만 존재 (DOM 이동 없음) |
| NFR-02 | 재생 중이 아닐 때 PiP 미표시 |
| NFR-03 | layout.tsx는 Server Component 유지 — PiP는 별도 'use client' 컴포넌트로 분리 |
| NFR-04 | 배포 제외: 로컬 검증 후 사용자 직접 배포 |

---

## 2. 설계 방향

### 2.1 핵심 구조

```
[locale]/layout.tsx  (Server Component)
└── PipPlayerPortal  (Client Component, 'use client')
     └── YouTube IFrame  ← 항상 여기에만 존재
          - 평상시: display:none (재생 없을 때)
          - 상세 페이지 상단 시: position:fixed → 인라인 영역 좌표에 겹쳐 보임 (크게)
          - 스크롤 아웃 또는 타 페이지: position:fixed 우/좌 하단 코너 (작게)

[locale]/playlist/[id]/page.tsx
└── PlaylistPlayer  → InlinePlayerPlaceholder로 교체
     - 재생 전: 썸네일 + 재생 버튼
     - 재생 중: "▶ 재생 중" 표시 + IntersectionObserver로 PiP 트리거
```

### 2.2 Zustand Store

```ts
// src/features/pip/store.ts
interface PipStore {
  playlistId: string | null;
  playlistTitle: string;
  youtubeId: string | null;
  isPlaying: boolean;       // IFrame 재생 여부
  isPip: boolean;           // 코너 PiP 모드 여부
  side: 'right' | 'left';  // 드래그 위치
  play: (payload: PlayPayload) => void;
  stop: () => void;
  setPip: (v: boolean) => void;
  setSide: (side: 'right' | 'left') => void;
}
```

### 2.3 IntersectionObserver 흐름

```
1. 상세 페이지 진입 + 재생 시작
   → usePipStore.play({ playlistId, youtubeId, title })
   → isPlaying = true, isPip = false

2. InlinePlayerPlaceholder에 ref 부착
   → IntersectionObserver 감시

3. 플레이스홀더가 뷰포트 밖으로 나가면
   → setPip(true) → PiP 코너 이동

4. 다시 뷰포트 안으로 돌아오면
   → setPip(false) → 인라인 영역으로 PiP 이동

5. 타 페이지 이동: Observer 없어짐 → isPip 유지 (코너 상태)
   → PipPlayerPortal이 layout에 있어서 생존
```

---

## 3. 파일 구조

### 신규 파일

| 파일 | 역할 |
|------|------|
| `src/features/pip/store.ts` | Zustand PiP 상태 |
| `src/features/pip/components/PipPlayerPortal.tsx` | 레이아웃 레벨 PiP 컴포넌트 (YouTube IFrame 포함) |
| `src/features/pip/hooks/usePipObserver.ts` | IntersectionObserver hook |

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/app/[locale]/layout.tsx` | `<PipPlayerPortal />` 추가 |
| `src/features/playlist/components/PlaylistPlayer.tsx` | 인라인 IFrame 제거 → `InlinePlayerPlaceholder` + `usePipObserver` 연동 |

---

## 4. 드래그 동작 설계

- **snap 방식**: 드래그 시작 → 마우스/터치 위치 기준 `side` 계산 → mouseup/touchend 시 `left` or `right`로 snap
- **snap 기준**: 드래그 중 화면 중앙(window.innerWidth / 2) 기준으로 좌/우 결정
- **애니메이션**: `transition: all 200ms ease` — snap 시 부드럽게 이동
- **모바일**: `touchstart`, `touchmove`, `touchend` 이벤트 사용

---

## 5. 성공 기준

| ID | 기준 |
|----|------|
| SC-01 | 재생 후 스크롤 다운 → 1초 이내 PiP 코너 등장, 재생 유지 |
| SC-02 | 다른 페이지로 이동 → 재생 중단 없이 PiP 유지 |
| SC-03 | PiP 드래그 → 좌/우 snap 정상 동작 (mouse + touch) |
| SC-04 | X 버튼 → PiP 즉시 종료, IFrame destroy |
| SC-05 | 다른 플리 재생 버튼 클릭 → 기존 PiP 사라지고 새 플리로 교체 |
| SC-06 | PiP가 댓글 입력창과 겹칠 때 드래그로 반대쪽으로 이동 가능 |

---

## 6. 리스크

| 리스크 | 대응 |
|--------|------|
| layout.tsx Server Component — PiP Client 경계 처리 | `PipPlayerPortal`을 별도 Client Component로 분리, layout에서 단순 삽입 |
| IFrame CSS position 계산 — 인라인 ↔ 코너 좌표 정확도 | `getBoundingClientRect()` 폴링 대신 IntersectionObserver + 고정 CSS 값 사용 |
| YouTube IFrame API 초기화 중복 | `window.YT.Player` 단일 인스턴스 보장, store에서 ref 관리 |
| 모바일 드래그 중 스크롤과 충돌 | `touchstart`에서 `e.preventDefault()` + `passive: false` 옵션 |
