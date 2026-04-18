# search-enhancement Analysis Report

> **Date**: 2026-04-19
> **Match Rate**: 97.5% (static-only)
> **Plan**: [search-enhancement.plan.md](../01-plan/features/search-enhancement.plan.md)
> **Design**: [search-enhancement.design.md](../02-design/features/search-enhancement.design.md)

---

## Context Anchor

| | |
|--|--|
| WHY | 검색이 플리/트랙/아티스트만 혼합 노출 → 사용자·채널·태그 탐색 불가, Enter 시 결과 페이지 없음 |
| WHO | 특정 유저/채널/아티스트/태그 기반 탐색자 |
| RISK | 드롭다운 3곳 분산 / N+1 / 채널 상세 페이지 부재 |
| SUCCESS | 4섹션 드롭다운 → `/search?q=` → 5섹션 결과 + 팔로우 칩 |
| SCOPE | Module-1 Hooks/Utils → Module-2 Dropdown UI → Module-3 Results Page → Module-4 Entry Point |

---

## Match Rate

| Axis | Score | Weight | Weighted |
|------|:----:|:-----:|:-------:|
| Structural | 100% | 0.2 | 20.0 |
| Functional | 95% | 0.4 | 38.0 |
| Contract | 100% | 0.4 | 40.0 |
| **Overall** | | | **97.5%** |

Runtime verification: skipped (no server running; static-only formula applied).

---

## Strategic Alignment

| Question | Status |
|----------|--------|
| 드롭다운이 4섹션(아티스트·사용자·채널·영상)으로 제대로 분기되는가? | ✅ |
| Enter 시 전용 결과 페이지로 이동하는가? | ✅ |
| 결과 페이지가 5섹션으로 엔터티별 탐색을 지원하는가? | ✅ |
| 팔로우 상태가 N+1 없이 배치 조회되는가? | ✅ `useBatchFollow` |

---

## Plan Success Criteria

| SC | 설명 | 상태 | Evidence |
|:--:|------|:----:|----------|
| 1 | 드롭다운 4섹션 순서 (아티스트→사용자→채널→영상) | ✅ Met | `SearchDropdown.tsx:74-176`, `types.ts:49-55` |
| 2 | 아티스트 행 우측 "아티스트" 텍스트 삭제 | ✅ Met | `SearchDropdown.tsx:94-95` |
| 3 | 사용자 팔로우 칩 + 이동차단 + 로그인시만 | ✅ Met | `UserFollowChip.tsx:22-26` |
| 4 | Enter → `/search?q=...` 이동 | ✅ Met | `Header.tsx` DesktopSearchBar `applySearch` → `router.push` |
| 5 | 결과 페이지 5섹션 + 개수 제한 + 빈 섹션 숨김 | ✅ Met | `SearchResults.tsx:61-167` + `RESULTS_LIMITS` |
| 6 | 태그 칩 → 필터 적용 후 홈 | ✅ Met | `SearchResults.tsx:43-51` |
| 7 | `/search` 페이지 `?q` 유무 분기 | ✅ Met | `/search/page.tsx:25, 89-99` |

**Success Rate**: 7/7 (100%)

---

## Decision Record Verification

| Decision | Followed? | Evidence |
|----------|:---------:|----------|
| [Plan] `/search?q=` 결과 페이지 | ✅ | `app/[locale]/search/page.tsx`, Header router.push |
| [Plan] 드롭다운 순서 아티스트→사용자→채널→영상 | ✅ | `SearchDropdown.tsx` section order |
| [Design] Architecture Option C (Pragmatic) | ✅ | 신규 파일 7개(훅 3 + 컴포넌트 4), Header/search 페이지 리팩터 |
| [Design] 팔로우 배치(`getFollowStates`) | ✅ | `lib/follow-batch.ts:7-27`, `useBatchFollow.ts` |
| [Design] 채널 엔터티 가상화 (channel_id distinct + count) | ✅ | `useSearch.ts:107-130` |

---

## Gap List

| ID | Severity | Conf | File | Description | 처리 |
|----|:--------:|:----:|------|-------------|------|
| G-1 | Minor | High | `SearchResults.tsx:45` | 태그 클릭 시 `filterStore.reset()` 호출 — Plan SC 6은 "apply tag"만 명시. 기존 필터가 있었다면 덮어쓰게 됨 | Accept (명확한 진입점 원칙) |
| G-2 | Minor | Med | `useSearch.ts:86` | `id.in.(${trackIds.join(',')})` 인라인 — UUID라 안전하나 포맷 변경 시 취약 | Accept |
| G-3 | Minor | Med | `SearchResults.tsx:132-148` | Design §5.3은 아티스트 세로행, 구현은 `ArtistCard` 가로 스트립 (사용자 요청으로 변경) | **Design §5.3 수정 필요** |
| G-4 | Minor | Low | `SearchDropdown.tsx:49` | `useSearch(debounced, limits ?? DROPDOWN_LIMITS)` 중복 기본값 — 훅 내부에서 이미 merge | Accept (harmless) |

**Critical**: 0 / **Important**: 0 / **Minor**: 4

---

## Recommendations

- **반복(iterate) 불필요** — 97.5%로 90% 게이트 충족.
- **G-3 처리**: Design §5.3 아티스트 섹션 설명을 "수평 `ArtistCard` 스트립 (플리 상세 `ArtistStrip`과 동일)"으로 업데이트하면 닫힘. 코드 변경 불필요.
- **SearchOverlay 언급 정리**: Design §11.1의 SearchOverlay.tsx는 **삭제 완료** (mobile-nav-ux 이후 dead code). Design을 최신화할 때 함께 반영.

---

## Additional UX Tweaks Applied (Post-Do)

사용자 요청으로 추가 반영된 스타일 변경:

1. `SearchResults.SectionHeader` → `text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide` (플리 상세 `ArtistStrip` 레이블 스타일로 통일)
2. 아티스트 섹션 → `ArtistCard` 가로 스크롤 스트립 (80px 원형 썸네일, 플리 상세와 동일)

이 변경은 Plan SC를 위반하지 않으며 Design §5.3의 도식 갱신만 필요 (G-3).
