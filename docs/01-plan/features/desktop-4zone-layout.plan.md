---
template: plan
version: 1.3
feature: desktop-4zone-layout
date: 2026-04-28
author: jinwang
project: clipclef
---

# Desktop 4-Zone Layout Planning Document

> **Summary**: Suno 식 4-zone 데스크톱 레이아웃 도입 — 좌측 rail(nav) + 가운데(explore grid) + 우측 now-playing 패널(영상+메타+액션) + 하단 thin bar(progress/control).
>
> **Project**: clipclef
> **Author**: jinwang
> **Date**: 2026-04-28
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 데스크톱에서 하단 PersistentPlayer 가 가로폭을 낭비하고, 헤더에 nav/액션이 밀집해 시각 위계가 무너짐. 카드 클릭 시 페이지 전환 비용이 커서 발견 흐름이 끊김. |
| **Solution** | 4-zone 레이아웃: ① 좌측 thin rail(nav, ~64px) ② 가운데(grid/페이지) ③ 우측 now-playing 패널(~320px, 데스크톱) ④ 하단 slim bar. 라우팅은 in-app fluid(URL 무변) + 명시적 공유 시 query-param URL 생성 hybrid. |
| **Function/UX Effect** | 카드 클릭 = 우측 패널 즉시 갱신 → 발견 흐름 유지. 좌측 rail 이 모바일 BottomNav 와 1:1 대응 → 디바이스 간 멘탈 모델 통일. 공유 링크 진입 시 가운데=홈/우측=재생 → 추가 발견 자연 유도. |
| **Core Value** | clipclef 의 정체성("발견+큐레이션+청취 결합")을 가장 잘 표현하는 데스크톱 레이아웃 정착. Spotify/Suno 급의 청취 경험. |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 현 데스크톱은 하단 player 가 가로폭을 낭비하고 발견 흐름이 페이지 전환에 끊김. 헤더 액션 밀집. |
| **WHO** | 데스크톱 사용자 (음악 발견·청취·큐레이션 소비). 모바일은 기존 패턴 유지. |
| **RISK** | 작업 단위가 큼(layout 전면 재설계). YouTube IFrame 영구 마운트 라이프사이클 + 모바일 분기 + 공유 라우팅 동시 검증 필요. |
| **SUCCESS** | Phase 1(rail) 도입 후 헤더 액션 ≥ 30% 감소, 모바일 BottomNav 와 메뉴 1:1 매핑. Phase 2~3 후 카드 클릭 → 페이지 전환 0회로 재생 시작. |
| **SCOPE** | Phase 1 = 좌측 rail. Phase 2 = 우측 now-playing 패널 + 하단 bar 슬림화. Phase 3 = 4개 액션(좋아요·저장·공유·유튜브에서보기) + 공유 링크 진입 hydration. |

---

## 1. Overview

### 1.1 Purpose

clipclef 데스크톱 사용자에게 Spotify/Suno 수준의 4-zone 청취 경험을 제공한다. 좌측 nav rail + 우측 now-playing 패널 + 슬림 하단 bar 의 표준 음악 앱 레이아웃을 도입하면서, "in-app 카드 클릭 = URL 무변" 의 fluid 발견 동선과 "공유 링크 진입 = 가운데 홈 + 우측 재생" 의 컨텍스트 보존 동선을 동시 충족한다.

### 1.2 Background

- 현재 데스크톱: 헤더(로고+검색+만들기+알림+프로필 dropdown) + 본문 + 하단 PersistentPlayer + MiniBar.
- 문제 1: 하단 player 가 가로폭 1152px 를 거의 다 차지 → 시각 위계상 본문보다 player 가 더 큰 면적 차지하는 부조화.
- 문제 2: 카드 클릭 → `/playlist/[id]` 페이지 전환 → 발견 흐름 단절. 사용자가 다시 홈으로 돌아오는 비용.
- 문제 3: 헤더에 nav(검색)·액션(만들기·알림·프로필)이 모두 몰려 액션 밀집도가 높음.
- 모바일은 BottomNav + 풀스크린 player 패턴이 잘 작동 중 — 데스크톱만 패러다임 부재.
- 레퍼런스: Suno (4-zone), Spotify (3-zone+쪽창), Apple Music Web (3-zone). Pinterest 의 thin rail 도 부분 참고.

### 1.3 Related Documents

