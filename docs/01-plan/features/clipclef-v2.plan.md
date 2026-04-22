---
template: plan
version: 1.3
feature: clipclef-v2
date: 2026-04-22
author: iamjinwang@gmail.com
project: ClipClef
version_tag: v1.1 (pre-pivot snapshot)
---

# clipclef-v2 Planning Document

> **Summary**: ClipClef를 "유튜브 플리 탐색 도구"에서 **"감상 공간"**으로 피벗. Global Persistent Player + Scrobble + Letterboxd 스타일 저장→묶기→발행 플로우 구축.
>
> **Project**: ClipClef
> **Pre-pivot tag**: v1.1 (commit 69ac3e9, pushed to origin)
> **Author**: iamjinwang@gmail.com
> **Date**: 2026-04-22
> **Status**: Draft
> **PRD Reference**: `docs/00-pm/clipclef-v2.prd.md`

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 현 ClipClef는 "플리 탐색 도구"로 소비되어 감상이 축적되지 않고, 저장·큐레이션 UI가 외곽에 있어 재방문 주기가 길다. 페이지 이동 시 재생이 끊겨 유튜브로 이탈 유인이 생긴다 |
| **Solution** | 루트 layout에 YouTube iframe 단일 마운트(Global Persistent Player), 1초 간격 polling으로 트랙 단위 scrobble, 플레이어 바 안 1-click 저장, 저장 3+ 시 묶기→발행 플로우 신설, 홈 5섹션 재구성 + 관리자/유저 컬렉션 혼합 선반 |
| **Function/UX Effect** | 페이지를 넘나들며 재생 지속 + 들은 트랙 자동 기록 + 저장 흐름이 감상을 끊지 않음 + 내 발행 컬렉션이 관리자 에디토리얼과 같은 선반에 섞여 노출 |
| **Core Value** | "유튜브로 듣는 것만으로 취향이 쌓이고, 묶으면 큐레이션이 된다" — Last.fm(감상=기록) + Letterboxd(아카이빙 1순위) 메타 큐레이션 모델 |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 재방문 주기가 길고, 페이지 이동 시 재생 끊김 = 유튜브 이탈 #1 유인. 감상이 기록·축적되지 않아 "내 취향 아카이브" 부재 |
| **WHO** | Primary: 국내 2030 early curator 500명 (베타치헤드). Secondary: 매일 듣기 유저(Listener), 취향 기록형(Archivist) |
| **RISK** | R1 Persistent Player iframe 재초기화로 재생 단절 (Critical) · R3 발행 플로우 전환율 저조 (High) · R2 Scrobble 정확도 신뢰 실패 (High) |
| **SUCCESS** | 90일 내: DAU×session duration +20% MoM, scrobble/DAU ≥ 1.0, weekly publish ≥ 8% WAU |
| **SCOPE** | MVP(6-8주): F1 Player + F2 Scrobble + F3 저장 승격 + F4 라이브러리 + F5 묶기→발행 + F6 혼합 선반 + F8 홈 5섹션. Post-MVP: F7 에디토리얼 모드, F9 채널 재정의, F10 히스토리, F11 공유 카드, F12 YouTube 격하 |

---

## 1. Overview

### 1.1 Purpose

ClipClef의 정체성을 "유튜브 플리 탐색 도구"에서 **"감상 공간"**으로 전환한다. 사용자가 ClipClef에서 유튜브 음악을 들으면, 감상이 자동 기록되고, 좋아하는 플리를 한 번의 클릭으로 저장하며, 저장한 플리들을 묶어 Letterboxd 스타일 컬렉션으로 발행할 수 있다. 페이지 이동 중 재생이 끊기지 않는다.

### 1.2 Background

- **v1.1 상태**: 5섹션 홈(home-redesign) + 모든 v1 기능(auth/upload/admin/profile/social) 배포 완료. `v1.1` git tag로 보존됨
- **왜 지금**: (1) Persistent Player 부재로 인한 이탈이 리텐션 저하의 주요인으로 지목됨, (2) 국내 Last.fm 대체재 0, (3) Next.js 16 layout 지속성 + YouTube IFrame API + Supabase 조합이 이 기능 조합을 1인 개발 범위에서 가능케 함
- **주요 기술 판단(세션 결정사항)**: iframe 폴링 기반 scrobble은 feasible(4min/50% 임계값, 백그라운드 ±2-3s 오차 허용). Persistent Player는 "iframe 1개를 루트 layout에 고정 마운트, DOM 이동 금지, transform 기반 확장" 원칙으로 feasible

