---
template: design
version: 1.3
feature: global-toast-system
date: 2026-04-26
author: iamjinwang@gmail.com
project: ClipClef
---

# global-toast-system Design Document

> **Summary**: Zustand 기반 글로벌 토스트 시스템 — 단일 스토어 + 헬퍼 API + 단일 렌더러로 분산된 3종 토스트와 12곳 alert를 흡수.
>
> **Status**: Draft
> **Planning Doc**: [global-toast-system.plan.md](../../01-plan/features/global-toast-system.plan.md)
> **Architecture**: Option B — Plan-spec (3 files)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 분산된 토스트와 alert로 인한 UX 비일관 — 같은 종류 액션이 화면마다 다르게 피드백되어 신뢰감 저하. PRD F5 발행 플로우의 보상감 부재가 큐레이터 전환율 리스크. |
| **WHO** | 모든 사용자 (특히 어드민 + 큐레이터) |
| **RISK** | 중간 — 인프라 신설 + 15+ 파일. 의존성 0, DB 무영향, behavior breaking 없음 |
| **SUCCESS** | alert 0건 + 3종 토스트 통합 + 7개 mutation 피드백 추가 |
| **SCOPE** | P0 + P1 + P3. P2(Like/Save 실패, ProfileForm)는 후속 plan |

---

## 1. Overview

### 1.1 Design Goals

- **단일 진실 소스(SSOT)**: 토스트 상태가 하나의 Zustand 스토어에서만 관리
- **호출 부담 0**: 어디서든 `toast.success(...)` 한 줄로 사용
- **레이아웃 1회 마운트**: 컨테이너는 RootLayout에 한 번만, 어떤 페이지에서 호출해도 동작
- **시각 일관성**: 양식·위치·애니메이션을 모든 토스트에 강제

### 1.2 Design Principles

- **Single Responsibility**: store(상태) / helper(public API) / container(렌더) 책임 분리
- **No Dependency**: 외부 토스트 라이브러리 없이 Zustand만 사용 (이미 도입된 의존성)
- **Composition over Configuration**: 옵션 객체보다 명시적 헬퍼 (`success` vs `error` vs `info`)
- **Recovery-friendly**: 한 번 등록되면 5분 cache TTL이나 navigation 영향 없이 자체 timer로 dismiss

### 1.3 Open Questions Resolved

§7 Open Questions of Plan에 대한 결정:
- **댓글 작성 토스트**: 기본 ON
- **다중 토스트 max**: 무제한
- **`toast.info` 색상**: 뉴트럴 (`var(--muted)`)

---

## 2. Architecture

### 2.1 Module Structure

```
src/lib/toast/
  ├─ store.ts        ── Zustand store (Toast[] 상태 + push/dismiss/clear)
  └─ index.ts        ── public API (toast.success / .error / .info)

src/components/layout/
  └─ ToastContainer.tsx   ── 렌더러 (RootLayout에서 1회 마운트)
```

### 2.2 Data Flow

```
                    ┌─────────────────┐
   call site ──→    │  toast.error()  │  (helper)
   (any tsx)        └────────┬────────┘
                             │ push({...})
                             ▼
                    ┌─────────────────┐
                    │   toastStore    │  (Zustand)
                    │   toasts: Toast[]│
                    └────────┬────────┘
                             │ subscribe
                             ▼
                    ┌─────────────────┐
                    │ ToastContainer  │  (mounted in RootLayout)
                    │   render stack  │
                    └────────┬────────┘
                             │ auto-dismiss (timer per toast)
                             ▼
                          dismiss(id)
```

---

## 3. Data Model

### 3.1 Types (`src/lib/toast/store.ts`)

```ts
export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;            // crypto.randomUUID()
  message: string;
  type: ToastType;
  durationMs: number;    // resolved default per type
  createdAt: number;     // Date.now()
}

interface ToastStore {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id' | 'createdAt'>) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}
```

### 3.2 Default Durations

