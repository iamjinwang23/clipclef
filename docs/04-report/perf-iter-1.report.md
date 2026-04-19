# Performance Iteration #1 — 홈 무거움 해소

**Date**: 2026-04-19
**Scope**: 홈 페이지 로드 경량화 + 린트 정리

## Executive Summary

| 관점 | 내용 |
|---|---|
| Problem | 홈 방문마다 클라이언트에서 `playlists` / `tracks` 전체 스캔 → 데이터 증가에 비례해 첫 페인트 시간도 선형 증가 |
| Solution | Supabase RPC `home_feed` 하나로 장르/채널/아티스트/플리 Top N을 서버 집계. 클라이언트는 결과만 수신 |
| Function UX Effect | 홈 4개 섹션이 한 번의 round-trip에서 렌더. 추가로 GenreHero 색 추출 캐시, ScrollRail rAF 스로틀 |
| Core Value | 데이터가 늘어도 홈 TTFB 가 거의 일정하게 유지 (RPC 하나가 인덱스로 커버) |

---

## 1. 린트 상태

### 1.1 Before / After (이 세션)
| 지표 | Before | After |
|---|---|---|
| problems | 56 | **54** |
| errors | 33 | **32** |
| warnings | 23 | **22** |

내 변경이 도입한 신규 이슈 2건 모두 해소됨:

1. `GenreHero.tsx` — `useEffect` 내부 sync `setState` 경고
   - Fix: `useState(dominantColor ?? null)` 초기값 대신 `const color = dominantColor ?? extracted` 파생. Effect 는 순수 fetch.
2. `GenreCard.tsx` — unused prop `count`
   - Fix: 실제 렌더에서 쓰이지 않았으므로 interface 와 호출부 3곳 (`GenreHomeSection`, `/genres` page) 모두 제거.

### 1.2 남은 54건의 출처

내가 건드린 파일에는 하나도 없음. 모두 사전 존재한 문제이며 분류는 다음과 같습니다 (다음 이터 후보):

| 카테고리 | 건수 | 성격 |
|---|---:|---|
| `react-hooks/set-state-in-effect` | 18 | React 19 newly strict — 대부분 "prop 바뀌면 즉시 반영" 패턴. 리팩터 필요 |
| `react-hooks/exhaustive-deps` | 16 | supabase 인스턴스 dep 누락 (의도된 무시). `useMemo` 또는 dep 명시로 해소 가능 |
| `@typescript-eslint/no-explicit-any` | 13 | YouTube / 외부 SDK 타이핑. 점진적 제거 권장 |
| `react/no-unescaped-entities` | 4 | PlaylistCard `"` 이스케이프 |
| `@next/next/no-img-element` | 4 | `CollectionPlayer.tsx` 한 파일에 집중 |
| 기타 | 3 | unused vars |

**권장**: `react-hooks/set-state-in-effect` 는 React 19 도입 규칙으로, UX 에 실제 영향이 있는 cascading render 지점이 많음. 우선순위 높은 다음 이터 후보.

### 1.3 타입체크
`npx tsc --noEmit` → Exit 0.

---

## 2. 구현 완료 기능 — 최근 세션 전체

### 2.1 search-enhancement (match rate 97.5%)
5-섹션 검색 (videos / users / channels / artists / tags) + `/search?q=` 결과 페이지 + `SearchDropdown` + `useBatchFollow` (N+1 제거).

### 2.2 terminology-cleanup
전역 용어 정리: 플리→플레이리스트, 컬렉션→큐레이션, 내 목록에 담기→담기, 에디터 노트→노트 입력, `없습니다`→`없어요`. 약 34 파일 수정.

### 2.3 home-redesign (M1–M5b 전부)
- **M1** 섹션 재배치 — 큐레이션 → 장르 → 채널 → 플레이리스트 → 아티스트
- **M2** `HomeSection` 공통 래퍼 + "더 보기"
- **M3** 채널 rail — `useChannelStories` (로그 정규화 점수)
- **M4** 아티스트 rail — `usePopularArtists` (log-normalized score)
- **M5a** `genres` 테이블 + `/api/genres` + `GenreHomeSection`
- **M5b** `/genres` 목록 + `/genres/[name]` 상세 + 어드민 `GenreManager`