### 1.3 Related Documents

- **PRD**: `docs/00-pm/clipclef-v2.prd.md`
- **Superseded Plans**:
  - `docs/01-plan/features/home-redesign.plan.md` (retired — v1.1 배포 완료, v2가 재구성)
  - `docs/01-plan/features/pip-player.plan.md` (absorbed into F1)
  - `docs/01-plan/features/save-button-merge.plan.md` (absorbed into F3)
  - `docs/01-plan/features/collection-player.plan.md` (absorbed into F7 post-MVP)
  - `docs/01-plan/features/curation-banner-label.plan.md` (absorbed into F8)
  - `docs/01-plan/features/home-channel-rail.plan.md` (retired — v1.1 M3에 흡수됨)
- **Reference**: Last.fm scrobbling model, Letterboxd Watchlist→List model, Spotify/YouTube Music persistent player pattern

---

## 2. Scope

### 2.1 In Scope (v2.0 MVP — 7개 Must 기능)

- [ ] **F1 Global Persistent Player**: `app/[locale]/layout.tsx`에 YouTube iframe 단일 마운트, Zustand player store, 미니바(모든 페이지) + 확장뷰(플리 상세에서만, transform 기반)
- [ ] **F2 Scrobble 인프라**: `listens` 테이블 신설, 1초 polling + `tracks.start_sec` 트랙 경계 감지, 4min/50% 임계값 write, `visibilitychange` 보정
- [ ] **F3 저장 UI 승격**: 플레이어 바 안 저장 버튼 (상시 노출, 1-click), 재생 중 저장 피드백 토스트
- [ ] **F4 내 라이브러리**: `/me/library` 페이지, 저장한 플리 목록 (user_playlists 재활용, 기존 "내 플리"와 통합 뷰)
- [ ] **F5 묶기 → 발행**: 3+ 저장 시 발행 CTA, 선택 → 한 줄 카피 → 커버 선택 → `published_at` 기록. 발행 후 수정·삭제 가능 (Letterboxd 방식)
- [ ] **F6 혼합 선반**: 홈 "에디토리얼·컬렉션" 섹션에 관리자 curated_collections + 유저 published user_playlists를 `published_at DESC` 시간순 혼합
- [ ] **F8 홈 5섹션 재구성**: 이어듣기(최근 5, FIFO 큐) / 에디토리얼·컬렉션(혼합) / 팔로우 큐레이터 / 전체 피드 / 장르·아티스트 탐색 + 각 섹션 Empty State 폴백
- [ ] **Migration**: user_playlists에 `published_at`, `cover_url`, `caption` 컬럼 추가 + 기존 `is_public=true` row의 마이그레이션 정책 결정 (§6.2 참조)

### 2.2 Out of Scope (Post-MVP)

