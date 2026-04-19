# Feature Plan: search-enhancement

## Executive Summary

| 관점 | 내용 |
|------|------|
| Problem | 검색이 플리/트랙/아티스트만 섞어 반환하고, Enter 시 홈 필터링으로 끝나 전용 결과 페이지가 없어 탐색 흐름이 끊김 |
| Solution | 드롭다운은 퀵검색(아티스트/사용자/채널/영상) 간결하게 유지, Enter/실행 시 `/search?q=` 결과 페이지로 이동하여 **영상·사용자·채널·아티스트·태그** 5개 섹션으로 정돈 |
| UX Effect | 각 엔터티별 목적 검색이 명확해지고, 공유 가능한 URL과 "더 보기" 진입점 확보로 탐색 깊이 확장 |
| Core Value | ClipClef를 "플리 모음"에서 "음악 디스커버리 허브"로 넓혀, 사용자·채널·태그 기반 탐색까지 한 단계에서 해결 |

## Context Anchor

| | |
|--|--|
| WHY | 현재 검색은 플리 타이틀·트랙·아티스트만 섞어 반환 → 사용자·채널·태그 탐색 불가, Enter 시 결과 페이지 없음 |
| WHO | 특정 유저 팔로우를 원하는 사람, 특정 채널·아티스트 플리를 모아보고 싶은 사람, 태그 기반 큐레이션 탐색자 |
| RISK | 기존 Header 드롭다운·모바일 SearchOverlay·/search 페이지가 공유하는 로직이 3곳 — 통일 필요. 채널은 별도 엔터티 테이블 없음(playlists.channel_name 기반) → distinct 쿼리 정확성 |
| SUCCESS | 드롭다운에서 아티스트/사용자/채널/영상 4개 섹션 노출, Enter 시 `/search?q=` 이동, 결과 페이지 5개 섹션 정상 표시, 사용자 행에 팔로우 칩 동작 |
| SCOPE | Header.tsx, SearchOverlay.tsx, /search 페이지, 신규 search 훅(useSearch), (선택) profiles 인덱스 추가 |

## 1. 요구사항

### 1.1 드롭다운 (퀵검색) 공통 스펙

모든 진입점(데스크톱 Header, 모바일 SearchOverlay, 모바일 /search 입력화면)에 **같은 4개 섹션**을 노출한다. 태그는 드롭다운에서 제외(결과페이지 전용).

**순서 및 최대 개수**:

| 순서 | 섹션 | 최대 개수 | 비고 |
|------|------|-----------|------|
| 1 | 아티스트 | 3 | `artists.name ILIKE` + `not_found=false` |
| 2 | 사용자 | 3 | `profiles.display_name ILIKE` |
| 3 | 채널 | 3 | `playlists.channel_name ILIKE`, `channel_id` distinct |
| 4 | 영상 | 5 (나머지로 총 10~15 내) | 플리 제목 + 트랙 제목 + 트랙 아티스트 매칭 통합, `like_count` desc |

**행 포맷** (모든 드롭다운 공통):

- **아티스트**: `[원형 썸네일] 이름` — 우측 "아티스트" 텍스트 **삭제**
- **사용자**: `[원형 아바타] display_name` + 우측 `[팔로우] / [팔로잉]` 칩
  - 로그인 시에만 칩 표시, 본인은 칩 숨김
  - 칩 클릭 = row Link 이동을 막고 follow toggle 실행 (`stopPropagation`)
- **채널**: `[원형 아바타(ChannelAvatar)] 채널명`
- **영상**: `[16:9 썸네일] 제목 / channel_name` (현행 유지)

### 1.2 Enter / 검색 실행 시 동작

- Enter 또는 드롭다운 하단 "전체 결과 보기" 클릭 → **`router.push('/{locale}/search?q={encodedQuery}')`**
- 기존 `filterStore.setQuery()` 홈 필터링 경로는 **제거** (홈 필터링은 FilterBar로 일원화)
- `/search` 페이지는 `?q` 파라미터가 있으면 결과 페이지 모드, 없으면 기존 입력 화면 유지

