# Plan: tracklist-visibility-fix

## Executive Summary

| 관점 | 내용 |
|------|------|
| Problem | 큐레이션 상세 페이지 진입 시 트랙리스트 패널이 재생 중이 아님에도 DOM에 항상 존재하여 초기 렌더링 flash 또는 레이아웃 간섭 발생 |
| Solution | 트랙리스트 패널을 `currentIndex !== null` 조건부 렌더링으로 변경 — 재생 시작 시에만 DOM에 마운트 |
| Functional UX Effect | 재생 안 함 → 하단 영역 완전 깨끗함 / 재생 시작 → 플레이어 바 + 트랙리스트 버튼 나타남 / 슬라이드 애니메이션 유지 |
| Core Value | 의도한 UX (재생 시작 전 = 깨끗한 화면)를 코드 구조로 보장 |

## Context Anchor

| 항목 | 내용 |
|------|------|
| WHY | 재생 중이 아닐 때 트랙리스트 패널이 DOM에 존재해 flash/간섭 발생, UX 불일치 |
| WHO | 큐레이션 상세 페이지 방문자 전체 |
| RISK | 조건부 렌더링 전환 시 슬라이드 애니메이션 동작 여부 (확인 필요) |
| SUCCESS | 재생 전 트랙리스트 패널 미노출, 재생 후 기존 동작 동일 |
| SCOPE | `CollectionPlayer.tsx` 단일 파일 수정 |

## 1. 현재 구조 분석

### 1.1 파일 구조

- `src/features/collection/components/CollectionPageClient.tsx` — 상태 소유자
- `src/features/collection/components/CollectionPlayer.tsx` — 플레이어 UI

### 1.2 문제 코드 (CollectionPlayer.tsx)

```
// 트랙리스트 패널 — 항상 DOM에 존재 (L127)
<div
  className="fixed ..."
  style={{ transform: isTracklistOpen ? 'translateY(0)' : 'translateY(100%)' }}
>

// 하단 플레이어 바 — 조건부 렌더링 (L200)
{currentIndex !== null && (
  <div className="fixed bottom-0 ...">
)}
```

**불일치**: 플레이어 바는 `currentIndex !== null`일 때만 렌더링되지만, 트랙리스트 패널은 항상 DOM에 존재.

### 1.3 영향 범위

- `CollectionPlayer.tsx:127` 트랙리스트 패널 렌더링 조건 추가만으로 해결
- 슬라이드 애니메이션은 마운트 후 `isTracklistOpen` 상태로 동작하므로 영향 없음

## 2. 요구사항

### 2.1 기능 요구사항

- **FR-01**: 재생 중이 아닐 때 (`currentIndex === null`) 트랙리스트 패널을 DOM에서 제거
- **FR-02**: 재생 시작 후 트랙리스트 버튼 클릭 시 슬라이드 업 애니메이션 유지
- **FR-03**: 재생 중 트랙리스트 닫기 → 슬라이드 다운 애니메이션 유지
- **FR-04**: 재생 종료 시 트랙리스트 패널도 즉시 언마운트 (애니메이션 없이 사라짐 — 플레이어 바와 동일하게)

### 2.2 비기능 요구사항

- 수정 범위: `CollectionPlayer.tsx` 단일 파일
- 기존 상태 관리 (`CollectionPageClient.tsx`) 변경 없음

## 3. Success Criteria

| # | 기준 | 측정 방법 |
|---|------|----------|
| SC-01 | 페이지 진입 시 트랙리스트 패널 DOM에 없음 | DevTools Elements 탭 확인 |
| SC-02 | 재생 시작 후 트랙리스트 버튼 클릭 시 슬라이드 애니메이션 동작 | 시각적 확인 |
| SC-03 | 재생 종료 시 트랙리스트 패널 사라짐 | 시각적 확인 |
| SC-04 | 페이지 재진입 시 재생 중이 아닌 상태로 초기화 | Next.js 라우팅으로 자동 보장 |

## 4. 구현 계획

### 변경 대상

**파일**: `src/features/collection/components/CollectionPlayer.tsx`

**변경 내용**: L127 트랙리스트 패널 div를 `{currentIndex !== null && (...)}` 로 감쌈

**변경 전:**
```tsx
{/* 트랙리스트 패널 */}
<div className="fixed left-0 right-0 z-40 ..." style={{ ... }}>
  ...
</div>
```

**변경 후:**
```tsx
{/* 트랙리스트 패널 — 재생 중일 때만 마운트 */}
{currentIndex !== null && (
  <div className="fixed left-0 right-0 z-40 ..." style={{ ... }}>
    ...
  </div>
)}
```

## 5. 예상 영향

- **변경 파일**: 1개
- **변경 라인**: ~2줄 추가 (조건부 래핑)
- **리그레션 위험**: 낮음 — 기존 동작에서 렌더링 조건만 추가