- 이전 디자인: `docs/02-design/features/mobile-ui-optimize.design.md`
- 글로벌 토스트: `docs/03-analysis/global-toast-system.analysis.md`
- 컬렉션 플레이어: `docs/01-plan/features/collection-player.plan.md`

---

## 2. Scope

### 2.1 In Scope

**Phase 1 — 좌측 Rail (이번 phase 의 즉시 구현 범위):**
- [ ] 새 컴포넌트 `src/components/layout/DesktopRail.tsx` 생성
- [ ] Rail 메뉴 구성 (위→아래): **로고 → (여백) → 홈 → 알림 → 만들기 → 프로필 → (여백) → 설정**(자리만)
- [ ] Rail 폭 ~64px (icon-only), 데스크톱 sticky left
- [ ] 모바일 (`<sm`) 에서는 rail 숨김 (`hidden sm:flex`) — BottomNav 그대로 유지
- [ ] 헤더에서 좌측 로고 + 우측 만들기/알림/프로필 액션 제거 (rail 로 이동)
- [ ] 헤더는 "검색바 + 검색 아이콘(모바일)" 만 남김
- [ ] `LocaleLayout` 의 body flex 구조 변경 — `flex-row` 로 rail + main 배치
- [ ] 설정 아이콘은 자리만 만들고 클릭 시 disabled or "준비 중" toast (Phase 외)
- [ ] 알림은 기존 `NotificationBell` 컴포넌트 재사용
- [ ] 프로필은 기존 `/me/profile` 직접 링크 (드롭다운 없음, 이미 헤더에서 정리됨)
- [ ] 만들기는 `/upload` 직접 링크
- [ ] 홈은 `/` (로케일 루트) 직접 링크
- [ ] 활성 페이지 indicator (현재 경로 매칭 시 아이콘 강조)

**Phase 2 — 우측 Now-Playing 패널 + 하단 Bar 슬림화:**
- [ ] 새 컴포넌트 `src/components/layout/RightNowPlayingPanel.tsx` 생성
- [ ] PersistentPlayer 를 패널 내부로 재배치 (영구 마운트 유지)
- [ ] 패널 내용: 영상 + 트랙 메타 + 액션 영역(향후 Phase 3)
- [ ] 패널 폭 ~320px sticky right (데스크톱 only, `hidden sm:flex`)
- [ ] 하단 bar 슬림화 — 영상 영역 제거, progress bar + 컨트롤만
- [ ] MiniBar 는 모바일 전용으로 격하 또는 통합
- [ ] 패널 hydration: 카드 클릭 시 zustand store 갱신만, URL 무변

**Phase 3 — 4개 액션 + 공유 링크:**
- [ ] 우측 패널 액션 라인: **좋아요 | 저장 | 공유 | 유튜브에서보기**
- [ ] 공유 → `?p={playlistId}` 또는 `?t={trackId}` 또는 `?c={collectionId}` 형식 URL 생성, 클립보드 복사 + toast
- [ ] 공유 링크 진입 시 hydration: home 컴포넌트 렌더 + 우측 패널 자동 로드
- [ ] 자동재생 정책: 자동 로드 후 ▶ 큰 오버레이 invite (브라우저 autoplay 차단 대비)
- [ ] 유튜브에서 보기 → 새 탭으로 `https://youtube.com/watch?v={videoId}` 오픈

### 2.2 Out of Scope

