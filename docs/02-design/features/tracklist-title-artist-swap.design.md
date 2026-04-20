# Design: tracklist-title-artist-swap

> 작성일: 2026-04-21 · Phase: Design · Architecture: **C — Pragmatic** · Plan: `docs/01-plan/features/tracklist-title-artist-swap.plan.md`

## Context Anchor

| | |
|--|--|
| WHY | 트랙리스트 대량 입력 시 제목·아티스트 컬럼 혼동이 잦아 수동 교정 비용이 큼 |
| WHO | 관리자·업로더 (PlaylistForm TrackEditor 사용자) |
| RISK | 실수 클릭(self-inverse로 완화), null 값 저장 validation(`''` 정규화로 회피), 다른 필드 불변 보장 |
| SUCCESS | 버튼 1회 클릭 → 전 행 title↔artist 동시 스왑, 다른 필드 불변, 재클릭 원복, 트랙 0개면 버튼 숨김, 200ms flash |
| SCOPE | `src/features/admin/components/PlaylistForm.tsx` 한 파일. 새 파일·DB 변경 無 |

## 1. Overview

Plan의 모든 Checkpoint 답변을 그대로 반영한 최소 수술:
- `TrackEditor`의 헤더 `<div>` 우측 그룹에 스왑 버튼 추가
- `handleSwap` 핸들러 인라인 정의: `tracks.map`으로 `title`·`artist` 맞교환 + `null → ''` 정규화
- `useState<boolean>` + `setTimeout` 조합으로 200ms flash 상태 관리
- self-inverse 특성으로 undo/history 불필요

**Architecture C (Pragmatic)**: 단일 파일, 로컬 useState flash. A(CSS :active)는 pointer-up에 즉시 종료돼 Plan SC-7(~200ms)을 충족 못함. B(서브컴포넌트+훅)는 버튼 하나에 과도한 추상화.

## 2. 파일 변경 범위

| 파일 | 작업 | 추정 diff |
|------|:----:|:--------:|
| `src/features/admin/components/PlaylistForm.tsx` | `TrackEditor` 함수 내부 수정 | +25 lines |

**신규 파일**: 없음. **DB 변경**: 없음. **API 변경**: 없음.

## 3. 컴포넌트 구조 (After)

```
TrackEditor (existing)
├─ useState: timeInputs (existing)
├─ useState: swapFlash (NEW — 200ms flash toggle)
├─ handleSwap (NEW — title↔artist on all rows)
├─ handleTimeChange/Blur (existing, unchanged)
├─ updateTrack/deleteTrack/addTrack (existing, unchanged)
└─ JSX
    ├─ <div> header
    │   ├─ <p>트랙리스트</p>
    │   └─ <div className="flex gap-2">   (NEW wrapper for right group)
    │       ├─ <button onClick={handleSwap}> (NEW — tracks.length > 0일 때만)
    │       │   └─ 제목 ⇄ 아티스트
    │       └─ <button onClick={addTrack}>+ 트랙 추가</button>  (existing)
    └─ <table> tracks (existing, unchanged)
```

## 4. 핵심 로직

### 4.1 swap handler

```tsx
const [swapFlash, setSwapFlash] = useState(false);

const handleSwap = () => {
  onChange(
    tracks.map((t) => ({
      ...t,
      title: t.artist ?? '',   // Plan §1.2: null → '' 정규화 후 스왑
      artist: t.title ?? '',
    }))
  );
  setSwapFlash(true);
  setTimeout(() => setSwapFlash(false), 200);
};
```

**불변성**: spread `...t`로 `position`·`start_sec`·`duration_sec`·`youtube_video_id` 전부 보존. 두 필드(`title`, `artist`)만 덮어씀.

**self-inverse 증명**: swap을 f라 할 때 `f(f(t)) = t`.
- 1회: `title' = artist ?? ''`, `artist' = title ?? ''`
- 2회: `title'' = artist' ?? '' = (title ?? '') ?? '' = title ?? ''`
  - 원본 title이 null이었다면 1회 후 `''`, 2회 후도 `''`. 원복 성립(null은 UI에선 '' 동등).
  - 원본 title이 문자열이면 1회 후 artist 자리로 이동, 2회 후 다시 title 자리로 복귀.

### 4.2 flash 상태 관리

