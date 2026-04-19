# search-enhancement Design Document

> **Summary**: 5-section search (videos/users/channels/artists/tags) with shared dropdown + dedicated results page (`/search?q=`)
>
> **Project**: ClipClef (youchoose)
> **Date**: 2026-04-19
> **Status**: Draft
> **Planning Doc**: [search-enhancement.plan.md](../../01-plan/features/search-enhancement.plan.md)
> **Architecture**: Option C — Pragmatic Balance

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 검색이 플리/트랙/아티스트만 섞어 반환 → 사용자·채널·태그 탐색 불가, Enter 시 결과 페이지 없음 |
| **WHO** | 특정 유저 팔로우 / 특정 채널·아티스트 플리 모아보기 / 태그 기반 큐레이션 탐색자 |
| **RISK** | 드롭다운 로직이 3곳(Header·Overlay·/search) 분산 / 팔로우 상태 N+1 우려 / 채널 상세 페이지 부재 |
| **SUCCESS** | 드롭다운 4섹션 정상 표시, Enter → `/search?q=`, 결과 페이지 5섹션, 팔로우 칩 토글 동작 |
| **SCOPE** | Module-1 Hooks/Utils → Module-2 Dropdown UI → Module-3 Results Page → Module-4 Entry Point 통합 |

---

## 1. Overview

### 1.1 Design Goals

- **단일 검색 오케스트레이터**: `useSearch(query, limits)` 하나로 드롭다운·결과 페이지 모두 커버
- **공용 드롭다운**: Header 데스크톱, SearchOverlay 모바일, `/search` 입력화면 — 3곳 모두 `<SearchDropdown>` 사용
- **공유 가능한 URL**: `/search?q=...` 로 결과 페이지 진입, 공유·즐겨찾기 가능
- **팔로우 상태 배치 조회**: 사용자 섹션 N+1 방지 — 1쿼리로 팔로우 상태 맵 획득

### 1.2 Design Principles

- **섹션별 독립 쿼리**: 5개 섹션을 `Promise.all` 병렬 호출 (대기시간 = 최장 쿼리 시간)
- **빈 섹션 숨김**: 결과 0건인 섹션은 헤더·컨테이너 모두 숨김 (빈 공간 없음)
- **채널 엔터티 가상화**: 별도 `channels` 테이블 없으므로 `playlists` 기준 `channel_id` distinct + 플리 개수 집계
- **태그는 클라이언트 매칭**: 고정 옵션 상수(GENRE/MOOD/PLACE/ERA) 배열에서 `includes` — DB 호출 불요, 단 개수 집계는 DB

---

## 2. Module Map

| Module | 파일 | 책임 |
|--------|------|------|
| **hooks/useSearch** | `src/features/search/hooks/useSearch.ts` | 쿼리 → 5섹션 결과 반환 (limits 설정 가능) |
| **lib/follow-batch** | `src/features/search/lib/follow-batch.ts` | `getFollowStates(me, targetIds[])` → `Map<string, boolean>` |
| **hooks/useBatchFollow** | `src/features/search/hooks/useBatchFollow.ts` | 위 유틸 + React Query 래퍼 |
| **components/SearchDropdown** | `src/features/search/components/SearchDropdown.tsx` | 공용 드롭다운 (4섹션: 아티스트·사용자·채널·영상) |
| **components/UserFollowChip** | `src/features/search/components/UserFollowChip.tsx` | 팔로우/팔로잉 칩 (이벤트 전파 차단 포함) |
| **components/SearchResults** | `src/features/search/components/SearchResults.tsx` | `/search?q=` 결과 페이지 본문 (5섹션 인라인) |

---

## 3. Data Model

### 3.1 기존 테이블 사용

| 테이블 | 컬럼 | 용도 |
|--------|------|------|
| `playlists` | `id, title, channel_id, channel_name, thumbnail_url, like_count, genre, mood, place, era` | 영상 섹션 (title ILIKE) + 채널 섹션(distinct channel_id) + 태그 섹션(배열 overlap) |
| `tracks` | `playlist_id, title, artist` | 영상 섹션 (트랙 제목/아티스트로 매칭되는 플리) |
| `profiles` | `id, display_name, avatar_url, is_verified` | 사용자 섹션 |
| `artists` | `name, slug, image_url, not_found` | 아티스트 섹션 |
| `follows` | `follower_id, followee_id` | 배치 팔로우 상태 조회 |

### 3.2 새 인덱스 (선택 — 성능 대비)

