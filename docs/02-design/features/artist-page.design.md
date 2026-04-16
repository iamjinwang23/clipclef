# Design: artist-page

> **Architecture**: Option B — Clean Architecture  
> **Selected**: 2026-04-16  
> **Plan Ref**: `docs/01-plan/features/artist-page.plan.md`

## Context Anchor

| 항목 | 내용 |
|------|------|
| WHY | 트랙명·아티스트명은 있지만 클릭 가능한 아티스트 정보가 없어 탐색이 단절됨 |
| WHO | 특정 아티스트 팬 / 새 아티스트를 발견하고 싶은 사용자 |
| RISK | Last.fm API 이미지 품질 편차, 아티스트명 정규화 실패(오타·피처링 표기 등) |
| SUCCESS | 트랙리스트 하단 아티스트 카드 노출 / 아티스트 페이지 접근 / 검색 아티스트 섹션 |
| SCOPE | DB 1개 테이블, API 라우트 1개, 신규 페이지 1개, 기존 페이지 2개 수정 |

---

## 1. Overview

### 1.1 Architecture Decision

**Option B — Clean Architecture** 채택.

- `features/artist/` 디렉토리로 아티스트 도메인 격리
- `/api/artists/[slug]` API 라우트가 캐시·갱신을 단일 책임
- `ArtistStrip` 클라이언트 컴포넌트가 slug 배열을 받아 각 API 호출
- `artist.server.ts` 서버 유틸이 API 라우트와 아티스트 상세 페이지 양쪽에서 재사용

### 1.2 Data Flow

```
playlist/[id]/page.tsx (서버 컴포넌트)
  └─ tracks에서 고유 아티스트 slug 추출 (최대 5개)
  └─ <ArtistStrip slugs={[...]} locale={locale} /> 렌더

ArtistStrip (클라이언트 컴포넌트)
  └─ 마운트 시 /api/artists/[slug] 병렬 fetch
  └─ 로딩 스켈레톤 → 결과 카드 렌더

/api/artists/[slug]/route.ts (서버)
  └─ Supabase artists 테이블 조회 (slug 기준)
  └─ 캐시 HIT (≤7일): 즉시 반환
  └─ 캐시 MISS or stale: lastfm.ts 호출
  └─ 결과 upsert → 반환

artist/[slug]/page.tsx (서버 컴포넌트)
  └─ artist.server.ts: Supabase 조회 (캐시 확인)
  └─ 미캐시: lastfm.ts 직접 호출
  └─ <ArtistHero />, bio, 출연 플리 그리드 렌더
```

---

## 2. Database

### 2.1 artists 테이블 (Supabase Migration)

```sql
create table artists (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  image_url  text,
  bio_en     text,
  listeners  integer,
  not_found  boolean default false,
  cached_at  timestamptz default now(),
  created_at timestamptz default now()
);
create index on artists (slug);
```

### 2.2 RLS

```sql
alter table artists enable row level security;
-- 누구나 읽기 허용 (공개 메타데이터)
create policy "artists read" on artists for select using (true);
-- 서비스 롤만 쓰기 (API 라우트는 서비스 키 사용)
create policy "artists write" on artists for all using (false);
```

> API 라우트에서 Supabase Admin 클라이언트(`SUPABASE_SERVICE_ROLE_KEY`) 사용하여 RLS bypass.

---

## 3. 아티스트명 정규화

### 3.1 slug 생성 규칙 (`src/lib/lastfm.ts`)

```
1. 소문자 trim
2. 피처링 제거: " ft.", " feat.", " featuring", " x ", " & ", " / ", " with " 앞 부분만 추출
3. 괄호 내용 제거: s.replace(/\([^)]*\)/g, '')
4. URL slug: 공백→하이픈, 특수문자(영숫자·하이픈 외) 제거
5. 연속 하이픈 정리, 앞뒤 하이픈 제거
```

