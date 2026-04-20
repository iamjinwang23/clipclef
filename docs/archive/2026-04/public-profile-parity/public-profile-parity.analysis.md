# Analysis: public-profile-parity

> 작성일: 2026-04-20 · Phase: Check · Plan: `docs/01-plan/features/public-profile-parity.plan.md` · Design: `docs/02-design/features/public-profile-parity.design.md`

## Context Anchor

| | |
|--|--|
| WHY | 공개 프로필이 `user_playlists`만 보여주고 라벨이 어긋나서 내 프로필과 타인 프로필이 다른 사람처럼 보임 |
| WHO | 검색·리스트 방문자, 업로더, 큐레이터 탐색자 |
| RISK | UserFollowChip props 전달, self-view 가드, nested select 타입 |
| SUCCESS | 헤더+업로드 grid+큐레이션 preview, self-view chip 숨김, `/me/profile` 데이터 일치 |
| SCOPE | `/profile/[userId]/page.tsx` 1개 파일 |

## 1. Strategic Alignment

| 체크 | 결과 | 근거 |
|------|:----:|------|
| WHY(identity parity) 해결 | ✅ | 헤더·업로드 grid·큐레이션 모두 `/me/profile` 구조 반영 |
| Plan SC 달성 경로 확보 | ✅ | 8개 SC 모두 코드에 반영(아래 §3) |
| Design Option C 준수 | ✅ | 단일 파일 재작성, `/me/profile` 미수정, 공용 컴포넌트 추출 無 |
| PRD 정합성 | N/A | PRD 미생성(소형 버그 fix) |

## 2. Static Gap Analysis

### 2.1 Structural Match — **100%**

| 항목 | 상태 | 근거 |
|------|:----:|------|
| `/profile/[userId]/page.tsx` 존재 | ✅ | file exists |
| 필수 imports (UserAvatar, VerifiedBadge, UserFollowChip, supabase server, Playlist) | ✅ | lines 6-13 |
| 신규 파일 0개 (Design §2) | ✅ | no new files |
| DB 마이그레이션 0 | ✅ | no schema changes |

### 2.2 Functional Depth — **100%**

| 섹션 | Design 스펙 | 구현 | 상태 |
|------|-------------|------|:----:|
| Auth + 6-way parallel fetch | §4 | lines 24-60 | ✅ |
| Follow chip props (server-resolved initialFollowing) | §4.1 | lines 108-112 | ✅ |
| Header (avatar, name, 팔로워/팔로잉, chip) | §6.1 | lines 89-113 | ✅ |
| 업로드 섹션 (grid-cols-2 sm:grid-cols-3, empty dashed box) | §6.2 | lines 115-142 | ✅ |
| 큐레이션 섹션 (label + preview grid 4개) | §6.3 | lines 144-180 | ✅ |
| Self-view/guest chip 숨김 (내부 가드 활용) | §4.1, D-1 | line 111 currentUserId={me?.id ?? null} | ✅ |
| notFound() on missing profile | §7 | line 62 | ✅ |
| nested `user_playlist_items` 4-item preview | §4 (기존 유지) | lines 65-78 | ✅ |

### 2.3 API Contract — **100%**

| 쿼리 | Design 스펙 | 구현 | 상태 |
|------|-------------|------|:----:|
| `profiles` select | display_name, avatar_url, is_verified | line 34 | ✅ |
| `playlists` select + filters | id, title, thumbnail_url, channel_name, track_count · uploaded_by=userId · is_active=true | lines 36-41 | ✅ |
| `user_playlists` select + filters | id, name, created_at · user_id=userId · is_public=true | lines 42-47 | ✅ |
| follows count (followers) | following_id=userId, head count | line 48 | ✅ |
| follows count (following) | follower_id=userId, head count | line 49 | ✅ |
| follows single-row (isFollowing) | follower_id=me · following_id=userId · maybeSingle | lines 51-59 | ✅ |
| `user_playlist_items` nested select | playlists(id, title, thumbnail_url, channel_name) · limit 4 · order position | lines 67-72 | ✅ |

