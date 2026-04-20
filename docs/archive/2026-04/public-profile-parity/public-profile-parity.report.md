# Report: public-profile-parity

> 완료일: 2026-04-20 · Status: **Completed** · Match Rate: **100%** · Iterations: 0

## Executive Summary

### 1.1 What / Why

검색으로 타인의 프로필(`/profile/[userId]`)에 진입했을 때 **user_playlists(큐레이션)만 "플레이리스트"로 잘못 라벨링**되고 업로드한 실제 플레이리스트가 완전히 누락되는 버그. `/me/profile`과 정보 아키텍처가 달라 같은 유저도 다른 사람처럼 보였다.

### 1.2 How

`/profile/[userId]/page.tsx` 단일 파일을 재작성하여 `/me/profile` 구조(헤더 + 업로드 grid + 큐레이션 preview grid)를 이식. 서버 컴포넌트에서 6개 쿼리 `Promise.all` 병렬 처리, Follow 초기 상태도 서버에서 조회해 깜빡임 없이 `UserFollowChip` 재사용. `/me/profile`은 일절 건드리지 않음(회귀 위험 최소화).

### 1.3 Value Delivered

| 관점 | 결과 |
|------|------|
| Problem | ✅ 공개 프로필에 업로드 플리 섹션 추가 + "플레이리스트"/"큐레이션" 라벨 분리 완료 |
| Solution | ✅ `/me/profile`과 동일한 3섹션 정보 아키텍처 + 서버 6-way parallel fetch 구현 |
| UX Effect | ✅ 헤더에 팔로워/팔로잉 카운트 + Follow 칩 노출 — 검색→프로필 전환 경로 정비 |
| Core Value | ✅ 업로더 프로필 신뢰성 복원 (수동 QA 후 최종 확인 필요) |

## 2. PDCA 요약

| Phase | 산출물 | 핵심 활동 |
|-------|--------|-----------|
| Plan | `docs/01-plan/features/public-profile-parity.plan.md` | 버그 원인 식별, 8개 SC 정의, 4개 Checkpoint 답변 수집 |
| Design | `docs/02-design/features/public-profile-parity.design.md` | 3개 아키텍처 옵션 제시 → **C Pragmatic** 선택, 6-way 쿼리 스펙 + 6개 Decision 고정 |
| Do | `src/app/[locale]/profile/[userId]/page.tsx` (104→183 lines) | 단일 모듈, Design Ref 코멘트 포함, typecheck/lint 통과 |
| Check | `docs/03-analysis/public-profile-parity.analysis.md` | Static 3축 각 100%, 8/8 SC Met, 6/6 Decisions Followed, Gaps 0 |
| Act | — | 불필요 (Match Rate 100%, Iteration 0) |

## 3. Key Decisions & Outcomes

| Decision | Phase | Followed? | Outcome |
|----------|:-----:|:---------:|---------|
| `/me/profile` 구조 채택 (업로드 + 큐레이션 분리) | Plan | ✅ | 공개 프로필에 업로드 섹션 추가, 라벨 "큐레이션" 변경 |
| Follow 칩을 헤더에 추가 | Plan | ✅ | `UserFollowChip` 재사용, 공개 프로필 헤더에 배치 |
| 큐레이션 4개 preview grid 스타일 유지 | Plan | ✅ | 기존 grid-cols-2 sm:grid-cols-4 + 라벨만 교체 |
| 아키텍처 Option C Pragmatic | Design | ✅ | 단일 파일 재작성, `/me/profile` 무변경 |
| D-1 Self-view 리다이렉트 하지 않음 | Design | ✅ | chip 내부 가드로 처리, 별도 redirect 로직 無 |
| D-2 Follow 초기 상태 서버 조회 | Design | ✅ | `.maybeSingle()` 1회, 깜빡임·N+1 회피 |
| D-3 업로드 썸네일 `<img>` 유지 | Design | ✅ | `/me/profile`과 동일 패턴 |
| D-4 큐레이션 0개면 섹션 비렌더 | Design | ✅ | `{length > 0 && ...}` 조건부 |
| D-5 nested N+1 유지 | Design | ✅ | 기존 `user_playlist_items` 쿼리 패턴 보존 |
| D-6 빈 상태 문구 분리 | Design | ✅ | "공개된 플레이리스트가 없어요" / "담긴 플레이리스트가 없어요" |

