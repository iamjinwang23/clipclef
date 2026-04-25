# Plan: curation-route-unify

**Feature**: curation-route-unify
**Phase**: Plan
**Created**: 2026-04-26
**Status**: In Progress

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 큐레이션 UX 일관성 깨짐: (a) 홈 MixedShelf에서 유저 큐레이션 썸네일 클릭 시 프로필로 이동(상세 페이지 부재), (b) 프로필의 큐레이션 리스트가 4개 플리 미리보기로 펼쳐져 있어 큐레이션 단위 인지가 흐림, (c) "전체 피드" 라벨이 v2 큐레이션 어휘와 어긋남, (d) home_feed 정렬을 최신순으로 바꾼 뒤 § 3 팔로우 큐레이터와 § 4 전체 피드 노출 중복 발생. |
| **Solution** | (a) `/collection/[id]`를 관리자/유저 양쪽 처리하도록 확장 + 유저 큐레이션 상세 페이지 활성화. (b) MixedShelf · 프로필의 큐레이션 카드 라우팅을 `/collection/[id]`로 통일. (c) 프로필 큐레이션 UI를 카드(대표 썸네일 + 제목)로 단순화. (d) "전체 피드" → "전체 플레이리스트". (e) Migration 023으로 home_feed 정렬을 인기순(`like_count DESC`)으로 되돌림. |
| **Functional UX Effect** | 큐레이션 = 어디서 클릭하든 큐레이션 상세에서 재생/소비. 홈 § 3·§ 4 노출 중복 해소. |
| **Core Value** | "유저 큐레이션도 관리자 에디토리얼과 같은 1급 시민" — v2 핵심 가치 일관성 회복. |

---

## Context Anchor

| | 내용 |
|--|------|
| **WHY** | v2 PRD US-5 "내가 발행한 컬렉션이 관리자 에디토리얼과 같은 선반에 노출". 현재 노출은 같은데 **클릭 후 경험이 비대칭** — 사용자가 "이게 왜 큐레이션 상세 안 들어가지?"라고 인지함. |
| **WHO** | 큐레이션을 발행한 유저 + 그 큐레이션을 발견한 다른 유저. |
| **RISK** | (1) `/collection/[id]` 라우트가 관리자 전용 가정으로 작성됨 — service role + curated_collections 단일 lookup. fallback 추가 시 RLS/권한 처리 주의. (2) 기존 `/collection/[id]` URL이 외부에 공유됐을 가능성 — 동작 변하면 안 됨(extend는 OK, break는 NO). (3) Migration 023 적용 시점 = production 즉시 반영 — 쿼리 캐시 무효화 필요. |
| **SUCCESS** | (1) 홈 MixedShelf 모든 카드 클릭 → `/collection/[id]` (관리자 + 유저 동작 동일). (2) 프로필 큐레이션 카드 클릭 → `/collection/[id]`. (3) 유저 큐레이션 상세 페이지에 올린이(아바타 + 이름 + 팔로우 chip) 표시. (4) home_feed § 4가 인기순으로 정렬되어 § 3과 데이터 중복 최소화. (5) 라벨 "전체 플레이리스트". |
| **SCOPE** | 위 5건. **out**: § 4 데이터 소스 자체 변경(`playlists` → `user_playlists`), 비공개 큐레이션 처리 신규 정책, 큐레이션 상세 페이지 디자인 대대적 리뉴얼, `/collection/[id]` URL을 `/curation/[id]`로 전체 이전(post-MVP). |

---

## 1. 현황 분석

### 1.1 데이터 모델

| 테이블 | 쓰임 | 공개 조건 |
|---|---|---|
| `curated_collections` | 관리자 에디토리얼 | `is_active = true` |
| `user_playlists` | 유저 큐레이션 | `published_at IS NOT NULL` (Migration 021) |
| `playlists` | 단일 플리(영상) | `is_active = true` |

`user_playlists` 컬럼: `id, user_id, name, cover_url, caption(?), published_at, created_at, ...`. Caption 컬럼명 확인 필요(Design 단계).

### 1.2 현재 라우팅 동작

| 진입점 | 현재 | 기대 |
|---|---|---|
| 홈 MixedShelf — 관리자 카드 | `/collection/[id]` ✅ | 그대로 |
| 홈 MixedShelf — 유저 카드 | `/profile/[creator.id]` ❌ | `/collection/[id]` |
| 프로필의 큐레이션 항목 — 4개 플리 그리드 | 각 플리 → `/playlist/[id]` | 큐레이션 카드 → `/collection/[id]` |

