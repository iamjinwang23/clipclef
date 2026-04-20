# Report: tracklist-title-artist-swap

> 완료일: 2026-04-21 · Status: **Completed** · Match Rate: **100%** · Iterations: **0**

## Executive Summary

### 1.1 What / Why

관리자 플리 업로드 시 트랙의 제목·아티스트 컬럼을 실수로 뒤바꿔 입력하는 일이 잦았고, 수십 트랙짜리 플리에서 행 단위 수동 교정은 피로 비용이 큼. 한 번 클릭으로 모든 행의 두 컬럼을 맞교환하는 버튼이 필요했다.

### 1.2 How

TrackEditor 헤더 우측(기존 "+ 트랙 추가" 왼쪽)에 `제목 ⇄ 아티스트` 버튼을 추가. 클릭 한 번으로 `tracks.map` 한 줄이 전 행을 스왑하고, null 값은 `''`로 정규화해 저장 안전성 확보. self-inverse(재클릭 원복) 특성 덕에 확인 다이얼로그 불필요. 200ms 배경 flash로 클릭 피드백. 신규 파일·DB 변경 0.

### 1.3 Value Delivered

| 관점 | 결과 |
|------|------|
| Problem | ✅ 수십 행 수동 교정 → 1회 클릭으로 해결 |
| Solution | ✅ `tracks.map` + null→`''` 정규화 + self-inverse 스왑 구현 |
| UX Effect | ✅ 버튼 노출·피드백·접근성(aria-label) 모두 Plan SC 수준 충족 |
| Core Value | ✅ 업로더 친화성 향상, 큐레이션 생산 속도 개선 (수동 QA로 최종 확인 필요) |

## 2. PDCA 요약

| Phase | 산출물 | 핵심 활동 |
|-------|--------|-----------|
| Plan | `public-profile-parity` 아님 — `tracklist-title-artist-swap.plan.md` | 8 SC 정의, 4 Checkpoint 답변 수집 (우측 배치, 0개 숨김, flash 피드백, null→`''`) |
| Design | `tracklist-title-artist-swap.design.md` | Option C Pragmatic 선택, 7 Decisions 고정 (Unicode `⇄`, inline handler, useState+setTimeout, 조건부 렌더, type="button", `''` 정규화, cleanup 생략) |
| Do | `src/features/admin/components/PlaylistForm.tsx` (+25 lines) | 단일 모듈, Design Ref 주석 3개, typecheck/lint 통과 |
| Check | `tracklist-title-artist-swap.analysis.md` | Static 3축 각 100%, 8/8 SC Met, 7/7 Decisions Followed, Gaps 0 |
| Act | — | 불필요 (Match Rate 100%, Iteration 0) |

## 3. Key Decisions & Outcomes

| Decision | Phase | Followed? | Outcome |
|----------|:-----:|:---------:|---------|
| 확인 다이얼로그 없이 즉시 스왑 | Plan | ✅ | self-inverse라 재클릭 복구 — 사용성 우선 |
| 버튼은 텍스트 + `⇄` 아이콘, "+ 트랙 추가" 왼쪽 | Plan | ✅ | 기존 버튼 톤과 일치 |
| 트랙 0개면 버튼 자체 숨김 | Plan | ✅ | `{tracks.length > 0 && ...}` 조건부 |
| Architecture Option C (Pragmatic) | Design | ✅ | 단일 파일, 로컬 useState flash |
| D-1 Unicode `⇄` (아이콘 라이브러리 무설치) | Design | ✅ | 의존성 0 추가 |
| D-2 핸들러 inline | Design | ✅ | YAGNI 준수 |
| D-3 useState + setTimeout(200) flash | Design | ✅ | `:active`의 pointer-up 즉시 종료 문제 회피 |
| D-5 `type="button"` 명시 | Design | ✅ | 폼 submit 유발 방지 |
| D-6 null → `''` 정규화 | Design | ✅ | 저장 validation 안전 |

## 4. Success Criteria Final Status — **8/8 Met (100%)**

| # | Criteria | Status | Evidence |
|---|----------|:------:|----------|
| SC-1 | 헤더 우측 스왑 버튼 노출 | ✅ | PlaylistForm.tsx:173-186 |
| SC-2 | 전 행 title ↔ artist 스왑 | ✅ | :154-160 |
| SC-3 | 다른 필드 불변 | ✅ | :156 spread `...t` |
| SC-4 | 재클릭 원복 (self-inverse) | ✅ | 수학적 증명 |
| SC-5 | null 안전 처리 | ✅ | :157-158 `?? ''` |
| SC-6 | tracks 0개면 비렌더 | ✅ | :173 conditional |
| SC-7 | ~200ms flash 피드백 | ✅ | :163-164 setTimeout |
| SC-8 | submit 간섭 없음 | ✅ | :175 `type="button"` |

## 5. Delta & Metrics

| 항목 | Before | After |
|------|:------:|:-----:|
| 트랙 제목·아티스트 뒤바뀜 교정 | 행마다 수동 (N번 셀 편집) | 1회 클릭 |
| 변경 파일 | — | 1개 (`PlaylistForm.tsx`) |
| 신규 파일 / DB 변경 | — | 0 / 0 |
| 코드 변경량 | — | +25 lines |
| TypeScript 에러 | — | 0 |
| ESLint 경고 | — | 0 |
| 신규 의존성 | — | 0 (Unicode 문자 사용) |

## 6. Learnings & Future Work

### 잘 된 점

- **Option C Pragmatic이 정확히 맞는 선택**: 버튼 하나에 서브컴포넌트+훅(B)은 과설계, CSS `:active`만(A)은 200ms 피드백 요건 미충족. 로컬 useState + setTimeout이 균형점.
- **self-inverse 특성을 디자인에 적극 활용**: 확인 다이얼로그 제거 → 반복 작업 마찰 최소화. 수학적 증명(`f(f(t))=t`)으로 안전성 담보.
- **null 정규화 결정(D-6)을 Plan 단계에서 확정**: 저장 validation 위험을 설계 시점에 차단.
- **기존 패턴 재사용**: 헤더 톤·색상 토큰·`type="button"` 모두 `+ 트랙 추가` 버튼과 일치해 일관성 확보.

### 개선 여지 / 후속 작업

- **일반 유저 편집 화면에 미적용**: 현재는 admin 전용. 일반 유저가 플리 트랙을 편집하는 UI가 생기면 동일 기능 이식 필요.
- **선택 행만 스왑**: 부분 스왑이 필요한 시나리오가 관찰되면 체크박스 모드 추가 고려.
- **Undo/Redo 스택**: 다른 편집 액션과 통합된 히스토리가 필요해지면 별도 설계.
- **AI 감지**: 입력 패턴 기반 "뒤바뀐 것 같아요" 제안 (LLM 통합 후보).
- **setTimeout cleanup**: 장시간 사용자가 없어 이슈 無 관찰되지만, Strict Mode 이중 실행이 문제가 되면 `useRef` 기반 cleanup으로 업그레이드.

## 7. 참조 문서 & 변경 파일

### 문서
- Plan: `docs/01-plan/features/tracklist-title-artist-swap.plan.md`
- Design: `docs/02-design/features/tracklist-title-artist-swap.design.md`
- Analysis: `docs/03-analysis/tracklist-title-artist-swap.analysis.md`

### 변경 파일
- `src/features/admin/components/PlaylistForm.tsx` — TrackEditor 내부 +25 lines

### 재사용 파일 (수정 無)
- 없음 (단독 구현, 외부 헬퍼 無)