- **F7 에디토리얼 재생 모드**: iframe 숨기고 오디오만, 여러 플리 가로지르기 (v2.1)
- **F9 채널 재정의**: 유튜브 채널 → ClipClef 큐레이터(사람) 개념 전환 (v2.1, 라벨/UI 중심)
- **F10 감상 히스토리 페이지**: profile 내 주간/월간 top artist/track (v2.2)
- **F11 트위터 공유 카드**: OG 이미지 자동 생성 (v2.2)
- **F12 YouTube 되돌려보내기 격하**: 현 iframe 링크 제거 (Post-MVP, condition-based)
- 다국어(EN) 완전 번역 (기존 skeleton만 유지)
- 신고 관리 / 필터 관리 / 방문자 대시보드 admin 탭 (v1 known gap 유지)
- 모바일 앱 (웹만)
- 결제 / 프리미엄 (무료 MVP)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 유저가 플리 재생 중 다른 페이지로 이동해도 재생이 끊기지 않고 재생 시간이 보존된다 | **Must** | Pending |
| FR-02 | 미니 플레이어 바가 모든 페이지 하단에 상시 노출되며, 현재 트랙/재생 컨트롤/저장 버튼을 제공한다 | **Must** | Pending |
| FR-03 | 플리 상세 페이지 진입 시 iframe이 transform으로 확장되어 대형 플레이어 뷰가 된다 (다른 페이지는 미니바) | **Must** | Pending |
| FR-04 | 트랙이 4분 이상 재생되거나 재생 길이의 50% 이상 진행되면 `listens` 테이블에 (user_id, track_id, playlist_id, played_at, duration_ms) insert | **Must** | Pending |
| FR-05 | 탭이 백그라운드 상태가 되어도 scrobble polling은 유지되되, `visibilitychange` 이벤트로 오차 보정 | **Must** | Pending |
| FR-06 | 미니바 저장 버튼 클릭 시 현재 재생 플리를 내 라이브러리에 추가하고 토스트 피드백 | **Must** | Pending |
| FR-07 | `/me/library` 페이지에서 저장한 플리 목록 조회 (기존 "내 플리"와 통합된 뷰) | **Must** | Pending |
| FR-08 | 라이브러리 3+ 저장 시 "묶어서 발행" CTA 노출, 선택 → 한 줄 카피(최대 140자) → 커버 이미지 선택 → `published_at=NOW()` | **Must** | Pending |
| FR-09 | 발행된 컬렉션은 이후 수정·삭제 가능 (Letterboxd 방식, 소유자만) | **Must** | Pending |
| FR-10 | 홈 "에디토리얼·컬렉션" 섹션에 관리자 `curated_collections` + 유저 `published_at IS NOT NULL` `user_playlists`가 `published_at DESC`로 혼합 노출 | **Must** | Pending |
| FR-11 | 홈 "이어듣기" 섹션에 `listens` 기반 최근 5개 플리 FIFO 큐로 노출 (DISTINCT playlist_id ORDER BY MAX(played_at) DESC LIMIT 5) | **Must** | Pending |
| FR-12 | 홈 5섹션이 모두 비었을 때 각 섹션별 Empty State 안내 표시 | **Must** | Pending |
| FR-13 | 비로그인 방문자: 재생 가능, 저장/발행/scrobble 차단. 저장 버튼 클릭 시 로그인 모달 | **Must** | Pending |
| FR-14 | 기존 `user_playlists.is_public=true` row의 마이그레이션: 항목 1개 이상 + 최근 90일 내 생성된 것만 `published_at=created_at`로 설정 (나머지는 NULL 유지) | **Must** | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| **Persistent Player 안정성** | 페이지 10회 연속 네비게이션 중 재생 단절 0회 | Playwright E2E (T-1) |
| **Scrobble 정확도** | 내부 계정 7일 감사 시 임계값 판정 오차 < 10%, 중복 insert 0건 | 수동 감사 + 로그 분석 (E1) |
| **Scrobble 지연** | `getCurrentTime()` polling 1Hz ± 200ms, 백그라운드 탭 ±3초 내 | Browser DevTools + 로그 |
| **Performance** | 홈 초기 로드 LCP < 2.5s, 미니바 첫 렌더 < 500ms | Lighthouse + Vercel Analytics |
| **Accessibility** | 미니바 키보드 접근 가능 (Tab, Space=재생/정지), 스크린리더 aria-label | Axe + 수동 |
| **Security** | 발행/저장/삭제 API 모두 Supabase RLS + 서버 세션 가드 이중 보호 | Playwright E2E 인증 테스트 |
| **Mobile** | 미니바 iOS Safari에서 동작 (iframe 자동재생 정책 준수) | 실기기 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 7개 FR-Must 기능 모두 구현됨
- [ ] Playwright E2E 10+ 시나리오 작성 및 통과 (T-1~T-6 PRD §6.4 기준)
- [ ] `listens` 테이블 + user_playlists 마이그레이션 성공 (기존 데이터 무결성 확인)
- [ ] 비로그인 방문자 차단 정책 동작 (미니바 저장 = 로그인 모달)
- [ ] Lint 0 error, 0 warning (d2c1a60 수준 유지)
- [ ] README/변경사항 docs 업데이트