### 1.3 검색 결과 페이지 (`/search?q=`)

**URL**: `/{locale}/search?q={query}` — q 공란이면 입력 모드

**섹션 순서 및 개수**:

| # | 섹션 | 기본 노출 개수 | 데이터 소스 |
|---|------|----------------|-------------|
| 1 | 영상 | 20 | `playlists.title ILIKE` ∪ `tracks.title ILIKE` ∪ `tracks.artist ILIKE` (playlist_id distinct, `like_count` desc) |
| 2 | 사용자 | 5 | `profiles.display_name ILIKE`, 팔로우 수 desc (있다면) 아니면 id desc |
| 3 | 채널 | 5 | `playlists.channel_name ILIKE` 에서 `channel_id` distinct, 해당 채널의 플리 개수 desc |
| 4 | 아티스트 | 5 | `artists.name ILIKE`, `not_found=false` |
| 5 | 태그 | 매칭되는 모든 옵션 | `GENRE_OPTIONS / MOOD_OPTIONS / PLACE_OPTIONS / ERA_OPTIONS` 중 텍스트 포함 매칭 — 각 태그별 플리 개수 표기 |

**각 섹션 빈 결과**: 아예 섹션 숨김 (헤더도 노출하지 않음).

**각 행 포맷**:

- **영상 카드**: 기존 `PlaylistCard` 재사용 (홈 그리드와 동일)
- **사용자 행**: `[아바타] display_name` + `[팔로우/팔로잉]` 칩 (드롭다운 포맷과 동일) — Link → `/profile/{userId}`
- **채널 행**: `[ChannelAvatar] 채널명 · 플리 N개` — Link → 채널 필터 홈(`/?channel_id=...`) 또는 `/channel/{id}` (경로 존재 여부 확인 필요, 현재는 홈 필터로)
- **아티스트 행**: `[원형 썸네일] 이름` — Link → `/artist/{slug}`
- **태그 칩 리스트**: `[#Jazz 12]` 형태 칩 — 클릭 시 홈으로 이동하며 해당 태그 선택 (`filterStore.toggleGenre(...)` 등)

**페이지 상단**: 검색 입력창 (value 미리 세팅) — 수정 후 Enter 시 URL 갱신.

**"더 보기"**: 이번 스코프 외 — 추후 `/search/playlists?q=...` 등 별도 라우팅으로 확장 (이번엔 상단 N개만).

### 1.4 모바일 `/search` 통합

현재 모바일 `/search`는 드롭다운 형태의 입력화면 + 실시간 결과. 이 페이지를:
- `?q=` 없을 때 → 기존 입력화면 (최근 검색 + 실시간 드롭다운 프리뷰)
- `?q=` 있을 때 → 결과 페이지 모드

데스크톱도 Enter → 이 페이지로 이동. 결과 페이지는 반응형(데스크톱은 와이드, 모바일은 1-col).

### 1.5 검색 대상 정밀화

**"제목"** 의미 확정: 플리 제목(`playlists.title`) + 트랙 제목(`tracks.title`) 모두 `영상` 섹션에서 통합. 별도의 "트랙 제목" 섹션 없음.

**"아티스트"**: `artists` 테이블(시드된 아티스트) 섹션은 별도로, `tracks.artist` 매칭은 영상 섹션에 포함 (플리를 찾는 단서로).

**"채널"**: YouTube 채널(`playlists.channel_id` distinct). ClipClef 사용자와 구분.

**"사용자"**: ClipClef 회원 (`profiles`). 팔로우 관계 필요.

### 1.6 성능 / 쿼리 가드

- 입력 debounce 300ms (현행 유지)
- 공백 제거 후 1자 이상일 때만 실행
- `%`, `_` escape 현행 유지
- 결과 페이지 쿼리는 서버 컴포넌트 대신 클라이언트(useQuery)로 — 실시간 입력 반영
- 사용자/채널/아티스트 섹션 5건 제한이 과하면 인덱스 확인 (profiles.display_name, playlists.channel_name)

