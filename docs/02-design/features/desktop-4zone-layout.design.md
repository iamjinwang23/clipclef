---
template: design
version: 1.3
feature: desktop-4zone-layout
date: 2026-04-28
author: jinwang
project: clipclef
---

# Desktop 4-Zone Layout Design Document — Phase 1 (Left Rail)

> **Summary**: Phase 1 — 데스크톱 좌측 thin rail(64px) 도입 + Header 슬림화. 모바일 BottomNav 와 1:1 메뉴 매핑.
>
> **Project**: clipclef
> **Author**: jinwang
> **Date**: 2026-04-28
> **Status**: Draft
> **Planning Doc**: [desktop-4zone-layout.plan.md](../../01-plan/features/desktop-4zone-layout.plan.md)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 데스크톱에서 헤더 액션 밀집, 발견 흐름 단절. 4-zone 정착의 첫 단계로 좌측 rail 도입. |
| **WHO** | 데스크톱 사용자 (`>=sm`). 모바일은 BottomNav 그대로 유지. |
| **RISK** | LocaleLayout body 구조 변경(flex-col → desktop 에서 flex-row)이 모든 페이지에 영향. 회귀 검증 필수. |
| **SUCCESS** | Rail 표시·동작 정상 + 헤더 액션 ≥30% 감소 + 모바일 BottomNav 와 메뉴 1:1 매핑 + 회귀 0건. |
| **SCOPE** | Phase 1 = Rail + Header 슬림화. Phase 2~3 = 별도 사이클. |

---

## 1. Overview

### 1.1 Design Goals

1. 데스크톱에 64px sticky left rail 도입, 모바일에서는 숨김.
2. Header 에서 nav/액션 제거 → 검색만 남기는 슬림화.
3. 모바일 BottomNav 와 데스크톱 Rail 의 메뉴 항목 1:1 대응 (디자인 일관성).
4. 회귀 0건 — 기존 모든 라우팅·기능이 rail 경유로 동일하게 작동.

### 1.2 Design Principles

- **Single Source of Nav Definition** — 메뉴 항목(label, icon, href, isActive 판정)을 한 곳에서 정의, BottomNav 와 Rail 가 같은 구조 공유 가능 (지금은 분리하되 confluence 옵션 열어둠).
- **Layout-shell minimal change** — `LocaleLayout` 의 body flex 구조만 desktop 에서 row 로 변경. main 내부 컨테이너는 변경 없음.
- **Hidden on mobile** — Tailwind `hidden sm:flex` 일관 사용. 별도 viewport hook 불필요.
- **Reuse existing icon assets** — `/icons/bottom-nav/*.svg` 그대로 사용 (BottomNav 와 동일 비주얼).

---

## 2. Architecture Options

### 2.0 Architecture Comparison

| Criteria | Option A: Minimal | Option B: Clean | Option C: Pragmatic |
|----------|:-:|:-:|:-:|
| **Approach** | Header 안에 좌측 rail div 삽입 | Nav 정의를 별도 `nav-config.ts` 로 추출, BottomNav/Rail 공유 | DesktopRail 단독 컴포넌트, layout 에서 마운트 |
| **New Files** | 0 | 2 (nav-config + Rail) | 1 (Rail) |
| **Modified Files** | 2 (Header, Layout) | 4 (Header, Layout, BottomNav, Rail) | 3 (Header, Layout, Rail 신규) |
| **Complexity** | Low | High | Medium |
| **Maintainability** | Low (concerns mixed) | High (single source) | High (clear ownership) |
| **Effort** | Low | High | Medium |
| **Risk** | Medium (Header coupling 증가) | Medium (BottomNav 회귀 위험) | Low (BottomNav 무변경) |
| **Recommendation** | — | 향후 nav 항목이 늘어나면 | **선택 (현 phase 적합)** |

**Selected**: **Option C — Pragmatic Balance**.