예시:
| 원본 | slug |
|------|------|
| `Laufey` | `laufey` |
| `Frank Ocean ft. Jay-Z` | `frank-ocean` |
| `SZA & Travis Scott` | `sza` |
| `The xx` | `the-xx` |
| `tyler, the creator` | `tyler-the-creator` |

---

## 4. API 설계

### 4.1 GET /api/artists/[slug]

**Request**: `GET /api/artists/laufey`

**Response (성공)**:
```json
{
  "id": "uuid",
  "name": "Laufey",
  "slug": "laufey",
  "image_url": "https://lastfm.freetls.fastly.net/...",
  "bio_en": "Laufey is an Icelandic-Chinese singer...",
  "listeners": 3200000,
  "not_found": false
}
```

**Response (not_found)**:
```json
{ "not_found": true }
```

**캐시 로직**:
```
DB 조회 (slug)
  ├─ 없음 → Last.fm 호출 → upsert → 반환
  ├─ not_found: true → 즉시 { not_found: true } 반환 (재시도 없음)
  ├─ cached_at + 7일 > now() → 캐시 유효 → 즉시 반환
  └─ stale (7일 초과) → Last.fm 재호출 → update → 반환
```

**에러 처리**:
- `LASTFM_API_KEY` 미설정: `{ not_found: true }` (에러 아님, 조용히 처리)
- Last.fm 응답 없음 / 네트워크 오류: 기존 캐시 데이터 반환 (없으면 `not_found: true`)
- Last.fm `artist.mbid` == "" (아티스트 없음): `not_found: true` upsert

### 4.2 Last.fm API 호출 (`src/lib/lastfm.ts`)

```
GET https://ws.audioscrobbler.com/2.0/
  ?method=artist.getinfo
  &artist={encodedName}
  &api_key={LASTFM_API_KEY}
  &format=json
```

**이미지 선택 전략**:
- `artist.image[]` 배열에서 size=`extralarge` 우선, 없으면 `large`
- URL이 빈 문자열이거나 `2a96cbd8b46e442fc41c2b86b821562f.png` (Last.fm 기본 이미지)이면 null

---

## 5. 컴포넌트 설계

### 5.1 ArtistCard (`src/features/artist/components/ArtistCard.tsx`)

**Props**:
```typescript
interface ArtistCardProps {
  name: string;
  slug: string;
  imageUrl: string | null;
  locale: string;
}
```

**UI 스펙**:
```
┌──────┐
│  ○   │  ← 원형 썸네일 (48x48)
│      │     없으면 이니셜 플레이스홀더
└──────┘
 이름
 아티스트 보기 →  ← 작은 텍스트 링크
```

- 카드 전체가 `/[locale]/artist/[slug]`로 이동하는 Link
- 이미지 없으면 `bg-[var(--muted)]` + 이니셜(1자) 표시
- 호버: `opacity-80` 전환

### 5.2 ArtistStrip (`src/features/artist/components/ArtistStrip.tsx`)

**Props**:
```typescript
interface ArtistStripProps {
  slugs: { name: string; slug: string }[];
  locale: string;
}
```

**동작**:
1. 마운트 시 각 slug에 대해 `/api/artists/[slug]` 병렬 fetch
2. 로딩 중: 원형 스켈레톤 × N개
3. `not_found: true` 응답은 해당 카드 표시 안 함
4. 유효 아티스트가 0명이면 섹션 자체 미표시

**레이아웃**:
```
아티스트                          ← 섹션 제목 (text-sm uppercase)
[카드1] [카드2] [카드3]           ← 가로 스크롤 flex
```

### 5.3 ArtistHero (`src/features/artist/components/ArtistHero.tsx`)

**Props**:
```typescript
interface ArtistHeroProps {
  name: string;
  imageUrl: string | null;
  listeners: number | null;
}
```

**UI 스펙**:
```
┌─────────────────────────────────┐
│         [이미지 배경]            │  ← aspect-video, objectCover
│  ████████████████               │
│  아티스트명                      │  ← text-3xl font-bold
│  3.2M listeners                 │  ← text-sm text-secondary
└─────────────────────────────────┘
```