```tsx
// state를 boolean으로 관리 → className 토글만으로 CSS transition 동작
className={`... transition-colors duration-200 ${
  swapFlash ? 'bg-[var(--muted)] text-[var(--foreground)]' : ''
}`}
```

**메모리/언마운트 안전성**: setTimeout 미청소 케이스 검토 — 200ms는 unmount 확률 매우 낮음. 하지만 안전하게 `useRef<number>`로 timeout id 보관 + unmount 시 clear할 수 있음. 작은 기능이라 단순 setTimeout도 수용 가능. **최종 선택**: 단순 setTimeout. 만일 React Strict Mode에서 이중 실행 이슈가 보이면 useRef로 업그레이드.

## 5. UI 스펙 / Tailwind 클래스

### 5.1 헤더 우측 그룹

**Before**:
```tsx
<div className="flex items-center justify-between mb-2">
  <p className="text-xs font-medium text-[var(--text-secondary)]">트랙리스트</p>
  <button type="button" onClick={addTrack} className="...">+ 트랙 추가</button>
</div>
```

**After**:
```tsx
<div className="flex items-center justify-between mb-2">
  <p className="text-xs font-medium text-[var(--text-secondary)]">트랙리스트</p>
  <div className="flex items-center gap-3">
    {tracks.length > 0 && (
      <button
        type="button"
        onClick={handleSwap}
        aria-label="제목과 아티스트 값 서로 바꾸기"
        className={`inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] px-1.5 py-0.5 rounded transition-colors duration-200 ${
          swapFlash ? 'bg-[var(--muted)] text-[var(--foreground)]' : ''
        }`}
      >
        제목 <span aria-hidden="true">⇄</span> 아티스트
      </button>
    )}
    <button type="button" onClick={addTrack} className="text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)]">
      + 트랙 추가
    </button>
  </div>
</div>
```

**토큰 일관성**: `text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)]` — 기존 "+ 트랙 추가" 버튼과 동일 규칙. flash 시 `bg-[var(--muted)]`(hover 배경색과 같은 계열)로 상태 구분.

**아이콘**: Unicode `⇄` (U+21C4 RIGHTWARDS ARROW OVER LEFTWARDS ARROW). 모든 주요 폰트에서 렌더됨. 인라인 SVG로 교체할 필요 없음.

### 5.2 반응형

모바일(<640px)에서도 `flex` 한 줄에 3요소 수용 가능 (대략 width 합계: 60 + 90 + 75 = 225px, 컨테이너 최소 300px).  
만약 혹시 좁아지면 `flex-wrap` 자동 줄바꿈 허용 — CSS `.flex` 내부는 기본 `flex-wrap: nowrap`이지만 필요 시 `flex-wrap` 적용. 현 디자인에선 불필요 판단.

## 6. 핵심 결정 사항

| # | 결정 | 근거 |
|---|------|------|
| D-1 | Unicode `⇄` 사용, 아이콘 라이브러리 도입 X | 프로젝트에 lucide/heroicons 없음. 단일 문자는 크로스플랫폼 렌더 안정적이고 설치 비용 0 |
| D-2 | swap handler는 `TrackEditor` 내부 인라인 정의 | 1곳에서만 쓰는 순수 함수. 별도 utils 파일 추출은 YAGNI |
| D-3 | flash는 `useState + setTimeout(200)` | CSS `:active`는 pointer-up 즉시 종료돼 피드백 약함. 200ms 고정으로 명확히 인지 |
| D-4 | `tracks.length > 0`일 때만 렌더 | Plan SC-6. 공간도 차지 않음(조건부 mount) |
| D-5 | `type="button"` 명시 | 폼 내부라 생략 시 submit 트리거. 실제로 기존 `addTrack` 버튼도 `type="button"` |
| D-6 | null → `''` 정규화만 수행, 빈 문자열 허용 | DB 저장 단계에서 artist의 `''`는 이미 허용되는 패턴(기존 updateTrack가 빈 문자열 받음) |
| D-7 | setTimeout cleanup 생략 | 200ms는 unmount 확률 매우 낮음. Strict Mode에서 이중 실행 이슈 없음(effect 아님) |

## 7. 엣지 케이스

