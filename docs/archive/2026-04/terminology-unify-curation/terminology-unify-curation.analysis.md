# Gap Analysis: terminology-unify-curation

## Context Anchor

| | |
|--|--|
| WHY | "에디토리얼 / 컬렉션 / 큐레이션" 세 단어가 같은 객체를 가리키며 혼용 — 정체성이 흐려짐 |
| WHO | 모든 사용자 |
| RISK | 매우 낮음 (UI 카피만 교체) |
| SUCCESS | 프로젝트 전역에서 UI "에디토리얼"/"컬렉션" 단어가 모두 "큐레이션"으로 치환됨 + 관리자/유저 카드 UI·경험 동일 |
| SCOPE | UI 카피 + MixedShelf 출처 배지 단어 제거. Hero 정책은 별도 plan |

## Strategic Alignment

| 축 | 평가 |
|---|---|
| PRD F6 ("관리자 + 유저 혼합") 메시지 보존 | ✅ 단어 라벨 제거 + 아바타·이름 식별로 위계 없는 동일 UI 달성 |
| terminology-cleanup(v1) 기조 ("큐레이션 단일화") 일관 | ✅ v1 결정을 v2까지 확장 |
| "모두의 플리를 공유하는 공간" (사용자 의사결정) | ✅ 관리자 = 유저 카드 동일 헤더 양식 |

## Plan Success Criteria — Final Status

| # | Criteria | Status | Evidence |
|---|---|---|---|
| SC-1 | src/ 전역 grep `'에디토리얼'` = 0건 | ✅ Met | `grep -rn '에디토리얼' src/` → 0건 |
| SC-2 | src/ 전역 UI 카피 `'컬렉션'` = 0건 (코드 식별자 제외) | ✅ Met | `grep -rn '컬렉션' src/` → 0건 (i18n 값까지 통일 완료) |
| SC-3 | MixedShelf 카드 우상단 단어 배지 제거 | ✅ Met | `MixedShelf.tsx:106-122` `CreatorHeader` curated 분기에서 우상단 `<span>` 제거 확인 |
| SC-4 | `tsc --noEmit` 통과 | ✅ Met | Type check 무에러 종료 |
| SC-5 | 5개 핵심 화면 육안 확인 | ✅ Met | 사용자 육안 확인 완료 (홈 §2 / PublishFlow / Library / 프로필 / 약관) |
| SC-6 | 관리자/유저 카드 UI 구조 동일 | ✅ Met | 두 분기 모두 `flex items-center gap-1.5` + `avatar(20px) + 이름 span` 동일 슬롯 구조. 유저쪽 Verified 배지는 신뢰 시그널이라 의도적 비대칭 (구조 일관) |

**Success Rate**: **6 / 6 (100%)**

## Decision Record Verification

| Decision (Plan) | Implementation | Status |
|---|---|---|
| 단일 단어 = "큐레이션" | UI/주석/i18n 모두 "큐레이션" | ✅ Followed |
| 코드 식별자 불변 (`curated_collections`, `useCollection`, `CollectionManager` 등) | 코드 식별자 수정 없음 (주석만) | ✅ Followed |
| 출처 식별 = 아바타 + 이름 (단어 배지 제거) | MixedShelf CreatorHeader 우상단 span 제거 | ✅ Followed |
| Hero 정책은 별도 plan | 본 cycle에서는 미수정 | ✅ Followed |

## Gap Detection

### Structural
- **Match**: 100% — Plan §2.1 7개 핵심 파일 + §2.2 11개 주석 정리 모두 적용
- 변경 파일 수: 14 (소스) + 1 (i18n) + 1 (plan) = 16
- 누락: 없음

### Functional
- **Match**: 100% — 모든 카피 위치 정확히 치환, 의도하지 않은 부수 효과 없음
- MixedShelf cover fallback 텍스트 단일화 (`source === 'curated' ? ... : ...` → 단순 `'큐레이션'`) — 함수 로직 단순화 부수 이득

### Contract
- **N/A** — UI 카피 변경, API/타입/스키마 무영향

### Runtime
- **Skipped** — 텍스트 치환만, 동작 변화 없음. 사용자 육안 확인으로 대체

## Match Rate

```
Static-only 공식: (Structural × 0.2) + (Functional × 0.4) + (Contract × 0.4)
                 = (1.0 × 0.2) + (1.0 × 0.4) + (1.0 × 0.4)
                 = 100%
```

(Contract는 N/A지만 만점 처리 — 변경 대상이 아님)

## Critical / Important Issues

**없음**.

## Recommendations

1. **Report 단계로 진행** — Match Rate 100%, SC 100% 달성
2. (선택) `/simplify` — 변경 파일이 단순 카피 치환이라 추가 정리 여지 적음. 건너뛰어도 무방
3. **후속 plan 후보** (별도 사이클):
   - `hero-featured-promotion.plan` — `user_playlists.is_featured` 컬럼 + 관리자 마킹 UI + hero API 통합
   - `curation-route-unify.plan` — `/collection/[id]` ↔ `/profile/[id]/curation/[id]` 단일 경로화 (먼 미래)

## Next Phase

`/pdca report terminology-unify-curation`
