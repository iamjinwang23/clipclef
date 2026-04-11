# Mobile UI Optimization Design Document

> **Feature**: mobile-ui-optimize
> **Architecture**: Option C — In-place Enhancement + SearchOverlay extraction
> **Date**: 2026-04-11

---

## 1. Scope

| Component | Change |
|-----------|--------|
| `Header.tsx` | 모바일: 검색창 숨김 → 검색 아이콘 버튼, +만들기 → 아이콘 버튼, SearchOverlay 마운트 |
| `SearchOverlay.tsx` (신규) | 검색 오버레이 UI + localStorage 최근검색어 |
| `FilterBar.tsx` | 필터+정렬 단일 행, 필터 영역 overflow scroll + 우측 gradient mask, 정렬 아이콘 버튼 |
| `CuratedCollectionSection.tsx` | 모바일: full-width (px-0), rounded-none |
| `playlist/[id]/page.tsx` | 좋아요 = 아이콘+n, 저장/내목록 = 아이콘 only |

---

## 2. Component Specs

### 2.1 Header (모바일 변경사항)

```
데스크톱(sm 이상):  [로고] [──검색창──────] [+만들기] [아바타]
모바일(sm 미만):    [로고]                  [🔍] [+] [아바타]
```

- `sm:hidden` / `hidden sm:block` 으로 검색창 ↔ 검색아이콘 전환
- 검색 아이콘 클릭 → `searchOpen` state → `<SearchOverlay>` 마운트
- +만들기 텍스트 → + 아이콘 (sm 미만에서만)

### 2.2 SearchOverlay (신규)

- `fixed inset-0 z-50` 오버레이
- 상단: X 닫기버튼 + 검색 input (autofocus)
- 검색어 입력 후 Enter → `filterStore.setQuery()` 호출 + 오버레이 닫기
- 최근검색어: `localStorage['clipclef_recent_searches']` — 최대 8개, 배열
- 최근검색어 클릭 → 즉시 검색 적용
- 개별 삭제(×) + 전체 삭제 버튼

### 2.3 FilterBar (모바일 변경사항)

```
[장르▼] [분위기▼] [장소▼] [시대▼] ··· (스와이프) ··· [↕ 정렬아이콘]
                                     ↑ 우측 gradient fade
```

- 필터 칩 영역: `overflow-x-auto scrollbar-hide` + `flex-nowrap`
- 우측 그라데이션: `pointer-events-none` absolute overlay
  - 정렬 아이콘이 오버랩되지 않도록 그라데이션 너비 = 정렬버튼 너비 + 패딩
- 정렬: `SortSelect` → 아이콘 버튼으로 교체 (≡ 또는 ↕ SVG), 클릭 시 드롭다운

### 2.4 CuratedCollectionSection (모바일)

- 카드 래퍼: `px-4 sm:px-0` → 모바일에서 컨테이너 패딩 제거
- 카드 자체: `rounded-xl sm:rounded-xl` → 모바일 `rounded-none`

### 2.5 플리 상세 액션 버튼

```
[♥ 24]  [☆]  [+]  [YouTube ↗]
 좋아요  저장 내목록
```

- `LikeButton`: 현재 `♥ 좋아요 n` → `♥ n` (텍스트만 변경, count는 유지)
- `CollectionButton`: `variant='icon'` prop 전달 (이미 구현됨)
- `AddToPlaylistButton`: 아이콘(+) 전용 버튼으로 표시

---

## 3. State & Storage

| State | 위치 | 내용 |
|-------|------|------|
| `searchOpen` | `Header.tsx` local state | 검색 오버레이 표시 여부 |
| 최근 검색어 | `localStorage['clipclef_recent_searches']` | string[] 최대 8개 |
| sort dropdown | `FilterBar.tsx` local state | 정렬 드롭다운 표시 여부 |

---

## 4. Files

### 수정 (4개)
- `src/components/layout/Header.tsx`
- `src/features/filter/components/FilterBar.tsx`
- `src/features/playlist/components/CuratedCollectionSection.tsx`
- `src/app/[locale]/playlist/[id]/page.tsx`

### 신규 (1개)
- `src/components/ui/SearchOverlay.tsx`