### 4.2 Quality Criteria (Product Metrics — 90-day post-launch)

- [ ] **SC-1 (North Star)**: DAU × avg session duration, 월별 +20% MoM
- [ ] **SC-2**: scrobble-per-DAU ≥ 1.0 (하루 1명당 최소 1개 트랙 기록)
- [ ] **SC-3**: weekly publish rate ≥ 8% of WAU
- [ ] **Process**: Persistent Player 재생 단절 리포트 주간 3건 이하

### 4.3 Launch Gates

1. **알파 (Week 4)**: 큐레이터 20명, 내부 감사 E1/E2 통과, scrobble 오차 < 10%
2. **베타 (Week 7)**: 알파에서 R3(발행 전환율) 15%+ 검증, Top 3 리스크 mitigation 확인
3. **공개 (Week 8)**: 베타 500명 acquisition, SC-2 ≥ 0.5 (공개 첫 30일 타겟)

---

## 5. Risks and Mitigation

| ID | Risk | Impact | Likelihood | Mitigation |
|----|------|--------|------------|------------|
| R1 | **Persistent Player iframe 재초기화로 재생 단절** | **Critical** | Medium | (a) `app/[locale]/layout.tsx` 단일 마운트 원칙 명문화 + 코드 코멘트 (b) Zustand `playerStore` single source of truth (c) **iframe DOM 이동 절대 금지** — 오직 `transform: translate` + 크기 변경만 (d) Playwright E2E 10+ 네비게이션 시나리오 (e) 에러 발생 시 자동 재마운트 + `lastPosition` 복원 폴백 |
| R2 | **Scrobble 정확도 신뢰 실패 (누락/중복)** | High | Medium | (a) 4min-or-50% 임계값 엄격 적용 (b) 같은 (user, track, playlist) 5분 내 중복 insert 차단 (Supabase unique constraint or insert guard) (c) `visibilitychange` 이벤트 시 `getCurrentTime()` 재동기화 (d) 투명한 감상 이력 노출 + 수동 삭제 UI (e) 내부 7일 감사 (E1) |
| R3 | **발행 플로우 전환율 저조 (저장은 늘지만 발행 안 함)** | High | High | (a) 알파 큐레이터 20명 직접 섭외(Week 1-2) (b) "저장 3+" CTA 적극 노출 (c) 피쳐드 큐레이터 인센티브 (d) 3-step 발행 UI(선택→카피→커버)로 마찰 최소 (e) 발행 후 홈 선반 노출까지 즉시(트랜잭션) — "내 것이 실제 보인다" 순간 확보 |
| R4 | **iframe DOM 이동 실수 (R1 변종)** | Critical | Low | Design 문서에 "iframe은 루트 layout 이외 어디에도 마운트 금지" 강조. 코드 리뷰에서 `<iframe src="*youtube*">`이 layout 외부에 있으면 즉시 reject |
| R5 | **YouTube 자동재생 정책 위반 (iOS Safari)** | Medium | Medium | `playsinline=1` + 유저 제스처 기반 첫 재생만 트리거. iOS 실기기 테스트 필수 |
| R6 | **기존 user_playlists 마이그레이션 오류** | High | Low | FR-14 조건 보수적으로 설정 (항목 1개 이상 + 90일 내). 마이그레이션 전 백업 dump, 롤백 스크립트 준비 |
| R7 | **홈 5섹션 모두 비어 신규 유저 빈 화면 체험** | Medium | Medium | Empty State 메시지 + 관리자 curated_collections 최소 5개 seed 확보(알파 시작 시점). "뭘 듣고 싶으세요?" 온보딩 프롬프트 |
| R8 | **리그레션 — v1.1 기능 손상** | Medium | Low | v1.1 기능 smoke test 체크리스트 (auth / 홈 5섹션 / 플리 상세 / upload / admin / profile). `v1.1` 태그 언제든 롤백 가능 |

**Top 3 (집중 대상)**: R1 (Critical) · R3 (행동 유도) · R2 (인프라 신뢰)

---