| Type | Default ms | Rationale |
|---|---|---|
| `success` | 2500 | Letterboxd-tier "지나가는 격려" — 짧을수록 좋음 |
| `error` | 4000 | 메시지 읽을 시간 필요 |
| `info` | 3500 | 안내성 (인앱 브라우저 등). 명령적이지 않으나 읽혀야 함 |

호출 시 `durationMs`로 override 가능.

---

## 4. API Contract

### 4.1 Public Helper (`src/lib/toast/index.ts`)

```ts
interface ToastOptions {
  durationMs?: number;
}

export const toast = {
  success(message: string, opts?: ToastOptions): string;
  error(message: string, opts?: ToastOptions): string;
  info(message: string, opts?: ToastOptions): string;
  dismiss(id: string): void;
  clear(): void;
};
```

- 모든 메서드는 ID(string)를 반환 → 호출자가 수동 dismiss 가능
- 내부 구현은 store의 `push()` / `dismiss()` / `clear()` 호출

### 4.2 Store Actions

| Action | 시그니처 | 동작 |
|---|---|---|
| `push` | `(toast) => id` | 배열 push, ID 반환. setTimeout으로 durationMs 후 자동 dismiss 등록 |
| `dismiss` | `(id) => void` | 해당 id 토스트 제거 |
| `clear` | `() => void` | 전체 제거 |

### 4.3 Side Effects

- `push`는 setTimeout을 등록하지만 **타이머 ID는 컴포넌트 외부(closure)에 저장하지 않음** — 자동 dismiss는 `setTimeout(dismiss, ms)` 호출만 하고, 일찍 dismiss되어도 setTimeout은 그냥 실행되지만 이미 사라진 ID라 no-op

---

## 5. Component Design

### 5.1 ToastContainer

```tsx
'use client';
export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] pointer-events-none flex flex-col gap-2 items-center">
      {toasts.map((t) => <ToastItem key={t.id} toast={t} />)}
    </div>
  );
}
```

### 5.2 ToastItem (inlined within Container)

| 부분 | 양식 |
|---|---|
| 컨테이너 박스 | `flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium border` |
| Success | `bg-[#1a2a1a] border-green-700 text-green-300` + 체크 아이콘(green-400, M5 13l4 4L19 7) |
| Error | `bg-red-950 border-red-800 text-red-200` + 경고 아이콘(red-400) |
| Info | `bg-[var(--muted)] border-[var(--border)] text-[var(--foreground)]` + ⓘ 아이콘 (text-secondary) |
| Animation | `animate-in fade-in slide-in-from-bottom-2 duration-300` (기존 패턴 그대로) |

### 5.3 Stack Behavior

- 다중 토스트 시 세로 스택 (`flex-col gap-2`)
- 위에서부터 시간 순 — 새 토스트가 아래에 추가
- 각 토스트는 독립 timer로 dismiss → 화면에서 제각기 사라짐 (애니메이션 fade-out, exit 액션은 v1에서 생략, fade-in만)

### 5.4 Mount Point

```tsx
// src/app/[locale]/layout.tsx
import ToastContainer from '@/components/layout/ToastContainer';
import AuthErrorToast from '@/components/layout/AuthErrorToast';

<body>
  ...
  <AuthErrorToast />     {/* trigger only — DOM 없음, toast.error 호출 */}
  <ToastContainer />     {/* 실제 렌더 */}
</body>
```

---

## 6. Sequence Diagrams

### 6.1 단일 토스트 노출 → 자동 dismiss

```
caller            toast helper        store         ToastContainer
  │                    │                │                  │
  ├──toast.success(m)─►│                │                  │
  │                    ├──push({...})──►│                  │
  │                    │                ├──[toasts: [t]]   │
  │                    │                │   subscribe─────►│ render(t)
  │                    │                │                  │
  │                    │           setTimeout(2500)        │
  │                    │                │                  │
  │                    │     [2.5s 경과]                   │
  │                    │                ├──dismiss(t.id)   │
  │                    │                ├──[toasts: []]    │
  │                    │                │   subscribe─────►│ unmount(t)
```

### 6.2 Query Param Trigger (UploadSuccessToast)

