# Feature Plan: global-toast-system

## Executive Summary

| 관점 | 내용 |
|------|------|
| Problem | 토스트 컴포넌트가 3종으로 분산(`PlaylistOwnerMenu.SnackbarToast` / `UploadSuccessToast` / `AuthErrorToast`)되고, alert() 12곳·피드백 없는 mutation 다수 — 일관된 사용자 피드백 부재 |
| Solution | Zustand 기반 글로벌 토스트 스토어 + 단일 `<ToastContainer/>` + `toast.success()/.error()/.info()` 헬퍼. 기존 3종 흡수, alert 12곳 교체, 핵심 mutation 피드백 추가 |
| UX Effect | 모든 화면에서 동일 시각·위치·동작의 토스트. 발행/댓글 등 보상감 있는 액션이 명시적 성공 신호로 끝남 |
| Core Value | "ClipClef은 동작이 매끈하고 신뢰감 있는 도구다" — 작은 인터랙션의 일관성으로 메타 큐레이션 도구 신뢰도 강화 |

## Context Anchor

| | |
|--|--|
| WHY | 분산된 토스트와 alert로 인한 UX 비일관 — 같은 종류 액션이 화면마다 다르게 피드백되어 신뢰감 저하. PRD F5 발행 플로우의 보상감 부재가 큐레이터 전환율 리스크. |
| WHO | 모든 사용자 (특히 어드민 + 큐레이터) |
| RISK | 중간 — 인프라 신설(Zustand 슬라이스 + Provider) + 15+ 파일 변경. 다만 추가 의존성 0, DB 무영향, behavior breaking 없음 |
| SUCCESS | (1) `alert()` src/ 잔존 0건 (의도된 confirm 제외) (2) 기존 3종 토스트 컴포넌트 → 1종으로 통합 (3) PublishFlow / Comment / 인앱 브라우저 안내 등 7곳에 새 토스트 |
| SCOPE | P0(alert 교체) + P1(핵심 mutation 피드백) + P3(인프라 통합). P2(Like/Save 실패, ProfileForm)는 별도 follow-up |

## 1. 요구사항

### 1.1 인프라 (P3)

**`src/lib/toast/store.ts`** — Zustand 스토어
- 상태: `toasts: Toast[]` (id, message, type, durationMs)
- 액션: `push(toast)`, `dismiss(id)`, `clear()`
- 자동 dismiss: durationMs 후 자동 제거 (default 2500ms, error는 4000ms)

**`src/lib/toast/index.ts`** — 헬퍼 API
```ts
toast.success(msg, opts?)   // 그린 (기존 SnackbarToast success와 동일)
toast.error(msg, opts?)     // 레드 (기존 error와 동일)
toast.info(msg, opts?)      // 뉴트럴 (옵션, 신규)
```

**`src/components/layout/ToastContainer.tsx`** — 렌더러 (client)
- 위치: `fixed bottom-6 left-1/2 -translate-x-1/2 z-[200]`
- 양식: 기존 `PlaylistOwnerMenu.SnackbarToast` 디자인 그대로 (그린/레드 박스 + 체크/경고 아이콘)
- 다중 토스트 시 세로 스택 (위에서부터 fade-in)
- `<RootLayout>`에서 1회 마운트

### 1.2 기존 토스트 흡수 (P3)

| 컴포넌트 | 처리 |
|---|---|
| `PlaylistOwnerMenu.SnackbarToast` (inline) | **삭제**. `showSnackbar()` → `toast.success()` / `toast.error()` 호출로 교체 |
| `UploadSuccessToast` (query param) | **유지하되 내부 구현 교체**. `?uploaded=1` 감지 후 `toast.success('플레이리스트가 업로드 되었어요')` 호출. DOM 자체는 삭제 |
| `AuthErrorToast` (query param) | **유지하되 내부 구현 교체**. `?auth_error=...` 감지 후 `toast.error(message)` 호출. DOM 자체는 삭제 |

> 두 토스트는 query-param-trigger 책임이 있어 컴포넌트 자체는 보존(detail page / RootLayout 마운트 유지). 내부 DOM만 글로벌 토스트 호출로 교체.

### 1.3 alert() → toast 교체 (P0, 12곳)

| 파일 | 현재 alert | 변경 후 |
|---|---|---|
| `src/features/admin/components/PlaylistForm.tsx:357` | `alert(e.message)` | `toast.error(...)` |
| `src/features/admin/components/CollectionManager.tsx:120` | 이미지 업로드 실패 | `toast.error(...)` |
| `src/features/admin/components/CollectionManager.tsx:141` | 저장 실패 | `toast.error(...)` |
| `src/features/admin/components/GenreManager.tsx:76` | 업로드 실패 | `toast.error(...)` |
| `src/features/admin/components/GenreManager.tsx:88` | 저장 실패 | `toast.error(...)` |
| `src/features/admin/components/GenreManager.tsx:100` | 저장 실패 | `toast.error(...)` |
| `src/features/admin/components/GenreManager.tsx:128` | 삭제 실패 | `toast.error(...)` |
| `src/features/admin/components/GenreManager.tsx:230` | 생성 실패 | `toast.error(...)` |
| `src/app/[locale]/me/playlists/page.tsx:251` | YouTube export 실패 | `toast.error(...)` |
| `src/components/layout/Header.tsx:209` | 인앱 브라우저 안내 | `toast.info(...)` (긴 메시지라 info 톤 적합) |
| `src/components/layout/MobileBottomNav.tsx:64` | 인앱 브라우저 안내 | `toast.info(...)` |