### 2.4 UX 공통 다듬기
- `ScrollRail` 공용 컴포넌트 — 좌/우 Suno-style 가장자리 페이드
- 썸네일 `ring-[0.5px] ring-white/20` 경계선
- 채널·아티스트 hover 1.04 스케일 (플리·장르는 평평)
- 모바일 bottom nav SVG 아이콘 + invert
- 모바일 홈 플리 1-col, 기타 페이지 2-col 유지
- `GenreHero` 채널 스타일 full-bleed 그라데이션
- 섹션 간격 `mt-8 first:mt-4` 통일
- `/me/profile` 라벨: "플레이리스트 N개" / "큐레이션 N개"

### 2.5 perf-iter-1 (오늘)
| 항목 | 상태 |
|---|---|
| `home_feed` RPC (migration 019) | ✅ DB 적용됨 (smoke test: 8/10/8/12 정상) |
| `useHomeFeed` 훅 | ✅ |
| 4개 홈 섹션 useHomeFeed 교체 | ✅ |
| `useChannelThumbnails` 분리 | ✅ |
| `PlaylistCardData` 타입 축소 | ✅ |
| `GenreHomeSection` 단일 렌더 + CSS 변수 | ✅ |
| `ScrollRail` rAF coalesce | ✅ |
| `genres.dominant_color` (migration 020) | ✅ DB 적용됨 |
| `GenreHero` 저장 색 우선, canvas 폴백 | ✅ |
| `GenreManager` 업로드 시 색 계산·저장 | ✅ |

---

## 3. 홈 첫 방문 — Before / After 요청 수

| 요청 | Before | After |
|---|---|---|
| `/api/collections` | 1 | 1 |
| `playlists(genre, created_at)` 전체 active | 1 | 0 *(RPC 에 흡수)* |
| `playlists(id, channel_id, channel_name, created_at)` 전체 active | 1 | 0 *(RPC 에 흡수)* |
| `playlists.select('*') LIMIT 12` | 1 | 0 *(RPC 에 흡수)* |
| `tracks + playlists!inner` 전체 스캔 | 1 | 0 *(RPC 에 흡수)* |
| `artists` 전체 | 1 | 0 *(RPC 에 흡수)* |
| `/api/genres` | 1 | 0 *(RPC 에 흡수)* |
| `rpc('home_feed')` | 0 | **1** |
| `/api/youtube/channels?ids=...` | 1 | 1 |
| **합계** | **7** | **3** |

그리고 RPC 내부는 인덱스 기반이어서 `tracks` 선형 스캔이 사라짐.

---

## 4. 남은 관찰 사항 / 다음 이터 후보

| 우선순위 | 항목 | 이유 |
|:---:|---|---|
| P1 | `react-hooks/set-state-in-effect` 18건 | React 19 cascading render 성능 실이슈 |
| P2 | `ChannelHeader` 캔버스 색 추출 캐시 | 채널 전용 테이블 (`channel_meta`) 신설 필요 |
| P2 | `usePopularPlaylists` / `useAllPlaylists` / `useChannelStories` / `useGenres` / `usePopularArtists` | 홈 외 페이지에서만 사용. RPC 에 `null=전체` 모드 추가하면 일괄 정리 가능 |
| P3 | `@typescript-eslint/no-explicit-any` 13건 | YouTube / 외부 SDK 경계 타입 정비 |
| P3 | `CollectionPlayer.tsx` `<img>` 4건 | `next/image` 이관 |

---

## 5. Migration Ledger

| # | 설명 | 상태 |
|---|---|---|
| 019_home_feed | `artist_to_slug` + `home_feed` RPC + 인덱스 3개 | ✅ applied |
| 020_genres_dominant_color | `genres.dominant_color TEXT` | ✅ applied |