**Rationale**: BottomNav 는 이미 잘 작동 중이므로 변경 없이 유지. DesktopRail 을 독립 컴포넌트로 만들고 layout 에서 마운트. nav-config 통합은 Phase 2~3 에서 메뉴가 더 늘어나면 그때 검토. 이번엔 단일 책임 + 회귀 위험 최소가 우선.

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ html / body                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Header (sticky top)  ← 슬림 (검색만)                   │ │
│ ├──────┬──────────────────────────────────────────────────┤ │
│ │      │                                                  │ │
│ │ Rail │  Main (page children)                            │ │
│ │ (sm+)│  ─────────────────────                           │ │
│ │ 64px │                                                  │ │
│ │      │                                                  │ │
│ ├──────┴──────────────────────────────────────────────────┤ │
│ │ MobileBottomNav (mobile only)                           │ │
│ │ PersistentPlayer / MiniBar (Phase 2 에서 위치 변경)     │ │
│ │ Footer (desktop)                                        │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Component Specs

### 3.1 `DesktopRail.tsx` (신규)

**경로**: `src/components/layout/DesktopRail.tsx`

**Props**: 없음 (자체 hooks 로 user/locale/path 인지)

**구조**:
```
<aside aria-label="주 메뉴">
  ┌────────────────────────────────┐
  │ 로고 (Link to /{locale})       │  ← 상단 그룹 (1개)
  │                                │
  │ ─── gap (예: pt-6) ───         │
  │                                │
  │ 홈     (icon → /{locale})      │  ← 메인 그룹 (4개)
  │ 알림   (icon → /me/notif)      │
  │ 만들기 (icon → /upload)        │
  │ 프로필 (avatar → /me/profile)  │
  │                                │
  │ ─── flex-1 (push to bottom)─── │
  │                                │
  │ 설정 (자리만, disabled)        │  ← 하단 그룹 (1개)
  └────────────────────────────────┘
</aside>
```

**Tailwind 구조**:
```tsx
<aside
  className="hidden sm:flex flex-col w-16 sticky top-14 h-[calc(100vh-3.5rem)]
             bg-[var(--background)] border-r border-[var(--border)] z-30 py-3"
  aria-label="주 메뉴"
>
  {/* 로고 그룹 */}
  <div className="flex justify-center pb-2">
    <Link href={`/${locale}`} aria-label="홈으로">
      <img src="/logo.svg" alt="" className="h-6 w-auto" />
    </Link>
  </div>

  {/* 메인 메뉴 그룹 (top gap 포함) */}
  <nav className="flex flex-col items-center gap-1 pt-6">
    <RailItem icon="Home" href={`/${locale}`} active={isHome} label="홈" />
    <RailItem icon="Bell" href={`/${locale}/me/notifications`} active={isNotif} label="알림" badge={unreadCount} />
    <RailItem icon="Plus" href={`/${locale}/upload`} active={isUpload} label="만들기" />
    <RailItem icon="Profile" href={`/${locale}/me/profile`} active={isProfile} label="프로필" avatarUrl={avatarUrl} />
  </nav>

  {/* 설정 (bottom, 자리만) */}
  <div className="mt-auto flex justify-center pb-2">
    <button
      onClick={() => toast.info('준비 중입니다')}
      className="opacity-40 cursor-not-allowed p-2"
      aria-label="설정 (준비 중)"
      disabled
    >
      <SettingsIcon className="w-6 h-6" />
    </button>
  </div>
</aside>
```

**RailItem 서브컴포넌트** (같은 파일 내):
- 단일 사양: 정사각 버튼 (44x44px tappable), 아이콘 24~28px, 활성 시 `text-[var(--foreground)]` + 옵션 indicator.
- 알림 badge: 미읽음 count > 0 시 우상단 빨간 점.
- 프로필: avatar fallback (`UserAvatar` 컴포넌트), 활성 시 ring.
- Link vs button (만들기·알림은 비로그인 시 로그인 트리거 button).

### 3.2 `Header.tsx` (수정)

**유지**:
- 검색 input + dropdown (DesktopSearchBar)
- 모바일 검색 아이콘 / 뒤로가기 버튼
- 모바일 로고 (모바일은 rail 없으므로 헤더에 로고 유지)

**제거**:
- 데스크톱 로고 (rail 로 이동)
- + 만들기 데스크톱 버튼 (rail)
- NotificationBell 데스크톱 표시 (rail)
- 프로필 아바타 데스크톱 Link (rail)
- 비로그인 데스크톱 "로그인" 버튼 → rail 의 로그인 트리거(만들기·알림 클릭 시) 또는 별도 처리