```sql
-- 부분 문자열 검색 가속 (현재는 데이터 소량이라 즉시 필요치는 않음)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS profiles_display_name_trgm_idx
  ON profiles USING gin (display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS playlists_channel_name_trgm_idx
  ON playlists USING gin (channel_name gin_trgm_ops);
```

MVP 단계엔 미적용. 사용자 수 1k+ 또는 플리 5k+ 시점에 추가.

---

## 4. API / Query Contracts

### 4.1 `useSearch(query, limits)`

```ts
type SearchLimits = {
  videos?: number;    // default 5 (dropdown), 20 (results)
  users?: number;     // default 3 / 5
  channels?: number;  // default 3 / 5
  artists?: number;   // default 3 / 5
  tags?: number;      // default 0 (dropdown disables) / unlimited (results)
};

type SearchResult = {
  videos: Playlist[];
  users: Array<{ id: string; display_name: string | null; avatar_url: string | null; is_verified: boolean }>;
  channels: Array<{ channel_id: string; channel_name: string; thumbnail_url: string | null; count: number }>;
  artists: Array<{ name: string; slug: string; image_url: string | null }>;
  tags: Array<{ label: string; category: 'genre' | 'mood' | 'place' | 'era'; count: number }>;
  loading: boolean;
};

useSearch(query: string, limits?: SearchLimits): SearchResult;
```

**내부 쿼리 (`Promise.all`)**:

```ts
// videos: tracks 매칭 + playlists 매칭 통합
const trackIds = await supabase.from('tracks').select('playlist_id').or(`title.ilike.%${q}%,artist.ilike.%${q}%`);
const videos = await supabase.from('playlists').select('*')
  .eq('is_active', true)
  .or(`title.ilike.%${q}%,id.in.(${distinct(trackIds).join(',')})`)
  .order('like_count', { ascending: false })
  .limit(limits.videos);

// users
const users = await supabase.from('profiles')
  .select('id, display_name, avatar_url, is_verified')
  .ilike('display_name', `%${q}%`)
  .limit(limits.users);

// channels — playlists에서 channel distinct + 그룹화
const channelsRaw = await supabase.from('playlists')
  .select('channel_id, channel_name, thumbnail_url')
  .eq('is_active', true)
  .ilike('channel_name', `%${q}%`);
// 클라이언트에서 Map으로 distinct + count 집계

// artists
const artists = await supabase.from('artists')
  .select('name, slug, image_url')
  .ilike('name', `%${q}%`)
  .eq('not_found', false)
  .limit(limits.artists);

// tags — 클라이언트 매칭
const allTags = [...GENRE, ...MOOD, ...PLACE, ...ERA].filter(t => t.toLowerCase().includes(q.toLowerCase()));
// 각 태그 count는 DB에서 배치 조회:
const tagCounts = await Promise.all(allTags.map(tag =>
  supabase.from('playlists').select('id', { count: 'exact', head: true }).contains(categoryOf(tag), [tag])
));
```

**debounce**: 훅 외부에서 제어 (useDebouncedValue). 훅 자체는 순수하게 query 받으면 실행.

**escape**: `q` 내부에서 `%`, `_` escape — `q.replace(/[%_]/g, '\\$&')`.

### 4.2 `follow-batch.getFollowStates`

```ts
async function getFollowStates(
  supabase: SupabaseClient,
  followerId: string,
  targetIds: string[]
): Promise<Map<string, boolean>> {
  if (targetIds.length === 0) return new Map();
  const { data } = await supabase
    .from('follows')
    .select('followee_id')
    .eq('follower_id', followerId)
    .in('followee_id', targetIds);
  const set = new Set((data ?? []).map(r => r.followee_id));
  return new Map(targetIds.map(id => [id, set.has(id)]));
}
```

React Query 래퍼 `useBatchFollow(userIds)` 로 캐시. 한 번의 쿼리로 전체 사용자 섹션 상태 해결.

### 4.3 팔로우 토글

`UserFollowChip` 내부는 기존 `useFollow(userId)` 를 호출 — 해당 훅은 이미 팔로우 상태·카운터를 단건 관리한다. **초기 상태는 `useBatchFollow` 결과를 prop으로 주입**하여 useFollow의 초기 조회 생략.

```ts
// UserFollowChip props
{ userId: string; initialFollowing: boolean }
```

`useFollow` 훅은 초기 fetch 건너뛰기 옵션이 필요 — 현존 훅 확장 (1줄 추가) 또는 `initialFollowing` 무시하고 fetch 후 덮어쓰기 허용(단순 수용).

---

## 5. UI Spec

### 5.1 SearchDropdown (공용 드롭다운)