## 3. Plan Success Criteria — 8/8 Met

| # | Criteria | Status | Evidence |
|---|----------|:------:|----------|
| SC-1 | 헤더 팔로워/팔로잉 카운트 | ✅ | page.tsx:98-105 |
| SC-2 | Follow 칩 노출 (타인 접속 시) | ✅ | page.tsx:108-112 · UserFollowChip 내부 가드 |
| SC-3 | self-view Follow 칩 숨김 | ✅ | UserFollowChip.tsx:22 `currentUserId === userId` |
| SC-4 | `is_active=true` 업로드 필터 | ✅ | page.tsx:40 |
| SC-5 | "큐레이션 N개" preview grid 유지 | ✅ | page.tsx:147-178 |
| SC-6 | 큐레이션 아이템 → `/[locale]/playlist/[id]` | ✅ | page.tsx:160 |
| SC-7 | 빈 상태 분리 (uploads dashed / curations 섹션 비렌더) | ✅ | page.tsx:120, 145 |
| SC-8 | `/me/profile` ↔ `/profile/[자기id]` 데이터 일치 | ✅ (code-matched) | 쿼리 구조 동일 — 런타임 검증은 수동 QA 영역(Plan §4 명시) |

## 4. Decision Record Verification

| Decision | Followed? | 근거 |
|----------|:---------:|------|
| D-1 self-view no redirect | ✅ | no redirect logic in page.tsx |
| D-2 server-side follow check | ✅ | .maybeSingle() line 51-59 |
| D-3 업로드 썸네일 `<img>` (eslint-disable 유지) | ✅ | page.tsx:129-134 |
| D-4 curation 빈 상태 = 섹션 비렌더 | ✅ | page.tsx:145 `{...length > 0 && ...}` |
| D-5 nested query N+1 유지 | ✅ | page.tsx:65-78 |
| D-6 빈 상태 문구 "공개된 플레이리스트가 없어요" | ✅ | page.tsx:122 |

## 5. Match Rate

```
Static-only formula (no E2E runtime, dev server not exercised with test users):
  Overall = (Structural × 0.2) + (Functional × 0.4) + (Contract × 0.4)
          = (100 × 0.2) + (100 × 0.4) + (100 × 0.4)
          = 100%
```

**Match Rate: 100%** (≥90% threshold → pass)

TypeScript: ✅ clean · ESLint: ✅ clean · Dev server: ✅ running(307 locale redirect)

## 6. Gaps / Issues

**Critical**: 없음
**Important**: 없음
**Minor**: 없음

런타임 L2/L3(Playwright) 미실행 — 이 feature는 테스트 파일이 Do 단계에서 생성되지 않았고(단순 UI parity 수정), 브라우저 수동 QA로 충분하다는 Plan §4 결정을 따름.

## 7. 권장 수동 QA 체크리스트

| # | 시나리오 | 기대 결과 |
|---|---------|-----------|
| Q1 | 검색 → 업로더 유저 클릭 | 헤더에 팔로워/팔로잉 + Follow 칩 + 업로드 grid 노출 |
| Q2 | `/profile/[내id]` 접속 | Follow 칩 숨김, 섹션 정상 |
| Q3 | 비로그인 상태로 `/profile/[유저id]` | Follow 칩 숨김 |
| Q4 | Follow 클릭 | 칩이 "팔로잉"으로 토글, 새로고침 후 유지 |
| Q5 | `/me/profile`의 "플레이리스트 N개" 숫자와 `/profile/[내id]`의 숫자 일치 | 동일 |
| Q6 | 큐레이션 preview 아이템 클릭 | `/{locale}/playlist/[id]`로 이동 |
| Q7 | 업로드 0개 유저 프로필 | "공개된 플레이리스트가 없어요" dashed 박스 |
| Q8 | 없는 userId | 404 |

## 8. 결론

모든 정적 분석 축에서 100% Match Rate 달성. 8개 Plan SC 모두 코드 레벨에서 충족. Decision Record 6개 모두 준수. Critical/Important 이슈 無. → **Report phase 진행 가능**.