```
detail page mounts
  │
  ├──UploadSuccessToast effect runs
  │     ├──검사: ?uploaded === '1'
  │     ├──toast.success('플레이리스트가 업로드 되었어요')
  │     ├──router.replace (URL에서 ?uploaded 제거)
  │     └──fired.current = true (재실행 가드)
```

`UploadSuccessToast`는 더 이상 자체 DOM 없음. helper 호출만 하고 null 반환.

---

## 7. Edge Cases

| 케이스 | 처리 |
|---|---|
| 동일 메시지 빠른 연속 호출 (예: alert가 두 번 트리거) | 두 토스트 모두 등록·표시. Dedup 미구현 (P2 후속에서 옵션화 가능) |
| ToastContainer 언마운트 (RootLayout 전환) | 발생하지 않음 — App Router에서 RootLayout은 영구 마운트 |
| SSR 렌더 시 store 접근 | ToastContainer는 `'use client'`. helper는 client에서만 호출 (검증: server component에서 `toast.*` 호출 시도 시 Zustand가 분명한 에러) |
| Strict Mode 이중 effect | UploadSuccessToast / AuthErrorToast의 `useRef` 가드 그대로 유지 |
| 매우 긴 메시지 | `text-sm` + `max-w-sm` 강제 (필요 시 max-w 추가). 다행히 현재 모든 메시지 ≤ 50자 |
| 페이지 navigation 중 토스트 표시 | RootLayout 영구 마운트라 유지됨 |

---

## 8. Test Plan

### L1 — Unit (store)
- `push` 호출 → toasts 배열에 추가, 고유 ID 반환
- `dismiss(id)` 호출 → 해당 id만 제거
- `push` durationMs 경과 후 자동 dismiss
- 동시 다발 push → 모두 등록, 순차 dismiss

### L2 — UI Action (수동, 로컬 dev)
- 어드민 폼에서 잘못된 URL 등록 시도 → toast.error
- 플리 수정 저장 → toast.success
- 플리 업로드 → 상세 페이지 진입 시 toast.success
- 댓글 작성 → toast.success
- 댓글 삭제 → toast.success
- 인앱 브라우저에서 로그인 시도 → toast.info

### L3 — E2E (생략, manual로 갈음)
- Playwright 미도입 상태. 추후 도입 시 핵심 플로우 자동화

---

## 9. Migration / Backward Compatibility

| 기존 | 신규 |
|---|---|
| `PlaylistOwnerMenu.SnackbarToast` 함수 + `showSnackbar` callback | 함수 삭제, 내부 호출 → `toast.success/error` |
| `UploadSuccessToast` 자체 DOM | DOM 삭제, helper 호출만 (컴포넌트 자체는 `?uploaded=1` 트리거 책임으로 유지) |
| `AuthErrorToast` 자체 DOM | DOM 삭제, helper 호출만 (컴포넌트 자체는 `?auth_error=...` 트리거 책임으로 유지) |
| `alert(...)` 12곳 | `toast.error(...)` / `toast.info(...)` |

**Behavior breaking 없음** — 기존 토스트가 보였던 모든 케이스에서 동일 메시지·양식이 노출됨.

---

## 10. Risks & Mitigation

§5 Plan의 Risks 그대로. 추가 고려:

| 위험 | 완화 |
|---|---|
| Zustand store가 client만 동작 → Next.js App Router의 server component에서 호출 위반 가능 | helper에 명시적 'use client' import 강제 (TypeScript는 못 잡지만 런타임 명확). 모든 호출 사이트가 이미 client component (`'use client'` 헤더 확인됨) |
| 화면 전환 중 토스트 잔존 (의도된 동작) | RootLayout 마운트라 정상. 의도와 일치 (예: 발행 → router.push 후에도 토스트 보존) |
| 토스트 z-index 충돌 (`z-[200]` vs Modal `z-50` 등) | z-[200]이 모든 modal/dropdown보다 위. AuthErrorToast가 z-[300] 쓰던 건 글로벌 토스트로 흡수돼도 여전히 z-[200] 충분 |