```
┌─ Dropdown (상단 고정 또는 인라인) ────────┐
│ 아티스트          [표시 시에만]          │
│ ● 🎤 Bruno Mars                          │
│ ● 🎤 Bruno Pieroni                       │
│                                           │
│ 사용자                                    │
│ ● 👤 jinwang          [팔로우]            │
│ ● 👤 clipclef_staff   [팔로잉]            │
│                                           │
│ 채널                                      │
│ ● 📺 NMG Lab                              │
│ ● 📺 Essential;                           │
│                                           │
│ 영상                                      │
│ [썸네일] Summer Playlist                  │
│            channel_name                   │
│ ...                                       │
│ ─────────────────────                     │
│ '쿼리' 전체 결과 보기 →                   │
└───────────────────────────────────────────┘
```

- 각 섹션 헤더: `text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2`
- 빈 섹션 숨김
- 항목 클릭 → 해당 엔터티 페이지로 이동, `applySearch(query)` 로 최근 검색어 저장
- **아티스트 행 우측 "아티스트" 텍스트 삭제** (현재 /search에 있음)
- 최하단 "전체 결과 보기" 버튼 → `/{locale}/search?q={query}` 이동

**데스크톱 Header**: absolute positioned dropdown (현 구조 유지)
**모바일 SearchOverlay**: 전체 화면 오버레이 내 인라인
**모바일 /search 입력모드**: 페이지 전체 스크롤 가능 인라인

### 5.2 UserFollowChip

```
[팔로우]  |  [팔로잉]
```

- 기본: `border-[var(--foreground)] text-[var(--foreground)] bg-transparent`
- 팔로잉: `bg-[var(--muted)] text-[var(--text-secondary)]`
- 크기: `text-xs px-2.5 py-1 rounded-full`
- 클릭 시 `e.stopPropagation()` + `e.preventDefault()` 로 부모 Link 이동 차단 후 토글 실행
- 본인 프로필 / 미로그인: 칩 미표시

### 5.3 SearchResults (`/search?q=`)

```
┌─ Search Results Page ─────────────────────┐
│ [검색 입력: '쿼리']   [×]                 │
│                                           │
│ 영상 (20)                                 │
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐                  │
│ │PC │ │PC │ │PC │ │PC │  (PlaylistCard) │
│ └───┘ └───┘ └───┘ └───┘                  │
│                                           │
│ 사용자 (5)                                │
│ ● jinwang          [팔로우]               │
│ ...                                       │
│                                           │
│ 채널 (5)                                  │
│ ● Essential;  · 14개 플리                 │
│ ...                                       │
│                                           │
│ 아티스트 (5)                              │
│ ● Bruno Mars                              │
│ ...                                       │
│                                           │
│ 태그                                      │
│ [#Jazz 12] [#Lofi 8] [#Chill 24]         │
└───────────────────────────────────────────┘
```

- 입력창: 상단 고정, value 미리 세팅 (URL q param), Enter → `router.replace('?q=...')` 로 URL 갱신 + 쿼리 반영
- 각 섹션 헤더: `text-sm font-semibold text-[var(--foreground)] mb-3` + 상단 여백
- 섹션 간 여백: `mt-8`
- 영상 섹션: 홈 그리드와 동일 (`grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`), 카드는 `PlaylistCard` 재사용
- 빈 섹션: 렌더링하지 않음 (헤더 포함)
- **모든 섹션이 빈 경우**: `<p>검색 결과가 없습니다</p>` 중앙 정렬

**Link 이동 목적지**:
- 영상 행 → `/{locale}/playlist/{id}` (기존)
- 사용자 행 → `/{locale}/profile/{userId}`
- 채널 행 → 홈으로 이동하며 `?channel_id=...` 필터 적용 (채널 상세 페이지 미존재) — `filterStore.setChannelId()` 호출 후 `router.push('/')`
- 아티스트 행 → `/{locale}/artist/{slug}`
- 태그 칩 → 해당 카테고리 필터 적용 후 홈

### 5.4 `/search` 페이지 모드 분기

```ts
const sp = useSearchParams();
const q = sp.get('q')?.trim() ?? '';
if (q) {
  return <SearchResults query={q} />; // 결과 모드
} else {
  return <SearchInputView ... />;     // 기존 입력 + 최근검색 + 실시간 드롭다운 미리보기
}
```

입력 모드에서도 `SearchDropdown` 을 재사용 (현재 인라인 구현 대체).

---

## 6. State & Navigation