**모바일 헤더는 거의 변경 없음**: 로고 + 뒤로가기 + 검색 아이콘만. (+만들기·알림·프로필은 BottomNav 가 담당)

### 3.3 `LocaleLayout` body 구조 변경

**현재**:
```tsx
<body className="min-h-full flex flex-col">
  <Header />
  <main className="flex-1 pb-[...]">{children}</main>
  <MobileBottomNav />
  ...
  <footer />
</body>
```

**변경 후**:
```tsx
<body className="min-h-full flex flex-col">
  <Header />
  <div className="flex-1 flex">
    <DesktopRail />
    <main className="flex-1 min-w-0 pb-[...]">{children}</main>
  </div>
  <MobileBottomNav />
  ...
  <footer />  {/* footer 는 main 아래 그대로 (rail 옆이 아닌 column flow) */}
</body>
```

**주의 사항**:
- `min-w-0` 을 main 에 추가 — flex child 의 overflow 방지
- footer 는 desktop only (`hidden sm:block`) 라 layout 변경 영향 거의 없음. 다만 footer 가 `flex-1 flex` 박스 밖에 있어 페이지 끝에 자연 배치
- PersistentPlayer / MiniBar 는 fixed positioning 이라 layout 영향 없음 (Phase 2 에서 패널로 재배치)

---

## 4. Active Path 매칭 로직

`usePathname()` 결과 기반 매칭 함수. BottomNav 와 동일 패턴 재사용:

```ts
const isHome = pathname === `/${locale}` || pathname === `/${locale}/`;
const isNotif = pathname.includes('/me/notifications');
const isUpload = pathname.includes('/upload');
const isProfile = pathname.includes('/me/') && !isNotif;
// 검색은 rail 에 없으므로 제외 (헤더가 담당)
```

활성 시 Tailwind 클래스: `text-[var(--foreground)]` + 아이콘 selected variant.
비활성: `text-[var(--text-secondary)] opacity-60`.

---

## 5. State Management

| State | Source | Usage |
|-------|--------|-------|
| `user` (Supabase Auth) | `supabase.auth.getUser()` + `onAuthStateChange` | 만들기/알림/프로필 로그인 분기 |
| `avatarUrl` | `profiles.avatar_url` 단일 select | 프로필 RailItem 표시 |
| `unreadCount` | `notifications` count + Realtime channel | 알림 badge |
| `pathname` | `usePathname()` | active 매칭 |
| `locale` | `useLocale()` | href 구성 |

**의존성**: Header 와 동일한 패턴. 별도 새 store 도입 안 함.

---

## 6. Visual Design

### 6.1 Sizing

- Rail 폭: `w-16` (64px) — `<sm` 이상에서 sticky.
- Rail 아이콘: `w-7 h-7` (28px) — BottomNav 와 동일.
- 아이템 hit area: `p-2.5` 또는 `w-12 h-12` — 데스크톱 커서 환경 감안.
- 그룹 간 여백: 로고 → 메뉴는 `pt-6` (24px), 메뉴 → 설정은 `mt-auto` (자동 push).

### 6.2 Colors

- Rail bg: `bg-[var(--background)]` — body 와 동일 (subtle 분리는 우측 border 만)
- Rail right border: `border-r border-[var(--border)]`
- 활성 아이콘: `text-[var(--foreground)]`
- 비활성: `text-[var(--text-secondary)]` + `opacity-60`
- Badge: `bg-red-500` + 흰 점

### 6.3 Interaction

- Hover: `opacity` 1로 (전역 hover 토큰)
- Active(press): `active:scale-95`
- Tooltip: `aria-label` + (선택) tooltip 컴포넌트 호버 시 표시 — Phase 1 에서는 aria-label 만 (스크린리더 + native title 어트리뷰트로 시작)

---

## 7. Mobile / Responsive

| Viewport | Rail | Header | BottomNav |
|----------|:----:|--------|:---------:|
| `<sm` (mobile) | hidden | logo + 검색 아이콘 + 뒤로가기 | visible |
| `>=sm` (desktop) | visible (64px) | 검색바만 | hidden (`sm:hidden`) |

**검증 viewport**: 360px / 640px(sm) / 768px(md) / 1024px(lg) / 1440px(xl)

---

## 8. Test Plan

### 8.1 Manual Smoke Test