---

## 11. Implementation Guide

### 11.1 File-Level Tasks

| # | File | Action | 라인 추정 |
|---|---|---|---|
| 1 | `src/lib/toast/store.ts` | 신규 — Zustand 스토어 + 자동 dismiss timer | ~60 |
| 2 | `src/lib/toast/index.ts` | 신규 — `toast.success/error/info/dismiss/clear` 헬퍼 | ~30 |
| 3 | `src/components/layout/ToastContainer.tsx` | 신규 — 렌더러 + ToastItem 인라인 | ~80 |
| 4 | `src/app/[locale]/layout.tsx` | 수정 — `<ToastContainer/>` 마운트 | +1 import +1 mount |
| 5 | `src/components/layout/AuthErrorToast.tsx` | 수정 — DOM 삭제, helper 호출 | -25, +5 |
| 6 | `src/features/playlist/components/UploadSuccessToast.tsx` | 수정 — DOM 삭제, helper 호출 | -10, +3 |
| 7 | `src/features/playlist/components/PlaylistOwnerMenu.tsx` | 수정 — `SnackbarToast`/`Snackbar` state 삭제, `showSnackbar` → `toast.*` | -45, +4 호출 |
| 8 | `src/features/admin/components/PlaylistForm.tsx` | 수정 — alert → toast.error | 1줄 |
| 9 | `src/features/admin/components/CollectionManager.tsx` | 수정 — alert × 2 → toast.error | 2줄 |
| 10 | `src/features/admin/components/GenreManager.tsx` | 수정 — alert × 5 → toast.error | 5줄 |
| 11 | `src/app/[locale]/me/playlists/page.tsx` | 수정 — alert → toast.error | 1줄 |
| 12 | `src/components/layout/Header.tsx` | 수정 — alert → toast.info | 1줄 |
| 13 | `src/components/layout/MobileBottomNav.tsx` | 수정 — alert → toast.info | 1줄 |
| 14 | `src/features/curation/components/PublishFlow.tsx` | 수정 — 발행 성공 후 toast.success | +2 |
| 15 | `src/features/interaction/components/CommentForm.tsx` | 수정 — 작성 성공 후 toast.success | +2 |
| 16 | `src/features/interaction/components/CommentList.tsx` | 수정 — 삭제 성공 후 toast.success | +2 |

### 11.2 Implementation Order

다음 순서가 안전 (점진 검증):
1. **Module 1 (인프라)**: store.ts → index.ts → ToastContainer.tsx → layout.tsx 마운트 (혼자만 띄워서 확인)
2. **Module 2 (기존 흡수)**: PlaylistOwnerMenu / UploadSuccessToast / AuthErrorToast — 시각 회귀 0이어야 함
3. **Module 3 (alert 교체)**: admin 5파일 + /me/playlists + layout 2파일
4. **Module 4 (mutation 피드백)**: PublishFlow + CommentForm + CommentList

### 11.3 Session Guide

| Session | Module | 파일 | 검증 |
|---|---|---|---|
| 1 | M1 인프라 | 1, 2, 3, 4 | 임시 호출로 토스트 노출 확인 |
| 2 | M2 흡수 | 5, 6, 7 | 플리 수정/업로드/로그인 오류 회귀 |
| 3 | M3 alert | 8-13 | 어드민 액션 / 인앱 브라우저 |
| 4 | M4 mutation | 14, 15, 16 | 발행/댓글 작성·삭제 |

→ `/pdca do global-toast-system --scope module-1` 식으로 모듈 단위 진행 가능. 작은 시스템이라 한 세션에 다 처리해도 OK.

---

## 12. Out of Scope

§6 Plan과 동일:
- LikeButton / SaveButton / Follow 실패 토스트 (P2)
- ProfileForm 자체 인라인 → 글로벌 통합 (P2)
- Toast undo action (Letterboxd 패턴) — 먼 미래
- Toast i18n — 다국어 도입 시
- Toast queue max / dedup — 사용 빈도 보고 결정