`MixedShelf.tsx:62-66` 분기:
```ts
const href =
  item.source === 'curated' ? `/${locale}/collection/${item.id}`
  : item.creator ? `/${locale}/profile/${item.creator.id}`
  : `/${locale}/me/library`;
```

### 1.3 `/collection/[id]` 현재 구현

`src/app/[locale]/collection/[id]/page.tsx`:
- service-role client로 `curated_collections` 단일 lookup
- 못 찾으면 `notFound()`
- `CollectionPageClient`에 playlists 배열 전달
- `banner_image_url` → 첫 플리 썸네일로 fallback

**확장 지점**: lookup에서 `curated_collections` 못 찾으면 `user_playlists`로 fallback. Display 시 source 타입에 따라 헤더(관리자: 에디토리얼 라벨 / 유저: 올린이 카드)만 분기.

### 1.4 home_feed 정렬

- Migration 022(현재): `top_playlists ORDER BY created_at DESC`
- 되돌릴 대상: `ORDER BY like_count DESC` (= Migration 019의 원본)
- 인덱스: 019에 `idx_playlists_active_like_count` 또는 `created_at` 둘 중 하나만 살아있을 가능성 — 확인 필요(Design).

### 1.5 § 4 라벨 위치

- `src/app/[locale]/page.tsx:54` — `<HomeSection label="전체 피드" href={\`/${locale}/playlists\`}>`
- `src/features/home/components/PlaylistHomeSection.tsx:2` — 주석
- `docs/01-plan, 02-design, 00-pm`의 v2 문서 — 본 PDCA에서는 **코드만 변경**, 문서는 archive 시 보강 메모.

### 1.6 프로필 큐레이션 리스트

`src/app/[locale]/profile/[userId]/page.tsx:144-180` 섹션:
- 큐레이션마다 4개 플리 미리보기 grid
- `is_public` 필터(Migration 021 이후 deprecated, 그러나 RLS가 published_at으로 가드 중이라 작동은 함)
- 변경 후: 큐레이션 1개 = 카드 1개

---

## 2. 요구사항

### Functional

1. `/collection/[id]`가 두 데이터 소스 처리: curated_collections → user_playlists fallback (UUID 충돌은 무시 가능 수준).
2. 유저 큐레이션 상세 페이지에 **올린이 헤더**(아바타 + 이름 + 인증배지 + 팔로우 chip).
3. MixedShelf 유저 카드 → `/collection/[id]`.
4. 프로필 큐레이션 섹션: 큐레이션 1건 = 카드(`cover_url || 첫 플리 썸네일` + `name` + 트랙 수) → 클릭 시 `/collection/[id]`.
5. 홈 § 4 라벨: "전체 피드" → "전체 플레이리스트".
6. Migration 023: `home_feed` `top_playlists ORDER BY like_count DESC, created_at DESC` (tie-break 보강).

### Non-functional

- 기존 `/collection/[id]` (관리자) URL 동작 보존(regression 0).
- 비공개(미발행) user_playlist 직접 URL 접근 시 → `notFound()`.
- 본인 자신의 미발행 큐레이션은 봐야 함 (preview용) — but **본 PDCA에서는 단순화**하여 미발행은 상세 차단. 본인 preview는 후속 PDCA.
- 토스트 인프라 활용 — 본 작업에는 mutation 거의 없어 영향 적음.

### Out of Scope (확정)

- § 4 데이터 자체를 user_playlists로 교체 (사용자 의견 반영 → 옵션 C 채택, 데이터는 그대로 playlists)
- `/collection/[id]` → `/curation/[id]` URL rename
- 비공개 큐레이션 자기 자신 preview
- 큐레이션 상세 페이지 디자인 리뉴얼 (현재 CollectionPageClient 골격 재사용)
- 알파 큐레이터 초대(M7과 동일 — operational)

---

## 3. 구현 단계

### Phase 1: DB (Migration 023) — 약 10분

| Step | Deliverable |
|------|-------------|
| 1.1 | `supabase/migrations/023_home_feed_revert_popular.sql` — `home_feed` RPC `top_playlists` ORDER BY `like_count DESC, created_at DESC` |
| 1.2 | (필요 시) 인덱스 idempotent 보강: `idx_playlists_active_like_count` |
| 1.3 | Production apply via Supabase MCP |

### Phase 2: `/collection/[id]` 확장 — 약 30분

| Step | Deliverable |
|------|-------------|
| 2.1 | `getCollection(id)` 함수: curated_collections 우선 → 없으면 user_playlists + user_playlist_items + uploader profile join |
| 2.2 | 반환 타입에 `source: 'curated' \| 'user'` + `creator?: {id, display_name, avatar_url, is_verified}` 추가 |
| 2.3 | `CollectionPageClient` props 확장: `creator` 옵셔널 — 있으면 헤더에 올린이 카드 렌더 |
| 2.4 | 미발행 user_playlist는 `notFound()` |