> `confirm()` 류는 토스트로 교체 안 함 (사용자 응답이 필요한 modal 동작이라 의도가 다름).

### 1.4 mutation 피드백 추가 (P1, 3종)

**(a) PublishFlow 발행 성공**
- 현재: `onClose()`만 호출 → 모달 닫힘 + 끝
- 변경: 발행 직후 `toast.success('큐레이션이 발행되었어요')` + 라이브러리 invalidate. (이미 발행한 큐레이션 페이지로 router.push 할 수도 있지만 별도 이슈 — 이번엔 토스트만)

**(b) CommentForm 작성 성공**
- 현재: 댓글이 즉시 리스트에 추가되며 인풋만 클리어
- 변경: `toast.success('댓글을 남겼어요')` (옵션 — 사용자 의견 받기 가능, 일단 기본 ON)

**(c) CommentList 삭제 성공**
- 현재: 즉시 사라짐, 피드백 0
- 변경: `toast.success('댓글을 삭제했어요')`

> 댓글 작성 토스트는 약간 시끄러울 수 있음. 일단 포함하되, 베타 알파 유저 피드백 받고 줄일 수 있음.

### 1.5 토스트 양식 명세

```
┌────────────────────────────────────────┐
│ Success (default 2500ms)               │
│   bg: #1a2a1a   border: green-700      │
│   text: green-300   icon: green-400 ✓  │
├────────────────────────────────────────┤
│ Error (default 4000ms)                 │
│   bg: red-950   border: red-800        │
│   text: red-200   icon: red-400 ⚠      │
├────────────────────────────────────────┤
│ Info (default 3500ms)                  │
│   bg: var(--muted)   border: var(--border) │
│   text: var(--foreground)   icon: ⓘ    │
└────────────────────────────────────────┘
```

위치: `fixed bottom-6 left-1/2 -translate-x-1/2 z-[200]`. 모바일 동일.
다중 시: 세로 스택 (gap-2), 위에서부터 fade-in / fade-out.

## 2. 변경 파일 목록

### 2.1 신규 (3개)

| 파일 | 역할 |
|---|---|
| `src/lib/toast/store.ts` | Zustand 토스트 스토어 |
| `src/lib/toast/index.ts` | `toast.success()/.error()/.info()` 헬퍼 |
| `src/components/layout/ToastContainer.tsx` | 토스트 렌더러 (RootLayout 마운트) |

### 2.2 수정 (15개)

| 파일 | 변경 |
|---|---|
| `src/app/[locale]/layout.tsx` | `<ToastContainer/>` 마운트, `<AuthErrorToast/>` 유지 (내부 변경) |
| `src/components/layout/AuthErrorToast.tsx` | DOM 제거, query 감지 후 `toast.error()` 호출만 |
| `src/features/playlist/components/UploadSuccessToast.tsx` | DOM 제거, query 감지 후 `toast.success()` 호출만 |
| `src/features/playlist/components/PlaylistOwnerMenu.tsx` | `SnackbarToast` 인라인 컴포넌트 + state 삭제, `showSnackbar` → `toast.*` |
| `src/features/admin/components/PlaylistForm.tsx` | alert → toast.error |
| `src/features/admin/components/CollectionManager.tsx` | alert → toast.error (2곳) |
| `src/features/admin/components/GenreManager.tsx` | alert → toast.error (5곳) |
| `src/app/[locale]/me/playlists/page.tsx` | alert → toast.error |
| `src/components/layout/Header.tsx` | alert → toast.info |
| `src/components/layout/MobileBottomNav.tsx` | alert → toast.info |
| `src/features/curation/components/PublishFlow.tsx` | 발행 성공 후 toast.success |
| `src/features/interaction/components/CommentForm.tsx` | 작성 성공 후 toast.success |
| `src/features/interaction/components/CommentList.tsx` | 삭제 성공 후 toast.success |

### 2.3 변경하지 않는 것 (Out of Scope)

- `confirm()` 류 (사용자 응답 필요)
- `useLike` / `useCollection` 옵티미스틱 토글의 실패 피드백 (P2 — 별도 plan)
- `ProfileForm` 자체 인라인 "저장됨" 표시 (P2 — 별도 plan)
- 알림 시스템 (`/notifications`) — 다른 영역
- 토스트 로컬라이제이션 (현재 ko 단일)

## 3. Success Criteria