| State | 위치 | 내용 |
|-------|------|------|
| URL `?q` | `/search` 페이지 query param | 결과 모드 진입 트리거, 공유 URL |
| `value` (입력값) | Header/Overlay/search 페이지 local state | 입력 중인 쿼리 |
| 최근 검색어 | `localStorage['clipclef_recent_searches']` | 현행 유지 |
| 드롭다운 open | Header/Overlay local state | focus 기반 |
| 팔로우 상태 Map | React Query cache (`useBatchFollow`) | 사용자 섹션 전체 초기값 |

**Navigation 규칙**:
- Enter (검색창) → `router.push('/{locale}/search?q=' + encodeURIComponent(q))`
- 드롭다운 "전체 결과 보기" → 동일
- 결과 페이지에서 쿼리 수정 후 Enter → `router.replace(...)` (히스토리 중복 방지)

---

## 7. Error Handling

| 상황 | 동작 |
|------|------|
| 쿼리 빈 문자열 | `useSearch` 가 빈 결과 반환, API 호출 없음 |
| 개별 섹션 쿼리 실패 | 해당 섹션만 빈 결과로 처리, 나머지 섹션 정상 표시 |
| 전체 쿼리 실패 (네트워크) | `<p>검색 중 오류가 발생했습니다</p>` + 재시도 버튼 |
| 팔로우 토글 실패 | 칩은 optimistic 상태 복원 + 토스트(향후) / 현재는 silent revert |
| 배치 팔로우 조회 실패 | 사용자 섹션에서 팔로우 칩 "팔로우" 기본값으로 표시 (기능 동작 유지) |

---

## 8. Test Plan

### 8.1 수동 시나리오 (배포 후 확인)

1. Header 검색창 포커스 → "bruno" 입력 → 드롭다운에 아티스트 "Bruno Mars" 노출, 우측 "아티스트" 텍스트 없음
2. 사용자 이름으로 검색 → 사용자 섹션 노출, 팔로우 칩 동작 (토글 후 새로고침 유지)
3. 채널명("Essential") 검색 → 채널 섹션에 "Essential; · N개 플리" 노출
4. Enter → URL이 `/ko/search?q=bruno` 로 변경되고 결과 페이지 렌더
5. 결과 페이지에서 영상 섹션 20개 이하, 사용자/채널/아티스트 5개 이하
6. 태그 "jazz" 검색 → 태그 칩 노출, 클릭 시 홈으로 이동 + 해당 태그 선택됨
7. 모바일 `/search` 입력 → 동일 드롭다운, Enter 시 결과 페이지 모드 전환
8. 결과 0건 → "검색 결과가 없습니다"

### 8.2 수동 QA 체크리스트

- [ ] 로그인/미로그인 상태 모두 검색 가능
- [ ] 드롭다운 외 영역 클릭 시 닫힘 (Header 데스크톱)
- [ ] ESC 키 동작 (Header 데스크톱)
- [ ] 결과 페이지에서 쿼리 수정 후 Enter 시 URL 갱신 & 리렌더
- [ ] 빈 섹션 숨김 확인 (사용자 없는 쿼리에서 사용자 헤더 안 뜸)
- [ ] 한글/영문 혼합 쿼리 정상 동작

---

## 9. Acceptance Criteria (Plan SC 대응)

| Plan SC | Design 구현 위치 |
|---------|------------------|
| 1. 드롭다운에 아티스트→사용자→채널→영상 순서 4섹션 | §5.1 SearchDropdown, §4.1 useSearch limits |
| 2. 아티스트 행 우측 "아티스트" 텍스트 삭제 | §5.1 주석 |
| 3. 사용자 행 팔로우/팔로잉 칩, 로그인 시만 노출, 클릭 시 토글 & 이동 차단 | §5.2 UserFollowChip + §4.3 |
| 4. Enter → `/search?q=` 이동 | §6 Navigation |
| 5. 결과 페이지 5섹션, 개수 20/5/5/5/전체, 결과 존재 시에만 | §5.3 SearchResults, §4.1 limits |
| 6. 태그 칩 클릭 → 해당 태그 필터 적용 홈 | §5.3 Link 이동 목적지 |
| 7. 모바일 /search `?q` 유무 분기 | §5.4 |

---

## 10. Trade-offs & Alternatives