- 이미지 없으면 `bg-[var(--muted)]` 단색 배경

### 5.4 artist.server.ts (`src/features/artist/lib/artist.server.ts`)

```typescript
// Supabase 캐시 조회 + 필요시 Last.fm 호출
// artist/[slug]/page.tsx 와 /api/artists/[slug] 공용 유틸
async function fetchArtistWithCache(slug: string): Promise<ArtistRow | null>
async function getArtistPlaylists(artistName: string): Promise<Playlist[]>
```

**출연 플리 조회 쿼리**:
```sql
SELECT DISTINCT p.*
FROM playlists p
JOIN tracks t ON t.playlist_id = p.id
WHERE t.artist ILIKE '%{artistName}%'
  AND p.is_active = true
ORDER BY p.like_count DESC
LIMIT 20
```

---

## 6. 페이지 설계

### 6.1 아티스트 상세 페이지 (`/[locale]/artist/[slug]/page.tsx`)

**서버 컴포넌트**. 레이아웃:

```
<ArtistHero name imageUrl listeners />

바이오그래피                        ← bio_en HTML 태그 strip, 최대 500자
  "Laufey is an Icelandic..."

출연 플레이리스트                    ← text-sm uppercase 섹션 제목
┌──────┐ ┌──────┐ ┌──────┐
│ 플리 │ │ 플리 │ │ 플리 │         ← PlaylistCard grid-cols-2 sm:grid-cols-3
└──────┘ └──────┘ └──────┘
```

**not_found 처리**: `notFound()` 호출 → 404 페이지

### 6.2 playlist/[id]/page.tsx 수정

트랙에서 고유 아티스트 추출 후 `ArtistStrip`을 `PlaylistPlayer` 뒤에 렌더:

```tsx
// 서버 컴포넌트에서 slug 추출
import { toArtistSlug } from '@/lib/lastfm';

const artistSlugs = [...new Set(
  t
    .filter(track => track.artist)
    .map(track => ({
      name: extractMainArtist(track.artist!),
      slug: toArtistSlug(track.artist!),
    }))
    .filter(a => a.slug)
)]
.slice(0, 5);  // 최대 5명

// PlaylistPlayer children으로 전달 또는 바로 뒤에 배치
{artistSlugs.length > 0 && (
  <ArtistStrip slugs={artistSlugs} locale={locale} />
)}
```

> `ArtistStrip`은 PlaylistPlayer `children` 내부 (트랙리스트 바로 아래)에 배치.  
> PlaylistPlayer는 `children`을 YouTube 플레이어 아래, 트랙리스트 위에 렌더함.  
> → ArtistStrip을 트랙리스트 **아래**에 두려면 PlaylistPlayer 내부에서 children 후 TrackList를 렌더하도록 순서 조정 필요.

**수정 방향**: `PlaylistPlayer.tsx`의 렌더 순서를 `{children}` → `TrackList` 순서 유지, `ArtistStrip`은 `PlaylistPlayer` 호출 후 아래에 별도 배치.

---

## 7. SearchOverlay 수정

### 7.1 아티스트 섹션 추가

기존 플리 결과 위에 아티스트 섹션을 추가:

```
[검색 입력란]

아티스트                            ← 섹션 레이블
  ○ Laufey →
  ○ Frank Ocean →

플레이리스트
  [썸네일] 제목
  [썸네일] 제목
```

**쿼리**:
```typescript
const { data: artistResults } = await supabase
  .from('artists')
  .select('name, slug, image_url')
  .ilike('name', `%${escaped}%`)
  .eq('not_found', false)
  .limit(3);
```

**조건**: `artistResults.length > 0`일 때만 섹션 표시

---

## 8. 테스트 시나리오

### TC-01: 트랙리스트 하단 아티스트 카드
- 트랙 아티스트가 있는 플리 상세 진입
- Expected: 트랙리스트 아래 아티스트 섹션 표시
- Edge: all tracks have no artist → 섹션 미표시