| # | 시나리오 | 기대 결과 |
|---|---------|-----------|
| 1 | 데스크톱(`>=sm`) 진입 | 좌측 64px rail 표시, 헤더 슬림 |
| 2 | 모바일(`<sm`) 진입 | rail 숨김, BottomNav 표시 |
| 3 | rail 홈 클릭 | `/{locale}` 이동, 활성 indicator |
| 4 | rail 알림 클릭(로그인) | `/me/notifications` 이동, badge count 정확 |
| 5 | rail 만들기 클릭(로그인) | `/upload` 이동 |
| 6 | rail 프로필 클릭 | `/me/profile` 이동, avatar 표시 |
| 7 | rail 설정 클릭 | toast "준비 중" 표시, 페이지 이동 없음 |
| 8 | 알림 페이지에서 rail 알림 활성 표시 | active 강조 표시 |
| 9 | 비로그인 만들기 클릭 | 로그인 트리거 (Google OAuth) |
| 10 | 모든 기존 페이지(/playlist, /channel, /collection, /search) 진입 | layout 깨짐 없음 |

### 8.2 회귀 체크리스트

- [ ] BottomNav 모바일 정상 작동
- [ ] PersistentPlayer / MiniBar fixed positioning 충돌 없음
- [ ] Footer 데스크톱 표시
- [ ] Spotify hero header (channel/profile) 풀-블리드 유지
- [ ] 검색바 헤더에서 정상 작동 (DesktopSearchBar)

---

## 9. Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| `flex-1 flex` 변경이 일부 페이지 layout 깨뜨림 | 각 페이지의 `max-w-` wrapper 가 main 내부에 있으므로 영향 미미. 시각 회귀 테스트로 확인. |
| Sticky rail 이 스크롤 시 footer 와 겹침 | rail 의 `h-[calc(100vh-3.5rem)]` 로 max height 제한, footer 와 자연 분리 |
| 알림 unread Realtime 구독이 BottomNav 와 중복 | 두 곳에서 동일 channel 이름이면 리소스 중복. channel 명을 달리 (`rail-nav-notif:{id}`) 분리 |
| 비로그인 시 만들기/알림 클릭 → 로그인 트리거 | 기존 BottomNav 패턴(`isInAppBrowser` 체크 + `signInWithOAuth`) 그대로 재사용 |

---

## 10. Implementation Guide

### 10.1 작업 순서

1. **`DesktopRail.tsx` 작성** — RailItem 서브컴포넌트 포함, BottomNav 패턴 참고
2. **`Header.tsx` 슬림화** — 데스크톱 우측 액션 + 로고 제거
3. **`LocaleLayout` body 구조 변경** — `<div className="flex-1 flex">` 래핑
4. **회귀 검증** — 9개 페이지 (/, /channel, /playlist, /collection, /search, /me/profile, /me/notifications, /me/playlists, /upload) 데스크톱·모바일 양쪽
5. **TypeScript / ESLint 통과** 확인
6. **commit + push** — Phase 1 완료

### 10.2 변경 파일 요약

| File | Action | Estimated LOC |
|------|--------|---------------|
| `src/components/layout/DesktopRail.tsx` | **신규** | ~140 |
| `src/components/layout/Header.tsx` | **수정** (슬림화) | -50 / +5 |
| `src/app/[locale]/layout.tsx` | **수정** (flex 구조) | +3 / -1 |

총 ~150 lines 변경.

### 10.3 Session Guide

Phase 1 은 **단일 세션** 으로 충분. 모듈 분할 불필요.

| Module | Scope | Files |
|--------|-------|-------|
| phase-1 (full) | Rail 전체 + Header 슬림화 + Layout 구조 변경 | 3 files |

`/pdca do desktop-4zone-layout` (또는 `--scope phase-1`) 로 진행.

---

## 11. Out of Scope (Phase 1)

이번 Phase 에서 다루지 않음:
- 우측 now-playing 패널 (Phase 2)
- 하단 bar 슬림화 (Phase 2)
- 4개 액션 + 공유 링크 (Phase 3)
- 패널 hydration / autoplay invite (Phase 3)
- Rail 의 사용자 라이브러리/큐레이션 펼침 (향후)
- Settings 페이지 실제 구현 (향후)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-28 | Initial draft — Phase 1 (Left Rail) | jinwang |
