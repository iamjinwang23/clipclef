# Feature Plan: terminology-unify-curation

## Executive Summary

| 관점 | 내용 |
|------|------|
| Problem | "에디토리얼 / 컬렉션 / 큐레이션" 세 단어가 같은 객체를 가리키며 혼용 — 한 화면 흐름 안에서 단어가 계속 바뀌어 정체성이 흐려짐 |
| Solution | UI 단어를 **"큐레이션"** 하나로 통일. 관리자 vs 유저 출처 구분은 단어 라벨 대신 **아바타·이름**으로 표현 |
| UX Effect | 모든 화면에서 같은 단어 — "큐레이션 발행, 큐레이션 N개, 큐레이션 관리, 첫 큐레이션…" 일관 |
| Core Value | "ClipClef = 모두의 큐레이션 아카이브" — 관리자/유저 위계 없이 동일 UI·경험 (PRD F6 메시지 보존) |

## Context Anchor

| | |
|--|--|
| WHY | 기존 terminology-cleanup(v1) 이후 v2 PRD F6/F8이 "에디토리얼·컬렉션"을 별도 단어로 도입하면서 어휘가 셋으로 늘어남 |
| WHO | 모든 사용자 — 단어 일관성 체감 |
| RISK | 매우 낮음 (UI 카피만 교체, DB·코드 식별자·API 경로 모두 불변) |
| SUCCESS | 프로젝트 전역에서 UI 표시되는 "에디토리얼" / "컬렉션" 단어가 모두 "큐레이션"으로 치환됨. 관리자/유저 큐레이션 카드 UI·경험 동일. |
| SCOPE | UI 카피 + MixedShelf 출처 배지 단어 제거. Hero 정책 변경은 **별도 plan**으로 분리. |

## 1. 용어 결정

| 이전 | 이후 | 비고 |
|------|------|------|
| 에디토리얼 | **큐레이션** | UI 단어만. 코드 식별자 `curated_*` 그대로 |
| 컬렉션 (UI) | **큐레이션** | UI 단어만. 테이블/훅 식별자 `collections`, `useCollection` 그대로 |
| 큐레이션 | **큐레이션** | 그대로 |

**관리자 vs 유저 출처 식별 방법** (단어 대체):
- 관리자 카드: `clip/clef` 아바타 + 이름 (+ Verified 배지)
- 유저 카드: 유저 아바타 + 닉네임 (+ Verified 배지 — 인증된 경우)
- 카드 우상단 단어 배지 ("에디토리얼"/"컬렉션") **제거**

## 2. 변경 파일 목록 (UI 카피만)

### 2.1 핵심 변경 (7 파일)

| 파일 | 줄 | 이전 | 이후 |
|------|-----|------|------|
| `src/app/[locale]/page.tsx` | 41 | `// § 2 에디토리얼·컬렉션 (관리자 + 유저 발행 혼합)` | `// § 2 큐레이션 (관리자 + 유저 발행 혼합)` |
| `src/app/[locale]/page.tsx` | 42 | `<HomeSection label="에디토리얼·컬렉션">` | `<HomeSection label="큐레이션">` |
| `src/features/curation/components/MixedShelf.tsx` | 45 | `첫 에디토리얼을 기다리고 있어요` | `첫 큐레이션을 기다리고 있어요` |
| `src/features/curation/components/MixedShelf.tsx` | 87 | `{item.source === 'curated' ? '에디토리얼' : '컬렉션'}` | `큐레이션` (단순 문자열) |
| `src/features/curation/components/MixedShelf.tsx` | 119-122 | `CreatorHeader` 우상단 `에디토리얼` 배지 `<span>` 블록 | **삭제** (Verified 배지로 식별) |
| `src/features/curation/components/PublishFlow.tsx` | 82 | `컬렉션 발행` | `큐레이션 발행` |
| `src/features/curation/components/PublishFlow.tsx` | 294 | `컬렉션 이름` | `큐레이션 이름` |
| `src/features/curation/components/PublishFlow.tsx` | 322 | `이 컬렉션을 한 줄로 설명해주세요` | `이 큐레이션을 한 줄로 설명해주세요` |
| `src/features/library/components/LibraryGrid.tsx` | 56 | `내가 만든 컬렉션` | `내가 만든 큐레이션` |
| `src/features/library/components/LibraryGrid.tsx` | 68 | `이 플리들을 묶어서 컬렉션으로 발행해보세요` | `이 플리들을 묶어서 큐레이션으로 발행해보세요` |
| `src/features/library/components/LibraryGrid.tsx` | 106 | `아직 만든 컬렉션이 없어요. … 묶어서 발행할 수 있어요.` | `아직 만든 큐레이션이 없어요. … 묶어서 발행할 수 있어요.` |
| `src/features/library/components/LibraryGrid.tsx` | 132 | `아직 발행한 컬렉션이 없어요.` | `아직 발행한 큐레이션이 없어요.` |
| `src/app/[locale]/privacy/page.tsx` | 15 | `좋아요·댓글·컬렉션 저장 등 서비스 기능 제공` | `좋아요·댓글·큐레이션 저장 등 서비스 기능 제공` |
| `src/app/[locale]/terms/page.tsx` | 18 | `개인 컬렉션 저장 기능` | `개인 큐레이션 저장 기능` |
| `src/app/[locale]/me/profile/ProfileForm.tsx` | 137 | `모든 댓글, 좋아요, 컬렉션 데이터가 삭제됩니다.` | `모든 댓글, 좋아요, 큐레이션 데이터가 삭제됩니다.` |

### 2.2 코드 주석 정리 (선택 — 가독성)

