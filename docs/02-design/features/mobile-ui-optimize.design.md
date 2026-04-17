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

---

## 5. Changelog — 2026-04-18

### 5.1 모바일 하단 탭바 다듬기

| 변경 | 이전 | 이후 |
|------|------|------|
| 레이블 | 아이콘 + 텍스트(홈/검색/만들기/알림/프로필) | 아이콘 전용 (텍스트 제거, `aria-label` 추가) |
| 아이콘 크기 | `w-5 h-5` | `w-7 h-7` (아바타 22 → 28) |
| 홈 아이콘 | 문 포함 | 지붕 + 벽 (문 제거) |
| 미로그인 프로필 | 실루엣 SVG | 원 + 내부 실루엣 (`currentColor` stroke) |

### 5.2 홈/스토리/페이지 정리

- **ChannelStoriesBar**: 채널명 `line-clamp-2` → 한 줄 `truncate` (`max-w-[64px]`)
- **로고**: 모바일 `mobile_logo.svg` 제거, 데스크톱과 동일하게 `logo.svg` 통일
- **설정 페이지(`/me/settings`)**: "기본 정보" 헤더 스타일을 `/me/notifications`와 통일 (text-base font-semibold + 하단 border)
- **ProfileForm**: "탈퇴하기" 위에 "로그아웃" 섹션 추가 (`signOut()` → 홈)

### 5.3 플레이리스트 상세 버그 수정

| 증상 | 원인 | 조치 |
|------|------|------|
| 마지막 트랙 `--:--` | YouTube API `contentDetails.duration` 이 0(Live/Premiere 등)일 때 `parseTracklist`가 null 반환 | `totalSec` 이상 시 이전 트랙 평균 길이로 추정 fallback 추가 |
| 업로더 카드 미노출 | 관리자 패널 업로드 경로가 `uploadedBy` 미전달 → `uploaded_by: null` | `AdminContent`가 `uploadedBy` prop 받아 `PlaylistForm`에 전달 / 상세 페이지는 FK 임베드 실패 시 `profiles` 별도 조회 |

DB 백필: 누락된 `uploaded_by` / 마지막 트랙 `duration_sec` 수동 업데이트.

### 5.4 트랙리스트 파싱 로직 개선

**기본 포맷 변경** (채널 관행 반영): `타임 - 아티스트 - 제목` → `타임 - 제목 - 아티스트`

**댓글 Fallback**:
- description에 트랙리스트가 없으면 `commentThreads.list` (`order=relevance`, `maxResults=5`) 호출
- 각 댓글 본문을 동일한 `parseTracklist`로 스캔하여 가장 많이 뽑힌 결과 채택
- **False-positive 방지**: 최소 3개 이상 + 첫 `start_sec < 60s` 조건 (가사 단발 타임스탬프 댓글 제외)

**쿼터**: 기본 1 unit (videos.list), fallback 발동 시 + 1 unit

### 5.5 큐레이터 컬렉션 플레이어 (CollectionPlayer) 모바일 대응

- **플레이어 바**: `bottom: 0` → `bottom: calc(56px + env(safe-area-inset-bottom))` (모바일), `sm:bottom-0` (데스크톱) — 하단 탭바 위로 리프트
- **트랙리스트 패널**:
  - `bottom: 0` 까지 꽉 채워 하단 탭바 투명도 영역의 빈틈 제거
  - 배경 스크롤 잠금 (`document.body.style.overflow = 'hidden'` on open)
  - 내부 리스트 `paddingBottom: calc(64 + 56 + safe-area)` (모바일) / `sm:pb-16` (데스크톱) — 마지막 트랙이 플레이어 바·탭바에 가리지 않도록
- **딤 오버레이**: `inset-0` 전체 커버

### 5.6 수정·신규 파일 (2026-04-18 기준)

**수정**:
- `src/components/layout/MobileBottomNav.tsx`
- `src/components/layout/Header.tsx`
- `src/features/playlist/components/ChannelStoriesBar.tsx`
- `src/app/[locale]/me/settings/page.tsx`
- `src/app/[locale]/me/profile/ProfileForm.tsx`
- `src/app/[locale]/playlist/[id]/page.tsx`
- `src/app/api/youtube/route.ts`
- `src/app/[locale]/admin/page.tsx`
- `src/features/admin/components/AdminContent.tsx`
- `src/features/collection/components/CollectionPlayer.tsx`

**DB 마이그레이션**: 없음 (백필만 수동 적용)