- 모바일 BottomNav 변경 (그대로 유지)
- 기존 `/playlist/[id]` 라우트 폐기 (SEO/메타데이터/공유 미리보기용 유지)
- 패널 내 인라인 댓글 (Phase 3 이후 별도 phase 검토)
- 좌측 rail 의 사용자 라이브러리/큐레이션 펼침 (사용자 요청 시 향후)
- 설정 페이지의 실제 구현 (Phase 1 에서는 자리만)
- max-w 컨테이너 폭 변경 (max-w-6xl 유지, 차후 측정 후 결정)
- 다크/라이트 테마 토글 (별도 작업)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Phase | Status |
|----|-------------|----------|-------|--------|
| FR-01 | 데스크톱(`>=sm`)에 좌측 rail 표시, 모바일에서는 숨김 | High | 1 | Pending |
| FR-02 | Rail 메뉴 순서: 로고 → 홈 → 알림 → 만들기 → 프로필 → 설정 (위→아래, 그룹 간 여백) | High | 1 | Pending |
| FR-03 | 활성 경로 indicator (현재 페이지 아이콘 강조) | High | 1 | Pending |
| FR-04 | 헤더에서 로고/만들기/알림/프로필 제거 → 검색만 남김 | High | 1 | Pending |
| FR-05 | 설정 아이콘은 자리만, 클릭 시 noop or "준비 중" toast | Medium | 1 | Pending |
| FR-06 | LocaleLayout body 가 `flex-row` 로 rail+main 배치, 모바일은 column | High | 1 | Pending |
| FR-07 | 우측 now-playing 패널 sticky right, 데스크톱 only | High | 2 | Pending |
| FR-08 | PersistentPlayer 가 패널 내부에서 영구 마운트 — 라이프사이클 보존 | High | 2 | Pending |
| FR-09 | 하단 bar 슬림화 — 영상 영역 제거, progress + 컨트롤만 | High | 2 | Pending |
| FR-10 | 카드 클릭 시 store 갱신, URL 무변 (in-app fluid) | High | 2 | Pending |
| FR-11 | 우측 패널 액션 4개: 좋아요·저장·공유·유튜브에서보기 | High | 3 | Pending |
| FR-12 | 공유 → query-param URL 생성, 클립보드 복사 + toast | High | 3 | Pending |
| FR-13 | 공유 링크 진입 시 home + 패널 hydration | High | 3 | Pending |
| FR-14 | 자동재생: 패널에 트랙 로드 후 ▶ 오버레이 invite | Medium | 3 | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | Rail 렌더링 추가 비용 < 5ms | React Profiler |
| Performance | 카드 클릭 → 패널 갱신 < 100ms | UI 인스펙트 |
| Compatibility | YouTube IFrame 영구 마운트 라이프사이클 보존 | 수동 테스트 (재생 중 라우팅) |
| Responsive | `<sm` 에서 rail/패널 숨김, BottomNav 유지 | 반응형 viewport 테스트 |
| Accessibility | Rail 아이콘 모두 `aria-label`, 활성 상태 `aria-current="page"` | axe DevTools |
| SEO | `/playlist/[id]` 라우트 그대로 — OG 이미지/메타데이터 유지 | 기존 동작 회귀 없음 |

---

## 4. Success Criteria

### 4.1 Definition of Done — Phase 1

- [ ] 데스크톱 진입 시 좌측 64px rail 가 sticky 로 표시됨
- [ ] Rail 메뉴 6개 (로고/홈/알림/만들기/프로필/설정) 모두 렌더, 사용자 지정 순서 일치
- [ ] 모바일에서 rail 숨김, BottomNav 정상 작동
- [ ] 헤더 우측 액션(만들기/알림/프로필) 제거됨, 검색만 남음
- [ ] 활성 페이지 아이콘 강조 (홈 / 알림 / 만들기 / 프로필)
- [ ] 설정 아이콘 클릭 시 noop or toast
- [ ] 모든 기존 nav 링크가 rail 에서 동일하게 작동 (회귀 없음)
- [ ] TypeScript 타입체크 통과, ESLint 통과
- [ ] 모바일/데스크톱 양쪽에서 시각 회귀 없음

### 4.2 Definition of Done — Phase 2~3

- [ ] (Phase 2) 우측 패널이 데스크톱에서 sticky 표시, PersistentPlayer 가 패널 내부에서 정상 재생
- [ ] (Phase 2) 하단 bar 가 슬림화 (영상 영역 제거)
- [ ] (Phase 2) 카드 클릭 → 패널 갱신, URL 무변, 페이지 전환 없음
- [ ] (Phase 3) 4개 액션 모두 작동 (좋아요/저장/공유/유튜브에서보기)
- [ ] (Phase 3) 공유 → URL 클립보드 복사 + toast
- [ ] (Phase 3) 공유 URL 진입 → 가운데 홈 + 우측 패널 자동 로드 + ▶ invite

### 4.3 Quality Criteria