| 케이스 | 동작 |
|--------|------|
| tracks = [] | 버튼 렌더 자체 안 됨 (조건부) |
| tracks.length === 1 | 버튼 노출, 스왑 가능 |
| 모든 행에 title만 있고 artist 전부 null | 스왑 후 모두 title='' artist=<이전 title>. UI 입력란 표시 정상 |
| title=artist (동일값) | 스왑해도 결과 동일 — 기능상 문제 無 |
| 연타 클릭 (flash 중 재클릭) | 값은 즉시 재스왑, flash 상태는 setTimeout이 겹치지만 동일 방향이라 UI 이상 없음 |
| 저장 직전 스왑 | 폼 submit은 별개 버튼이므로 간섭 없음. 최신 tracks state가 제출됨 |
| 스왑 후 개별 셀 수정 | `updateTrack` 기존 로직 그대로. 스왑은 한 번의 순간적 조작이고 이후 편집과 독립 |
| 빠른 타이핑 중 스왑 | `onChange(title input) → updateTrack`과 handleSwap 호출 순서에 따라 결정. React 상태 일관성 보장(배치 업데이트) |

## 8. 테스트 / 검증 계획

자동화 테스트 없음 (Playwright 미설치). 수동 QA만 Plan §4 SC 기준:

| # | 시나리오 | 기대 |
|---|---------|------|
| T1 | 5개 트랙(각 title/artist 고유값) 입력 → 스왑 | 5행 모두 title↔artist 교환, start_sec 등 불변 |
| T2 | 1회 더 스왑 | 원본 복구 |
| T3 | 트랙 전부 삭제 → 버튼 관찰 | 버튼 사라짐 |
| T4 | artist 필드 비운 채 스왑 | title이 ''이 되고 input 빈 칸으로 표시 |
| T5 | 스왑 버튼 클릭 | 200ms 동안 배경색 muted 계열로 강조 후 원복 |
| T6 | 스왑 후 저장 | 스왑된 값이 DB에 반영 (PATCH body에 반영) |
| T7 | 스왑 후 폼 submit 유발하지 않는지 | 페이지 리로드/폼 제출 발생 안 함 |
| T8 | 모바일 화면에서 헤더 레이아웃 | 3요소가 깨지지 않고 한 줄에 수용 |

## 9. 롤백 전략

git revert 1커밋이면 원복. 단일 파일 변경.

## 10. Out of Scope

(Plan §7 재확인)
- 일반 유저용 플리 편집 화면 적용
- 선택 행만 스왑
- Undo/Redo 히스토리 스택
- AI 기반 "이거 뒤바뀐 것 같아요" 자동 감지

## 11. Implementation Guide

### 11.1 구현 순서

1. **TrackEditor 상단 훅 추가**: `const [swapFlash, setSwapFlash] = useState(false);`
2. **handleSwap 함수 추가**: tracks.map + null → '' 정규화 + setSwapFlash(true) + setTimeout
3. **헤더 JSX 수정**:
   - 기존 `<button>+ 트랙 추가</button>`를 `<div className="flex items-center gap-3">` 래퍼 안으로 이동
   - 래퍼 안 맨 앞에 `{tracks.length > 0 && <button>제목 ⇄ 아티스트</button>}` 삽입
4. **className** 조건부 적용: `swapFlash ? 'bg-[var(--muted)] text-[var(--foreground)]' : ''`
5. **수동 QA** T1~T8 통과 확인
6. **Lint & typecheck** 통과

### 11.2 Key Files

- `src/features/admin/components/PlaylistForm.tsx` (유일한 수정 대상, TrackEditor 함수 내부)

참조용:
- Plan: `docs/01-plan/features/tracklist-title-artist-swap.plan.md` (§4 SC 확인)

### 11.3 Session Guide

**단일 모듈**: 한 세션에 완결 가능한 규모 (단일 파일, ~25 LOC).

| Module | 내용 | 권장 분할 |
|:------:|------|:--------:|
| module-1 | TrackEditor swap 버튼 + handleSwap + flash state | — (분할 불필요) |

`--scope` 파라미터 불필요. `/pdca do tracklist-title-artist-swap`으로 바로 진행.

## 12. Code Comment Convention

구현 시 추가할 주석:

```tsx
// Design Ref: §4.1 — title/artist swap on all tracks, null → '' normalization
// Plan SC-5 — null 안전 처리

// Design Ref: §4.2 — 200ms flash via local useState + setTimeout
// Plan SC-7 — visual feedback

// Design Ref: §5.1 — button conditionally rendered when tracks.length > 0
// Plan SC-6 — empty state hide
```