### Phase 3: 라우팅 통일 — 약 15분

| Step | Deliverable |
|------|-------------|
| 3.1 | `MixedShelf.tsx` href 분기 제거: 모두 `/collection/[id]` |
| 3.2 | (필요 시) MixedShelf API 타입 그대로 두고 클라이언트만 수정 |

### Phase 4: 프로필 큐레이션 UI — 약 30분

| Step | Deliverable |
|------|-------------|
| 4.1 | `/profile/[userId]/page.tsx`: 4개 플리 미리보기 fetch 제거 |
| 4.2 | user_playlists select에 `cover_url, item_count` 또는 첫 아이템 썸네일 1개 join |
| 4.3 | 카드 그리드 렌더 (대표 썸네일 + name + 트랙 수). 클릭 → `/collection/[id]` |
| 4.4 | `is_public` 필터 → `published_at IS NOT NULL`로 정리(Migration 021 정합) |

### Phase 5: 라벨 — 약 5분

| Step | Deliverable |
|------|-------------|
| 5.1 | `page.tsx` § 4 label "전체 피드" → "전체 플레이리스트" |
| 5.2 | `page.tsx` 상단 주석 라인 동기화 |
| 5.3 | `PlaylistHomeSection.tsx` 주석 동기화 (선택) |

총 약 **1.5 세션** 추정 (Plan + Design 포함).

---

## 4. 핵심 결정 사항

| # | Question | 결정 |
|---|----------|------|
| Q1 | 라우트 전략 | ✅ `/collection/[id]` 단일 확장 (사용자 확정) |
| Q2 | § 4 라벨 | ✅ "전체 플레이리스트" (사용자 확정, 옵션 C) |
| Q3 | § 4 데이터 | ✅ playlists 유지 (이름과 일치) |
| Q4 | 정렬 | ✅ Migration 023으로 인기순 revert |
| Q5 | 비공개 큐레이션 자기 preview | 후속 PDCA로 분리 |
| Q6 | UUID 충돌 처리 | 사실상 0 — fallback 순서만 정의(curated 우선) |

---

## 5. 영향 범위

### 변경 파일
- 신규: `supabase/migrations/023_home_feed_revert_popular.sql`
- 수정:
  - `src/app/[locale]/collection/[id]/page.tsx`
  - `src/features/collection/components/CollectionPageClient.tsx`
  - `src/features/curation/components/MixedShelf.tsx`
  - `src/app/[locale]/profile/[userId]/page.tsx`
  - `src/app/[locale]/page.tsx`
  - `src/features/home/components/PlaylistHomeSection.tsx` (주석만)

### Production 영향
- DB: Migration 023 적용 즉시 § 4 결과 변경 — **사용자 가시 변경**
- UI: 큐레이션 클릭 동작 변경 — 사용자 가시 변경
- 라벨 변경 — 사용자 가시 변경
- React Query cache invalidation 자동(쿼리 키 변경 없으므로 Migration 적용 후 stale 데이터는 다음 fetch에 갱신)

---

## 6. 검증 기준 (DoD)

- [ ] 홈 MixedShelf 관리자 카드 클릭 → 기존 동일 동작
- [ ] 홈 MixedShelf 유저 카드 클릭 → 큐레이션 상세 페이지 (트랙 재생 가능)
- [ ] 큐레이션 상세 페이지 상단에 올린이 정보(유저 큐레이션) 표시
- [ ] 프로필 페이지 큐레이션 섹션 = 카드 그리드 (큐레이션 N개 = 카드 N개)
- [ ] 프로필 큐레이션 카드 → 큐레이션 상세 페이지
- [ ] 홈 § 4 라벨 "전체 플레이리스트"
- [ ] 홈 § 4 정렬 = 인기순 (like_count 내림차순)
- [ ] 미발행 user_playlist URL 직접 접근 → 404
- [ ] 기존 관리자 `/collection/[id]` URL 동작 보존

---

## 7. 다음 단계

1. **Plan 승인** (사용자, 이번 메시지 후)
2. **Design 작성** — `docs/02-design/features/curation-route-unify.design.md` (간단, 1페이지)
3. **Phase 1-5 순차 Do**
4. **Production push + 검증** (사용자가 production에서 9개 DoD 항목 수동 확인)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-26 | Initial draft — 4건 통합 PDCA | iamjinwang@gmail.com |