## 6. Impact Analysis

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| `user_playlists` table | DB Model | 컬럼 추가: `published_at TIMESTAMPTZ NULL`, `cover_url TEXT NULL`, `caption VARCHAR(140) NULL` |
| `user_playlists.is_public` | DB Column | 의미 재정의 — "링크 공개 여부"로만, 발행상태는 `published_at IS NOT NULL`로 통합 |
| `listens` table | DB Model (신설) | 컬럼: `id`, `user_id FK profiles`, `track_id FK tracks`, `playlist_id FK playlists`, `played_at TIMESTAMPTZ`, `duration_ms INT`. Index: `(user_id, played_at DESC)`, `(playlist_id)`. Unique partial: `(user_id, track_id, DATE_TRUNC('minute', played_at))` 중복 방지 |
| `app/[locale]/layout.tsx` | Layout | YouTube iframe 단일 마운트 추가 |
| `features/player/` | 신규 feature | `playerStore.ts` (Zustand) + `PersistentPlayer.tsx` + `MiniBar.tsx` + `ExpandedView.tsx` + hooks |
| `features/interaction/hooks/useLike.ts`, `useCollection.ts` | Existing | 플레이어 바 저장 버튼에서 재사용 (no breaking change) |
| `app/[locale]/page.tsx` | Page | 5섹션 재구성 — 이어듣기 섹션 신설, 기존 섹션 재사용 |
| `features/curation/` | 신규 feature | `publishFlow.tsx` (3-step modal) + `MixedShelf.tsx` (관리자 + 유저 혼합) |
| `app/api/listens/route.ts` | 신규 API | POST: scrobble insert / GET: user recent listens |
| `app/api/user-playlists/publish/route.ts` | 신규 API | POST: published_at 설정 + 카피/커버 업데이트 |
| Supabase RLS on `user_playlists` | Policy | "published_at IS NOT NULL인 row는 public read" 정책 추가 |
| Supabase RLS on `listens` | Policy (신설) | "user_id = auth.uid()인 row만 insert/select" |

### 6.2 Current Consumers — user_playlists

| Operation | Code Path | Impact |
|-----------|-----------|--------|
| CREATE | `src/features/user-playlist/components/AddToPlaylistButton.tsx` → user_playlists insert | **None** (새 컬럼 nullable, 기존 로직 그대로) |
| READ (own) | `src/app/[locale]/me/playlists/page.tsx` | **Needs verification** — 라이브러리 뷰와 통합되면서 쿼리 변경 필요 |
| READ (public profile) | `src/app/[locale]/profile/[userId]/page.tsx` → is_public=true 필터 | **Breaking** — 발행 개념 도입으로 "published_at IS NOT NULL" 필터로 변경 |
| READ (mixed shelf) | 신규 `MixedShelf.tsx` → published_at DESC | **New** (신규 쿼리) |
| UPDATE (publish) | 신규 `/api/user-playlists/publish` → published_at, cover_url, caption 설정 | **New** |
| DELETE | 기존 `/me/playlists/page.tsx` 삭제 흐름 | **None** (발행 여부 무관 삭제 허용 — Letterboxd 방식) |

### 6.3 Current Consumers — listens (신설, 영향 없음)

신규 테이블이므로 기존 consumers 없음. PlayerStore에서만 write, `/me/library` 내 "이어듣기" 섹션에서만 read.

### 6.4 Migration Strategy (FR-14 상세)

```sql
-- 1. Add columns (nullable, zero-downtime)
ALTER TABLE user_playlists
  ADD COLUMN published_at TIMESTAMPTZ NULL,
  ADD COLUMN cover_url TEXT NULL,
  ADD COLUMN caption VARCHAR(140) NULL;

-- 2. Backfill — 보수적 정책
-- 기존 is_public=true이고 items 1개 이상, 90일 내 생성된 것만 자동 발행 처리
UPDATE user_playlists up
SET published_at = up.created_at
WHERE up.is_public = true
  AND up.created_at >= NOW() - INTERVAL '90 days'
  AND EXISTS (
    SELECT 1 FROM user_playlist_items upi
    WHERE upi.user_playlist_id = up.id
  );

-- 3. RLS policy update
CREATE POLICY "Published user_playlists are public read"
  ON user_playlists FOR SELECT
  USING (published_at IS NOT NULL);
```