| 결정 | 대안 | 채택 이유 |
|------|------|-----------|
| 섹션별 독립 쿼리 (Promise.all) | 단일 RPC / stored procedure | 단순 유지, 각 섹션 독립 개선 가능 |
| 채널 엔터티 가상화 (`channel_id` distinct) | `channels` 테이블 신설 | 기존 데이터 건드리지 않음, 향후 필요 시 마이그레이션 |
| 팔로우 배치 조회 후 초기값 주입 | 행마다 useFollow 호출 | N+1 방지, 네트워크 1회 |
| 결과 페이지 단일 컴포넌트 | 섹션별 컴포넌트 분리 | 지금 5개 섹션 크기로는 과분할. 향후 분리 |
| 태그 DB 매칭 안 함 | `ilike any(genre)` 쿼리 | 태그 옵션이 상수(≤ 30개) → 클라이언트 `filter` 충분, 개수만 DB |
| `useSearch` React Query 사용 | SWR / 직접 useEffect | React Query 이미 프로젝트 전역 사용, 캐시 일관성 |

---

## 11. Implementation Guide

### 11.1 구현 순서

1. **Module-1 (Hooks/Utils)** — 신규 파일, 사이드이펙트 없음
   - `src/features/search/lib/follow-batch.ts`
   - `src/features/search/hooks/useBatchFollow.ts`
   - `src/features/search/hooks/useSearch.ts`
   - 타입 정의 (`SearchResult`, `SearchLimits`)
2. **Module-2 (Dropdown UI)** — 공용 드롭다운 완성
   - `src/features/search/components/UserFollowChip.tsx`
   - `src/features/search/components/SearchDropdown.tsx`
3. **Module-3 (Results Page)** — 결과 페이지 구성
   - `src/features/search/components/SearchResults.tsx`
   - `src/app/[locale]/search/page.tsx` — `?q` 분기 + SearchDropdown 통합
4. **Module-4 (Entry Point 통합)** — Header·Overlay 리팩터링
   - `src/components/layout/Header.tsx` DesktopSearchBar 내부를 SearchDropdown 사용으로 교체, Enter → router.push
   - `src/components/ui/SearchOverlay.tsx` 동일

### 11.2 관련 파일 요약

| 구분 | 파일 | 변경 |
|------|------|------|
| 신규 | `src/features/search/hooks/useSearch.ts` | 5섹션 병렬 검색 훅 |
| 신규 | `src/features/search/hooks/useBatchFollow.ts` | 팔로우 배치 훅 |
| 신규 | `src/features/search/lib/follow-batch.ts` | 배치 유틸 |
| 신규 | `src/features/search/components/SearchDropdown.tsx` | 공용 드롭다운 |
| 신규 | `src/features/search/components/UserFollowChip.tsx` | 팔로우 칩 |
| 신규 | `src/features/search/components/SearchResults.tsx` | 결과 페이지 |
| 수정 | `src/app/[locale]/search/page.tsx` | `?q` 분기 + 공용 드롭다운 사용 |
| 수정 | `src/components/layout/Header.tsx` | DesktopSearchBar 내부 교체 + Enter 라우팅 |
| 수정 | `src/components/ui/SearchOverlay.tsx` | 공용 드롭다운 사용 + Enter 라우팅 |
| 확인 | `src/features/interaction/hooks/useFollow.ts` | 초기 상태 주입 가능 여부 확인 (필요 시 파라미터 추가) |

### 11.3 Session Guide

추천 세션 분할:

| Session | Modules | 예상 파일 | 목적 |
|---------|---------|-----------|------|
| **session-1** | Module-1 | 신규 3 | 타입·쿼리·배치 유틸 완성 (독립 테스트 가능) |
| **session-2** | Module-2 + Module-3 | 신규 3 | UI 컴포넌트 (Dropdown/Results/Chip) + `/search` 결과 모드 |
| **session-3** | Module-4 | 수정 2 | Header·Overlay 통합, 기존 인라인 로직 제거 |

`/pdca do search-enhancement --scope module-1` 같이 분할 실행 가능.

---

## 12. Open Issues (Plan 이월 + Design 신규)

- **채널 상세 페이지 미존재**: 채널 행 클릭 시 당장은 홈 `channel_id` 필터. 추후 `/channel/{id}` 신설 여부 결정.
- **useFollow 훅 초기값 주입**: 현존 훅이 초기 fetch를 강제하는지 확인 필요 (Implementation 시작 시 1차 확인).
- **태그 별칭 (한↔영)**: 'Jazz' vs '재즈' 같은 별칭 매핑 부재. 이번 스코프 외, 향후 별도 피처.
- **검색 결과 "더 보기"**: 영상 20개 초과, 사용자 5 초과 시 확장 UX. 이번 스코프 외.
- **태그 개수 집계 쿼리**: 태그 매칭 수만큼 count 쿼리 실행 — 매칭이 10+ 시 느려질 수 있음. 실제 사용 태그 수 한정적이라 당장은 수용.