- [ ] TypeScript: 0 errors
- [ ] ESLint: 0 errors / 0 warnings
- [ ] 빌드 성공
- [ ] 회귀: 기존 페이지(/me/profile, /channel/, /playlist/, /collection/) 모두 정상 작동
- [ ] YouTube IFrame 라이프사이클: 재생 중 nav 이동해도 끊김 없음

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| YouTube IFrame 영구 마운트 라이프사이클 손상 | High | Medium | Phase 2 에서 PersistentPlayer 를 패널 자식으로 단순 이동만, 재마운트 발생 안 하는 구조 검증. 카드 클릭 시 store 만 갱신 (DOM 재생성 X). |
| 공유 링크 진입 시 home + 패널 동시 hydration 시 race condition | High | Medium | Phase 3: home 컴포넌트 mount → useEffect 에서 query-param 감지 → 명시적 store 갱신 → 패널 사이드 effect 로 트랙 로드. 순서 명확히. |
| 모바일/데스크톱 분기 늘어나 코드 복잡도 ↑ | Medium | High | `hidden sm:flex` Tailwind 전용 패턴 일관 사용, 별도 컴포넌트 분리 (DesktopRail / MobileBottomNav 이미 분리). |
| max-w-6xl 본문이 좌측 rail+우측 패널 빼면 ~770px 으로 좁아짐 | Medium | Medium | Phase 2 진입 전 측정. 그리드 컬럼 수 변동 측정 후 max-w-screen-2xl 확장 검토. |
| 우측 패널의 z-order/overflow 가 dropdown(예: ProfileSettingsMenu)과 충돌 | Medium | Low | 패널 z-index 명시, 드롭다운 portal 처리 검토. |
| 라우팅 모델 A 채택 시 브라우저 뒤로가기 사용자 경험 저하 | Medium | Medium | replaceState 옵션 검토 — 필요 시 방문 트랙을 history 에 silent push. |
| Phase 1 만 도입 후 phase 2 가 지연되면 어색한 중간 상태 (rail + 넓은 player) | Low | Medium | Phase 1~2 를 가급적 같은 작업 cycle 내 연속 진행. |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| `src/app/[locale]/layout.tsx` | Layout | body flex 구조 변경, rail 컴포넌트 추가 |
| `src/components/layout/Header.tsx` | Component | 좌측 로고/우측 액션 제거, 검색만 남김 |
| `src/components/layout/MobileBottomNav.tsx` | Component | 변경 없음 (유지) |
| `src/components/layout/DesktopRail.tsx` | Component | **신규** |
| (Phase 2) `src/components/layout/RightNowPlayingPanel.tsx` | Component | **신규** |
| (Phase 2) `src/features/player/components/PersistentPlayer.tsx` | Component | 마운트 위치 이동 (layout → panel) |
| (Phase 2) `src/features/player/components/MiniBar.tsx` | Component | 슬림화 또는 모바일 전용 격하 |

### 6.2 Current Consumers

Phase 1 변경의 주요 영향 범위:

| Resource | Operation | Code Path | Impact |
|----------|-----------|-----------|--------|
| `Header.tsx` | 로고 표시 | 모든 페이지 — `LocaleLayout` 에서 마운트 | Rail 로 이동, 헤더에서는 제거 — 회귀 검증 필요 |
| `Header.tsx` | NotificationBell | 모든 페이지 — 우측 액션 영역 | Rail 알림 메뉴 항목으로 이동 |
| `Header.tsx` | + 만들기 Link | 모든 페이지 — 우측 액션 영역 | Rail 만들기 메뉴 항목으로 이동 |
| `Header.tsx` | 프로필 아바타 Link | 모든 페이지 — 우측 액션 | Rail 프로필 메뉴 항목으로 이동 |
| `MobileBottomNav.tsx` | 모바일 nav | `<sm` 사이즈 | 영향 없음 (rail 은 `>=sm`) |
| `LocaleLayout` flex | body 구조 | 모든 페이지의 컨테이너 | flex-col → desktop 에서 flex-row, mobile 유지 — 시각 회귀 측정 필요 |

### 6.3 Verification

- [ ] 헤더에서 액션 제거 후 모든 페이지에서 동일 액션이 rail 에서 작동 확인
- [ ] 모바일(`<sm`)에서 rail 숨김 + BottomNav 정상 작동 확인
- [ ] LocaleLayout 의 main 영역이 rail 폭만큼 좌측 padding/margin 확보
- [ ] sticky/scroll 동작이 rail 과 main 양쪽에서 자연스러움
- [ ] 활성 경로 indicator 가 모든 메뉴 항목에 정확히 적용

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | ☐ |
| **Dynamic** | Feature-based modules, BaaS | Fullstack web apps | ☑ |
| **Enterprise** | Strict layer separation, DI | High-traffic systems | ☐ |