### TC-02: not_found 아티스트 필터링
- DB에 `not_found: true`인 slug → ArtistCard 미표시
- 유효 0명이면 ArtistStrip 전체 미표시

### TC-03: 아티스트 페이지 진입
- `/ko/artist/laufey` 접근
- Expected: ArtistHero + bio + 출연 플리
- Edge: 존재하지 않는 slug → 404

### TC-04: 검색 아티스트 섹션
- "lau" 입력
- Expected: 아티스트 섹션에 "Laufey" 표시
- artists DB에 없으면 아티스트 섹션 미표시

### TC-05: 7일 캐시
- Supabase DB에서 `cached_at` = 8일 전 레코드
- Expected: `/api/artists/[slug]` 호출 시 Last.fm 재호출 후 `cached_at` 갱신

---

## 9. 환경 변수

| 변수 | 설명 | 필수 |
|------|------|------|
| `LASTFM_API_KEY` | Last.fm 무료 API 키 | Yes (없으면 카드 skip) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Admin 키 (RLS bypass) | Yes |

---

## 10. next.config.ts 수정

```typescript
{ protocol: 'https', hostname: 'lastfm.freetls.fastly.net' },
```

---

## 11. Implementation Guide

### 11.1 구현 순서

1. **Supabase Migration** — `artists` 테이블 생성 + RLS
2. **`src/lib/lastfm.ts`** — slug 유틸 + Last.fm fetch 함수
3. **`src/features/artist/lib/artist.server.ts`** — 캐시 조회/갱신 서버 유틸
4. **`src/app/api/artists/[slug]/route.ts`** — GET 핸들러
5. **`src/features/artist/components/ArtistCard.tsx`** — 소형 카드
6. **`src/features/artist/components/ArtistStrip.tsx`** — 클라이언트 카드 행
7. **`src/features/artist/components/ArtistHero.tsx`** — 상세 헤더
8. **`src/app/[locale]/artist/[slug]/page.tsx`** — 아티스트 상세 페이지
9. **`src/app/[locale]/playlist/[id]/page.tsx`** — ArtistStrip 삽입
10. **`src/components/ui/SearchOverlay.tsx`** — 아티스트 섹션
11. **`next.config.ts`** — Last.fm 도메인 추가

### 11.2 주요 주의사항

- **서버/클라이언트 경계**: `lastfm.ts`는 서버 전용 (`LASTFM_API_KEY` 노출 방지). `ArtistStrip`은 클라이언트 컴포넌트이므로 `/api/artists/[slug]`를 통해서만 접근.
- **Supabase Admin 클라이언트**: `route.ts`에서 `createClient()` 대신 `createAdminClient()` 사용 (RLS bypass). `SUPABASE_SERVICE_ROLE_KEY` 필요.
- **PlaylistPlayer children 순서**: 현재 `children`이 트랙리스트 **위**에 렌더됨. ArtistStrip은 PlaylistPlayer **외부** (아래)에 배치하거나, PlaylistPlayer children을 트랙리스트 아래로 이동. 플리 상세에서 아티스트 카드가 트랙리스트 하단에 노출되어야 하므로 PlaylistPlayer 외부 배치 권장.
- **이미지 품질**: Last.fm 기본 이미지 (`2a96cbd8b46e442fc41c2b86b821562f.png`) 필터링 필수.

### 11.3 Session Guide

| Module | 범위 | 예상 파일 수 |
|--------|------|------------|
| M1 — Backend | Migration + lastfm.ts + artist.server.ts + API route | 3개 신규 |
| M2 — Components | ArtistCard + ArtistStrip + ArtistHero | 3개 신규 |
| M3 — Pages | artist/[slug]/page.tsx + playlist/[id] 수정 | 1개 신규 + 1개 수정 |
| M4 — Search | SearchOverlay 수정 + next.config | 2개 수정 |