1. `grep -rn 'alert(' src/` 결과에서 토스트 후보 12곳 0건 (confirm() 등 의도된 모달은 제외)
2. `PlaylistOwnerMenu.SnackbarToast` 함수 정의 제거 (글로벌 토스트로 흡수)
3. `UploadSuccessToast`, `AuthErrorToast` 자체 DOM 제거 (호출만 남음)
4. `<ToastContainer/>` 가 `app/[locale]/layout.tsx`에서 마운트됨
5. PublishFlow 발행 성공 시 `toast.success` 호출 (코드 grep으로 확인)
6. CommentForm 작성 / CommentList 삭제 성공 시 `toast.success` 호출
7. `tsc --noEmit` 통과
8. 토스트 양식이 §1.5 명세와 일치 (그린 success / 레드 error / 뉴트럴 info)
9. 다중 토스트 시 세로 스택 동작 (직접 호출 2회 시 두 개 동시 표시)
10. 회귀 0 — 기존 플리 수정/삭제 flow, 업로드 → 상세 페이지 토스트, 로그인 오류 토스트 모두 동일하게 작동

## 4. Risks & Mitigation

| 위험 | 완화 |
|---|---|
| 다중 토스트 스택 미구현으로 빠른 연속 호출 시 마지막 것만 보임 | 스토어가 배열이라 자연스럽게 스택 처리. 동시 표시 max는 일단 무제한, 필요 시 추후 제한 |
| `'use client'` 경계 누락으로 SSR 에러 | 헬퍼 `toast.*`는 store 액션을 호출하므로 client에서만 사용. 서버 컴포넌트에서 호출 시도 시 명확한 에러 |
| 댓글 작성 토스트가 "시끄러움" — 사용자 불호 | 베타 피드백 후 P2에서 줄이거나 옵션화. 이번엔 기본 ON |
| 어드민 인앱 브라우저 안내가 info 톤이라 약하게 보임 | 메시지 자체가 명확("Safari/Chrome에서 접속")하고 사용자가 즉시 행동해야 함. info → warning 추가가 필요해지면 follow-up |
| ProfileForm의 자체 "저장됨"이 글로벌 토스트와 겹치지 않음 (이번 P2 제외라) | 의도된 차이로 유지. P2에서 통합 |

## 5. Implementation Approach

### Phase 1 — 인프라 (1 세션)
1. `src/lib/toast/store.ts` 작성 (Zustand)
2. `src/lib/toast/index.ts` 헬퍼 작성
3. `src/components/layout/ToastContainer.tsx` 작성 (기존 `SnackbarToast` 양식 재활용)
4. `app/[locale]/layout.tsx` 에 `<ToastContainer/>` 마운트
5. tsc 통과 확인

### Phase 2 — 기존 3종 흡수 (1 세션)
1. `PlaylistOwnerMenu.tsx` — 인라인 컴포넌트 제거, `showSnackbar` → `toast.*`
2. `UploadSuccessToast.tsx` — DOM 제거, `toast.success` 호출
3. `AuthErrorToast.tsx` — DOM 제거, `toast.error` 호출
4. 5분 dev 띄워 3가지 케이스 육안 확인

### Phase 3 — alert 교체 (1 세션, 11곳)
1. admin 5파일 (PlaylistForm + CollectionManager + GenreManager)
2. 사용자 영역 (`/me/playlists` YouTube export)
3. layout (Header + MobileBottomNav 인앱 브라우저 안내)

### Phase 4 — mutation 피드백 (1 세션, 3곳)
1. PublishFlow 발행 성공
2. CommentForm 작성 성공
3. CommentList 삭제 성공

### Phase 5 — 검증
- `grep -rn 'alert(' src/` 잔존 확인
- tsc --noEmit
- 로컬 dev 띄워 핵심 5 플로우 육안 (업로드 / 수정 / 삭제 / 발행 / 댓글 작성)
- 다중 토스트 (예: alert 두 번 호출되는 케이스)

## 6. Out of Scope → 후속 plan 후보

| 후속 | 내용 |
|---|---|
| `like-save-error-toast.plan` (P2) | LikeButton / SaveButton / Follow 실패 시 토스트 |
| `profile-form-toast-unify.plan` (P2) | ProfileForm 자체 "저장됨" 인라인 → 글로벌 토스트로 통합 |
| `toast-i18n.plan` (먼 미래) | 다국어 확장 시 토스트 메시지 번역 키 도입 |
| `toast-undo-action.plan` (먼 미래) | 삭제류 토스트에 "되돌리기" 액션 버튼 (Letterboxd 패턴) |

## 7. Open Questions

1. **댓글 작성 토스트 기본 ON 여부**: 위 §1.4(b)에서 기본 ON 제안. 시끄러우면 OFF로 바꿀 수 있음 — 일단 ON으로 가는 거 OK?
2. **다중 토스트 max 표시 개수**: 기본 무제한. 모바일에서 화면 가릴 수 있으니 max 3 권장 — 추가 시 큐 대기. 적용?
3. **`toast.info` 색상**: 위 §1.5는 뉴트럴 (`var(--muted)` + `var(--border)`). 파란 톤(blue-950 / blue-700)이 더 구분되는데, 어느 쪽?