## 2. 파일 목록

| 파일 | 변경 유형 | 내용 |
|------|-----------|------|
| `src/features/search/hooks/useSearch.ts` | 신규 | 5개 섹션 병렬 쿼리 훅 (드롭다운용 limit, 결과페이지용 limit 파라미터) |
| `src/features/search/components/SearchResults.tsx` | 신규 | 결과 페이지 섹션 렌더러 (영상/사용자/채널/아티스트/태그) |
| `src/features/search/components/SearchDropdown.tsx` | 신규 | 드롭다운 프리뷰 공용 컴포넌트 (Header·Overlay·/search 공유) |
| `src/features/search/components/UserSearchRow.tsx` | 신규 | 사용자 행 + 팔로우 칩 |
| `src/features/search/components/ChannelSearchRow.tsx` | 신규 | 채널 행 (ChannelAvatar 재사용) |
| `src/components/layout/Header.tsx` | 수정 | DesktopSearchBar 내부 Drop 영역을 SearchDropdown으로 교체, Enter → `router.push('/search?q=')` |
| `src/components/ui/SearchOverlay.tsx` | 수정 | 동일하게 SearchDropdown 사용, Enter → router.push |
| `src/app/[locale]/search/page.tsx` | 수정 | `useSearchParams('q')` 확인하여 결과 페이지 모드 분기, 기존 인라인 쿼리 로직 → `useSearch` 사용 |
| `src/features/interaction/hooks/useFollow.ts` | 확인 | 팔로우 칩에서 그대로 재사용 (현존) |

**DB 마이그레이션 (선택)**: `profiles.display_name` 인덱스가 없다면 `CREATE INDEX profiles_display_name_trgm ON profiles USING gin (display_name gin_trgm_ops)` 고려 — ILIKE 검색 속도 확보.

## 3. Success Criteria

1. 데스크톱 Header 검색창 포커스 시 드롭다운에 **아티스트 → 사용자 → 채널 → 영상** 순서 섹션이 각각 최대 3(영상 5)개로 나타난다.
2. 드롭다운의 아티스트 행 우측 "아티스트" 텍스트가 보이지 않는다.
3. 드롭다운의 사용자 행 우측에 팔로우/팔로잉 칩이 로그인 상태에서만 노출되고, 클릭 시 토글된다(페이지 이동 안 함).
4. 검색창에서 Enter 누르면 `/ko/search?q=...` 로 이동한다.
5. 결과 페이지에서 영상/사용자/채널/아티스트/태그 5개 섹션이 결과 존재 시에만 표시되고, 개수 제한(20/5/5/5/전체)이 지켜진다.
6. 결과 페이지 태그 섹션 칩을 누르면 해당 태그가 필터로 적용된 홈으로 이동한다.
7. 모바일 `/search` 도 `?q=` 있으면 결과 페이지 모드, 없으면 입력 모드로 동작한다.

## 4. Risks & Open Questions

- **채널 상세 페이지 미존재**: 채널 행 클릭 시 목적지가 없음. 당장은 홈의 `channel_id` 필터 적용으로 대체. 추후 `/channel/{id}` 페이지 신설 검토.
- **팔로우 칩 성능**: 사용자 섹션에 팔로우 상태를 병렬 조회하려면 N+1 우려 — `useFollow` 훅을 행마다 호출하면 쿼리 폭발 → 단일 쿼리로 `follows where follower_id = me and followee_id in (...)` 한번 가져오는 패턴 필요(Design 단계에서 확정).
- **태그 검색 매칭**: 태그는 한글·영문 혼재(`Hip-hop` vs `힙합` 별칭 없음). 현재는 옵션 문자열 literal contains 만. 별칭 매핑은 향후.
- **ILIKE 인덱스**: `profiles.display_name`, `playlists.channel_name` 부분 문자열 검색이 느려질 여지 — 초기에는 데이터량 작아 문제 없으나, trigram GIN 인덱스 준비 필요.