**롤백**: `ALTER TABLE ... DROP COLUMN` + RLS 정책 제거. `v1.1` 태그로 코드 롤백 가능.

**유저 공지**: 마이그레이션 전 공지 — "공개 플리가 홈에 노출될 수 있습니다. 원치 않으면 비공개로 설정하세요."

### 6.5 Verification Checklist

- [ ] 마이그레이션 전 Supabase dump 백업
- [ ] 기존 플리 CRUD (create/read/update/delete) 동작 확인
- [ ] 프로필 페이지 공개 플리 표시 확인 (published_at 필터 적용 후)
- [ ] 플레이어 바 저장 플로우가 기존 useCollection 동작과 동일
- [ ] 비로그인 방문자 재생 가능, 저장 차단 확인
- [ ] iOS Safari / Android Chrome 실기기 테스트
- [ ] v1.1 smoke test (auth/upload/admin/profile 리그레션 없음)

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| Starter | Simple structure | Static sites | ☐ |
| **Dynamic** | Feature-based modules, BaaS (Supabase) | Web apps with backend, SaaS MVPs | ☑ |
| Enterprise | Strict layer separation, DI, microservices | High-traffic systems | ☐ |

v1부터 Dynamic 레벨 유지. 변경 없음.

### 7.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Framework | Next.js 16 / React | **Next.js 16.2.2 App Router** | 기존 유지. layout 지속성 = Persistent Player 핵심 |
| State Management | Context / **Zustand** / Redux | **Zustand** (확장) | 기존 filter store에 이어 `playerStore` 추가. SSR 친화, 미니바/확장뷰 공유 |
| Server State | TanStack Query | **TanStack Query** (기존) | listens/user-playlists 캐싱 |
| API Client | Supabase client + fetch | **Supabase client + Next.js Route Handlers** | 기존 유지 |
| Styling | Tailwind v4 | **Tailwind v4** (기존) | 변경 없음 |
| Testing | Jest / **Playwright** | **Playwright** (신규 도입) | R1 E2E 검증 필수, PRD §6.4 test scenarios 실행 |
| Player Integration | YouTube IFrame API | **YouTube IFrame Player API + onReady/onStateChange/getCurrentTime polling** | 유일한 공식 embed 경로, scrobble 트리거 |
| DB | **Supabase (PostgreSQL + RLS)** | 기존 유지 | 새 테이블 listens + RLS 정책 추가 |
| Deployment | **Vercel** | 기존 유지 | v1.1 태그 롤백 가능 |

### 7.3 Clean Architecture Approach

```
Dynamic Level — features/ 도메인 그룹 (기존 Option C, 유지)

src/
├── app/[locale]/
│   ├── layout.tsx              ← F1: YouTube iframe 단일 마운트 지점
│   ├── page.tsx                ← F8: 5섹션 재구성
│   ├── me/library/page.tsx     ← F4: 라이브러리 페이지 (신규)
│   ├── api/
│   │   ├── listens/route.ts    ← F2: scrobble API (신규)
│   │   └── user-playlists/publish/route.ts  ← F5 (신규)
│   └── ... (기존 라우트)
├── features/
│   ├── player/                 ← F1: 신규 feature
│   │   ├── store.ts            (Zustand playerStore — single source of truth)
│   │   ├── components/
│   │   │   ├── PersistentPlayer.tsx
│   │   │   ├── MiniBar.tsx
│   │   │   ├── ExpandedView.tsx
│   │   │   └── SaveButton.tsx  ← F3
│   │   └── hooks/
│   │       ├── useScrobble.ts  ← F2
│   │       └── useVisibility.ts
│   ├── curation/               ← F5/F6: 신규 feature
│   │   ├── components/
│   │   │   ├── PublishFlow.tsx (3-step modal)
│   │   │   └── MixedShelf.tsx  ← F6
│   │   └── hooks/
│   │       └── usePublish.ts
│   ├── library/                ← F4: 신규 feature
│   │   ├── components/LibraryGrid.tsx
│   │   └── hooks/useLibrary.ts
│   └── ... (기존 feature: playlist, filter, interaction, user-playlist, admin)
└── lib/
    ├── supabase/               (기존)
    └── youtube-player.ts       ← F1: IFrame API 래퍼 (신규)
```