### 7.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 라우팅 모델 | A안(URL 무변) / B안(URL 변경) / Hybrid | **Hybrid (A안 + 명시적 공유)** | in-app fluid + 공유 시에만 URL 생성. Spotify/Suno 패턴. |
| 공유 URL 형식 | query / path / flag | **query (`?p=...`, `?t=...`, `?c=...`)** | home 그대로 + 패널만 hydrate, replaceState 무리 없음 |
| 기존 `/playlist/[id]` 처리 | 유지 / redirect / 폐기 | **유지** | SEO/OG/공유 미리보기 메타데이터용 fallback |
| 공유 단위 | 트랙 / 플레이리스트 / 컬렉션 / 채널 | **트랙·플레이리스트·컬렉션 (3종)** | 채널은 자체 페이지 보유 |
| 자동재생 | 자동시작 / 클릭 대기 / 음소거 시작 | **자동 로드 + ▶ invite** | Chrome autoplay policy 안전, UX 명확 |
| Rail 폭 | 64px / 80px / 240px | **~64px (icon-only)** | 그리드 영향 최소, Pinterest/Suno 패턴 |
| 패널 폭 | 280 / 320 / 360 | **~320px** | 영상 16:9 기준 적절, 댓글 영역 여유 |
| State Mgmt | Context / Zustand / Redux | **Zustand (기존 store 확장)** | 이미 player store 존재 |
| Active Indicator | Path 매칭 / 명시적 설정 | **`usePathname()` 매칭** | Next.js 표준 |

### 7.3 Folder Structure Preview

```
src/
├── app/[locale]/
│   └── layout.tsx          ← body flex 구조 변경
├── components/
│   └── layout/
│       ├── Header.tsx                   ← 슬림화
│       ├── MobileBottomNav.tsx          ← 변경 없음
│       ├── DesktopRail.tsx              ← 신규 (Phase 1)
│       └── RightNowPlayingPanel.tsx     ← 신규 (Phase 2)
└── features/
    └── player/
        └── components/
            ├── PersistentPlayer.tsx     ← 위치 이동 (Phase 2)
            └── MiniBar.tsx              ← 슬림화/격하 (Phase 2)
```

---

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions

- [x] `CLAUDE.md`/`AGENTS.md` 존재 (Next.js 사용)
- [x] ESLint/TypeScript 설정 완료
- [x] Tailwind CSS v4 (CSS variables 기반 토큰)
- [x] Lucide / SVG inline 패턴

### 8.2 Conventions to Follow

| Category | Current | To Apply |
|----------|---------|----------|
| **Naming** | PascalCase 컴포넌트, kebab-case 파일 | `DesktopRail.tsx`, `RightNowPlayingPanel.tsx` |
| **Folder structure** | `components/layout/` 에 layout 컴포넌트 | 신규 컴포넌트 동일 위치 |
| **Import order** | next 표준 | 절대경로 `@/...` 사용 |
| **Active state** | `usePathname()` + 매칭 함수 | Rail 에서 동일 패턴 |

### 8.3 Environment Variables

신규 추가 없음.

---

## 9. Phased Rollout

| Phase | Scope | 작업 단위 | 의존성 |
|-------|-------|-----------|--------|
| **1** | 좌측 Rail + 헤더 슬림화 | Plan→Design→Do→Check 1 cycle | 없음 |
| **2** | 우측 Now-Playing 패널 + 하단 Bar 슬림화 | Plan→Design→Do→Check 1 cycle | Phase 1 완료, 라우팅 모델 결정 (이미 결정됨) |
| **3** | 4개 액션 + 공유 링크 hydration | Plan→Design→Do→Check 1 cycle | Phase 2 완료 |

각 phase 는 독립적인 PDCA 사이클로 진행. Phase 1 완료 후 사용자 승인 → Phase 2 진입.

---

## 10. Next Steps

1. [ ] Plan 검토 및 승인 (현 단계)
2. [ ] `/pdca design desktop-4zone-layout` — Phase 1 (좌측 rail) 디자인 문서 작성
3. [ ] `/pdca do desktop-4zone-layout --scope phase-1` — Phase 1 구현
4. [ ] `/pdca analyze desktop-4zone-layout` — Gap 분석
5. [ ] (이후) Phase 2 / Phase 3 동일 사이클 반복

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-28 | Initial draft — 4-zone 비전 + Phase 1~3 분리 | jinwang |