다음은 **선택**: 주석에 남은 "에디토리얼/컬렉션" 표현을 "큐레이션"으로 정리해 향후 검색·이해에 도움. (런타임 영향 0)

- `src/features/curation/components/MixedShelf.tsx:3` — Design Ref 주석
- `src/features/curation/components/MixedShelf.tsx:108` — `// 브랜드 표시 — clip/clef 에디토리얼` → `// 브랜드 표시 — clip/clef 큐레이션`
- `src/app/[locale]/me/library/page.tsx:2` — `Plan FR-07: 저장한 플리 + 내가 만든 컬렉션 통합 뷰` → `… 내가 만든 큐레이션 통합 뷰`
- `src/features/library/components/LibraryGrid.tsx:4` — 동일 패턴
- `src/features/library/components/LibraryGrid.tsx:38` — 주석
- `src/features/interaction/components/CollectionButton.tsx:2` — Design Ref 주석
- `src/features/interaction/hooks/useCollection.ts:2` — 주석
- `src/features/admin/components/CollectionManager.tsx:8,61,377` — 주석
- `src/app/api/admin/collections/route.ts:19,49,66,83,94,102,114,120,122` — 주석
- `src/app/api/user-playlists/publish/route.ts:2` — 주석

→ **결정 필요**: 주석까지 정리할지(권장) / 코드만 할지

## 3. 변경하지 않는 것 (Out of Scope)

- DB 테이블/컬럼명: `curated_collections`, `curated_collection_items`, `user_playlists.published_at`
- 컴포넌트/훅 식별자: `MixedShelf`, `CollectionManager`, `CollectionButton`, `useCollection`, `CollectionPageClient`, `CollectionGrid`, `CollectionPlayer`, `CuratedCollectionSection`
- API 경로: `/api/admin/collections`, `/api/collections`, `/api/mixed-shelf`
- 페이지 경로: `/collection/[id]`
- 아카이브된 PDCA 문서 ("에디토리얼/컬렉션" 역사 보존)
- **Hero 정책** (관리자만 vs 유저 포함 결정) — 별도 plan으로 분리

## 4. Success Criteria

1. 프로젝트 src/ 전역 grep `'에디토리얼'` 결과 = 0건 (주석 포함 시) 또는 코드 0건 + 주석은 별도 결정
2. 프로젝트 src/ 전역 grep `'컬렉션'` 결과 = UI 표시 카피에 0건 (코드/주석 식별자 제외)
3. MixedShelf 카드 우상단 단어 배지 사라짐 — 관리자 카드도 유저 카드와 동일 헤더 구조 (아바타 + 이름)
4. `tsc --noEmit` 통과
5. 주요 화면 육안 확인:
   - 홈 § 2 섹션 타이틀: `큐레이션`
   - PublishFlow 모달: `큐레이션 발행 / 큐레이션 이름`
   - /me/library: `내가 만든 큐레이션 / 발행한 큐레이션`
   - /me/profile, /profile/[id]: `큐레이션 N개`
   - Admin 탭: `큐레이션 관리` (이미 큐레이션, 변경 없음)
6. 관리자 큐레이션 카드와 유저 큐레이션 카드의 UI 구조가 동일함 (헤더 양식, 카드 폭, 정보 위계)

## 5. Risks & Mitigation

| 위험 | 완화 |
|------|------|
| `'컬렉션'` 단어가 약관·프라이버시·프로필 폼 등 비-카드 위치에도 등장 → grep 누락 | 5개 위치 (privacy:15, terms:18, ProfileForm:137, LibraryGrid 4곳, PublishFlow 3곳) 명시적 변경 후 재 grep |
| 관리자 카드의 시각적 위계 약화 (단어 배지 제거 영향) | clip/clef 브랜드 아바타 + Verified 배지 + (선택) 약간의 색상 강조 — 디자인 단계에서 결정 |
| 유저가 "에디토리얼"이라는 기존 단어로 멘탈 모델을 이미 형성 | 알파 단계라 기존 사용자 풀 미미. 변경 시점이 늦어질수록 비용 ↑ → 지금 변경이 정답 |

## 6. Implementation Approach

1. **Phase 1 — 핵심 카피 7파일 일괄 치환**
   - `page.tsx` 섹션 라벨 1줄
   - `MixedShelf.tsx` empty state + cover fallback + CreatorHeader 우상단 배지 제거
   - `PublishFlow.tsx` 3줄
   - `LibraryGrid.tsx` 4줄
   - `privacy/page.tsx` / `terms/page.tsx` / `ProfileForm.tsx` 각 1줄

2. **Phase 2 — (선택) 주석 정리**
   - 위 §2.2 목록 grep 후 일괄 치환

3. **Phase 3 — 검증**
   - `tsc --noEmit`
   - `grep -rn '에디토리얼' src/` = 0건
   - `grep -rn '컬렉션' src/` 결과 검토 (코드 식별자만 남는지 확인)
   - 로컬 dev 실행, 핵심 5화면 육안 확인

## 7. Out of Scope → 후속 plan 후보

- **`hero-featured-promotion.plan`** (별도): `user_playlists.is_featured` 컬럼 추가, 관리자 패널 마킹 UI, hero API 통합
- **`curation-route-unify.plan`** (먼 미래): `/collection/[id]` 와 `/profile/[id]/curation/[id]` 를 `/curation/[id]` 단일 경로로 통합

## 8. Open Question

1. **주석까지 정리 여부**: §2.2 11개 파일의 주석 단어도 "큐레이션"으로 정리할지? (권장: 정리)
2. **`/collection/[id]` 페이지 경로 슬러그 변경**: 이번엔 안 하지만 향후 `/curation/[id]`로 갈지 선결정 — Out of Scope로 별도 plan화 권장
