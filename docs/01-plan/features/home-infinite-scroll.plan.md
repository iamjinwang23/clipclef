# Plan: home-infinite-scroll

**Feature**: 홈 플레이리스트 무한스크롤  
**Created**: 2026-04-17  
**Phase**: Plan

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 홈에서 전체 플리를 단일 쿼리로 가져와 100~200개 축적 시 초기 로딩 지연 및 서버 부하 발생 |
| **Solution** | `useInfiniteQuery` + Intersection Observer로 16개씩 점진 로드, 필터 변경 시 자동 리셋 |
| **Functional UX Effect** | 초기 로딩 빠름, 스크롤 시 자연스럽게 추가 카드 등장, 필터 전환 시 부드러운 교체 |
| **Core Value** | 콘텐츠가 늘어날수록 성능이 유지되는 확장 가능한 홈 피드 |

---

## Context Anchor

| | |
|---|---|
| **WHY** | 플리 100~200개 이상 축적 시 현재 전체 로드 방식은 UX·서버 모두 부담 |
| **WHO** | 홈을 방문하는 모든 유저 (비로그인 포함) |
| **RISK** | 필터 변경 시 페이지 상태 리셋 타이밍, 검색어+트랙 검색 조합의 페이지네이션 복잡도 |
| **SUCCESS** | 초기 로드 ≤16개, 스크롤 시 자동 추가 로드, 필터 변경 시 결과 부드럽게 교체 |
| **SCOPE** | `usePlaylists` → `useInfiniteQuery` 전환, `PlaylistGrid` Intersection Observer 추가 |

---

## 1. Requirements

### 기능 요구사항
- **FR-01**: 초기 로드 16개 (`PAGE_SIZE = 16`)
- **FR-02**: 스크롤 하단 자동 감지(Intersection Observer) 시 다음 16개 추가 로드
- **FR-03**: 필터(장르/무드/장소/시대/정렬/채널/검색어) 변경 시 결과를 1페이지부터 부드럽게 교체
- **FR-04**: 마지막 페이지 도달 시 더 이상 로드하지 않음 (추가 인디케이터 불필요)
- **FR-05**: 로딩 중 스켈레톤 카드 표시 (기존 카드 아래 추가)

### 비기능 요구사항
- **NFR-01**: 필터 변경 시 이전 데이터가 즉시 사라지지 않고 새 데이터로 교체 (`keepPreviousData`)
- **NFR-02**: 트랙 검색(`query`)이 있을 때도 페이지네이션 정상 동작
- **NFR-03**: Supabase `.range(from, to)` 사용 — cursor 방식보다 필터 조합이 단순

---

## 2. Scope

### 변경 파일
| 파일 | 변경 내용 |
|------|-----------|
| `src/features/playlist/hooks/usePlaylists.ts` | `useQuery` → `useInfiniteQuery`, `.range()` 페이지네이션 추가 |
| `src/features/playlist/components/PlaylistGrid.tsx` | `useInfiniteQuery` 데이터 평탄화, Intersection Observer sentinel 추가 |

### 변경 없는 파일
- `src/app/[locale]/page.tsx` — 변경 없음
- `src/features/filter/store.ts` — 변경 없음
- Supabase schema — 변경 없음

---

## 3. Technical Design

### 페이지네이션 방식
- **Offset 방식**: `range(page * 16, (page + 1) * 16 - 1)`
- `pageParam`은 page index (0부터 시작)
- `getNextPageParam`: 반환된 데이터가 16개 미만이면 `undefined` (마지막 페이지)

### 필터 리셋
- `queryKey`에 필터 전체 포함 → 필터 변경 시 TanStack Query가 자동으로 새 쿼리 시작
- `placeholderData: keepPreviousData` → 새 데이터 도착 전까지 이전 데이터 유지 (부드러운 교체)

### Intersection Observer
- `PlaylistGrid` 맨 아래 `<div ref={sentinelRef}>` 추가
- `isIntersecting` 시 `fetchNextPage()` 호출
- `isFetchingNextPage` 중에는 중복 호출 방지

---

## 4. Success Criteria

- [ ] 홈 초기 로드 시 16개만 요청됨 (Network 탭 확인)
- [ ] 스크롤 하단 도달 시 다음 16개 자동 로드
- [ ] 필터 변경 시 이전 카드가 잠깐 유지되다 새 카드로 교체
- [ ] 마지막 페이지에서 추가 요청 없음
- [ ] 검색어 필터 조합에서도 정상 동작

---

## 5. Risks

| 리스크 | 대응 |
|--------|------|
| 트랙 검색 + 페이지네이션 조합 복잡도 | 트랙 검색 ID 목록을 먼저 가져온 후 플리 쿼리에 `.range()` 적용 |
| 필터 변경 시 스크롤 위치 | 새 쿼리 시작 시 그리드 자동 교체로 자연스럽게 처리됨 |
| Sentinel이 항상 뷰포트 안에 있는 경우 | `isFetchingNextPage` 가드로 중복 방지 |