## 4. Success Criteria Final Status — **8/8 Met (100%)**

| # | Criteria | Status | Evidence |
|---|----------|:------:|----------|
| SC-1 | 헤더 팔로워/팔로잉 카운트 표시 | ✅ | page.tsx:98-105 |
| SC-2 | Follow 칩 노출 (타인 접속 시) | ✅ | page.tsx:108-112 |
| SC-3 | 본인 셀프-뷰 Follow 칩 숨김 | ✅ | UserFollowChip.tsx:22 internal guard |
| SC-4 | 업로드 `is_active=true` 필터 | ✅ | page.tsx:40 |
| SC-5 | 큐레이션 4개 preview grid 유지 + 라벨 변경 | ✅ | page.tsx:147-178 |
| SC-6 | 큐레이션 아이템 클릭 → `/{locale}/playlist/{id}` | ✅ | page.tsx:160 |
| SC-7 | 빈 상태 분리 (uploads dashed / curations 섹션 비렌더) | ✅ | page.tsx:120, 145 |
| SC-8 | `/me/profile` ↔ `/profile/[자기id]` 데이터 일치 | ✅ (code-matched) | 쿼리 구조 동일 — 런타임은 수동 QA 영역 |

## 5. Delta & Metrics

| 항목 | Before | After |
|------|:------:|:-----:|
| `/profile/[userId]` 섹션 수 | 1 (라벨 오류 `user_playlists` only) | 2 (업로드 + 큐레이션) |
| 헤더 메타 | 이름 + "플레이리스트 N개" | 이름 + 팔로워/팔로잉 + Follow 칩 |
| 업로드 플리 노출 | ❌ 완전 누락 | ✅ grid-cols-2 sm:grid-cols-3 |
| 쿼리 수 | 3 | 6 (모두 parallel, count/head는 비용 미미) |
| 변경 파일 | — | 1개 (`page.tsx`) |
| 신규 파일 / DB 변경 | — | 0 / 0 |
| 코드 변경량 | — | +79 lines (104 → 183) |
| TypeScript 에러 | — | 0 |
| ESLint 경고 | — | 0 |

## 6. Learnings & Future Work

### 잘 된 점

- **대칭 구조 ground truth 전략**: `/me/profile`을 변경하지 않고 공개 프로필만 동일 구조로 끌어올림 → 회귀 zero, 목적에 정확히 핏.
- **Plan Checkpoint 4단 질문**이 스코프 확대를 잘 막음 (follow 칩 추가 vs 제외, 큐레이션 상세 라우트 vs 생략 등을 초기에 결정).
- **Design Option C 선택**이 over-engineering(공용 컴포넌트 추출)을 피함. 한 세션에 완결.
- **서버 사이드 follow 초기값 조회**로 클라이언트 깜빡임 이슈를 설계 단계에서 차단.

### 개선 여지 / 후속 작업

- **공용 컴포넌트 추출**: `/me/profile`과 `/profile/[userId]`에 사실상 동일한 업로드 grid + 큐레이션 preview grid가 중복 → `ProfileHeader`, `UploadedPlaylistsGrid`, `CurationPreviewSection` 추출하면 향후 드리프트 방지. (Plan §7 Out-of-Scope로 명시)
- **팔로워/팔로잉 목록 페이지** `/profile/[userId]/followers`, `/following` 미구현 — 카운트만 있음.
- **공개 큐레이션 상세 라우트** 부재 — 현재는 아이템을 개별 플리 상세로 직행. 큐레이션 단위로 공유 가능한 URL은 없음.
- **run-time 자동 테스트** 부재 — 단순 UI parity라 Playwright 없이 진행했으나, 향후 profile / follow 관련 변경이 늘면 E2E 테스트 스위트 구축 검토.

## 7. 참조 문서 & 변경 파일

### 문서
- Plan: `docs/01-plan/features/public-profile-parity.plan.md`
- Design: `docs/02-design/features/public-profile-parity.design.md`
- Analysis: `docs/03-analysis/public-profile-parity.analysis.md`

### 변경 파일
- `src/app/[locale]/profile/[userId]/page.tsx` — 전면 재작성 (104 → 183 lines)

### 재사용 파일 (수정 無)
- `src/features/search/components/UserFollowChip.tsx`
- `src/components/ui/UserAvatar.tsx`
- `src/components/ui/VerifiedBadge.tsx`
- `src/lib/supabase/server.ts`