**핵심 원칙 (코드 코멘트로 명시 필수)**:
1. `<iframe>`는 `app/[locale]/layout.tsx` 내 `<PersistentPlayer>` 외 어디에도 마운트 금지
2. `playerStore`가 재생 상태의 유일한 진실. 미니바·확장뷰·저장 버튼 모두 구독만
3. 플레이어 크기/위치 변경은 오직 CSS `transform`. DOM 이동 금지

---

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions

- [x] `CLAUDE.md` / `AGENTS.md` 존재 — "This is NOT the Next.js you know" 명시, `node_modules/next/dist/docs/` 참조 규칙
- [x] ESLint — 0 error/warning (d2c1a60)
- [x] TypeScript strict 활성
- [x] Prettier: 프로젝트 설정 유지
- [x] Features 도메인 그룹 (Option C Pragmatic Balance)
- [x] Zustand store 네이밍 규칙: `features/{domain}/store.ts`

### 8.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Player 관련 네이밍** | N/A (신규) | `playerStore`, `usePlayer*` hook 접두어, `features/player/` 경로 | High |
| **Design Ref 코멘트** | 미적용 | `// Design Ref: §{section}` 규칙 Design phase에서 정의 | High |
| **Migration 스크립트 위치** | `supabase/migrations/` 관례 있음 | `011_v2_player_scrobble.sql` | High |
| **E2E 테스트 디렉터리** | 미존재 | `tests/e2e/` + Playwright 설정 | High |

### 8.3 Environment Variables Needed

기존 env 유지. 신규 없음.

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Client/Server | (기존) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Client | (기존) |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 RLS bypass | Server | (기존) |
| `ADMIN_EMAIL` | 관리자 가드 | Server | (기존) |
| `NEXT_PUBLIC_YOUTUBE_API_KEY` | YouTube Data API v3 | Client | (기존) |

### 8.4 Pipeline Integration

v1.1에서 Phase 1(Schema) / Phase 2(Convention)는 implicit — 별도 문서 없음. v2도 Plan 문서 자체가 스키마·컨벤션 갱신 포함. Phase 3~9는 Design/Do에서 따라감.

---

## 9. Next Steps

1. [ ] **Design phase**: `/pdca design clipclef-v2` — 3 옵션 비교 후 선택, Session Guide로 모듈 분할 (F1~F8 ≈ 5-7 모듈 예상)
2. [ ] **Alpha curator 섭외 병행**: Plan 승인 후 Week 1-2에 트위터·디씨·더쿠 음악 커뮤니티에서 20명 직접 접촉 (R3 mitigation)
3. [ ] **Playwright 도입**: `pnpm add -D @playwright/test` + 기본 config (Design phase에서 상세)
4. [ ] **Retired plans 이동**: Plan 승인 후 `docs/archive/2026-04/superseded/`로 5개 plan 문서 이동 (해시 보존)

---

## 10. Phasing (Session Split Preview)

Design 단계에서 Session Guide로 확정될 예정. 현재 예상 모듈:

| Module | Scope | Est. Sessions | Depends On |
|--------|-------|---------------|------------|
| M1 | DB migration (listens 테이블 + user_playlists 컬럼 + RLS) | 1 | — |
| M2 | Player infrastructure (F1): playerStore + PersistentPlayer + MiniBar | 2-3 | M1 |
| M3 | Scrobble (F2): useScrobble + /api/listens + visibility 보정 | 1-2 | M1, M2 |
| M4 | Save UI (F3) + Library (F4) | 1 | M2 |
| M5 | Publish flow (F5) + Mixed shelf (F6) | 1-2 | M1 |
| M6 | Home 5-section (F8) + Empty states | 1 | M5 |
| M7 | E2E tests + 알파 런 + migration 실행 | 1-2 | ALL |

총 8-12 세션 예상.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-22 | Initial draft — v2 pivot MVP Plan, 7 Must FRs, 8 Risks, Migration strategy | iamjinwang@gmail.com |
