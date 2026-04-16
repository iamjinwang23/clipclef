# Design: artist-api-refactor

> **Architecture**: Option B — Clean Architecture (React Query 2-step)
> **Selected**: 2026-04-16
> **Plan Ref**: `docs/01-plan/features/artist-api-refactor.plan.md`

## Context Anchor

| 항목 | 내용 |
|------|------|
| WHY | Last.fm 이미지 2019년 제거, Deezer 품질 낮음 → MusicBrainz MBID 정규화 + Fanart.tv 고화질 이미지 + Wikipedia KO 바이오로 품질 향상 |
| WHO | ClipClef 아티스트 탐색 사용자 / 유지보수 개발팀 |
| RISK | MusicBrainz 1 req/sec (클라이언트 IP 분산으로 완화), Fanart.tv/TheAudioDB 인디 아티스트 미존재 |
| SUCCESS | Fanart.tv 이미지 + Wikipedia KO 바이오 노출, Deezer·Last.fm 코드 완전 제거, React Query 캐싱 동작 |
| SCOPE | DB 1컬럼, lib 1개 신규·1개 삭제, artist.server.ts·ArtistStrip·next.config 수정 |

---

## 1. Overview

### 1.1 Architecture Decision

**Option B — Clean Architecture (React Query 2-step)** 채택.

- `src/lib/artist-apis.ts` 신규: MusicBrainz(클라이언트 직접 호출 가능) + 서버용 API 함수 분리
- `ArtistStrip` React Query 2-step: ① 클라이언트 MusicBrainz → MBID ② `/api/artists/[slug]?mbid=` 호출
- `artist.server.ts`: lastfm.ts 의존 제거, artist-apis.ts 기반으로 재작성
- `src/lib/lastfm.ts` 완전 삭제 (util 함수 `extractMainArtist`, `toArtistSlug`는 `artist-apis.ts`로 이전)

### 1.2 Data Flow

```
ArtistStrip (클라이언트):
  useQuery(['mbid', slug, name]) — staleTime: 30분
    → searchMbid(name) — MusicBrainz 클라이언트 직접 호출
    → MBID 획득

  useQuery(['artist', slug, mbid], enabled: mbid !== null) — staleTime: 30분
    → fetch /api/artists/[slug]?mbid={mbid}

/api/artists/[slug]/route.ts (서버):
  → mbid 쿼리 파라미터 수신
  → artist.server.ts fetchArtistWithCache(slug, name, mbid)
    ① DB 조회 (slug + cached_at)
    ② 캐시 유효 → 즉시 반환
    ③ 캐시 만료/미존재 → Promise.all:
       - fetchFanartImages(mbid) — Fanart.tv
       - fetchTheAudioDB(mbid)   — TheAudioDB (이미지 폴백 + EN 바이오)
       - fetchWikipediaBio(name) — Wikipedia KO
    ④ 결과 merge (이미지 폴백 체인 적용) → upsert → 반환

artist/[slug]/page.tsx (서버 컴포넌트):
  → slug → DB → mbid 있으면 병렬 API 호출 (artist.server.ts 재사용)
```

---

## 2. Database

### 2.1 Migration: mbid 컬럼 추가

```sql
-- supabase/migrations/016_artists_mbid.sql
ALTER TABLE artists ADD COLUMN IF NOT EXISTS mbid text;
CREATE UNIQUE INDEX IF NOT EXISTS artists_mbid_idx
  ON artists (mbid) WHERE mbid IS NOT NULL;
```

### 2.2 갱신된 ArtistRow 타입

```typescript
export interface ArtistRow {
  id: string;
  name: string;
  slug: string;
  mbid: string | null;       // 신규 — MusicBrainz ID
  image_url: string | null;
  bio_en: string | null;
  listeners: number | null;  // 더 이상 갱신 안 함 (Last.fm 제거). 기존 데이터 유지.
  not_found: boolean;
  cached_at: string;
  created_at: string;
}
```

> `listeners` 컬럼은 삭제하지 않고 NULL 유지. 기존 데이터 호환성 보존.

---

## 3. 신규 파일: `src/lib/artist-apis.ts`

### 3.1 모듈 역할

`lastfm.ts`를 완전 대체. 4개 외부 API 함수 + 유틸 함수 포함.

```typescript
// 유틸 (lastfm.ts에서 이전)
export function extractMainArtist(name: string): string
export function toArtistSlug(name: string): string

// MusicBrainz — 클라이언트/서버 양쪽 호출 가능 (인증 불필요)
export async function searchMbid(name: string): Promise<string | null>

// Fanart.tv — 서버 전용 (FANART_API_KEY)
export async function fetchFanartImages(mbid: string): Promise<FanartImages | null>

// TheAudioDB — 서버 전용 (THEAUDIODB_API_KEY)
export async function fetchTheAudioDB(mbid: string): Promise<TheAudioDBData | null>

// Wikipedia KO — 서버 전용 (인증 불필요)
export async function fetchWikipediaBio(name: string): Promise<string | null>
```

### 3.2 타입 정의

```typescript
export interface FanartImages {
  artistbackground: string | null; // 와이드 배경 이미지
  artistthumb: string | null;      // 썸네일
  hdmusiclogo: string | null;      // 로고
}

export interface TheAudioDBData {
  strArtistThumb: string | null;
  strArtistFanart: string | null;
  strBiographyEN: string | null;
}
```

### 3.3 각 API 엔드포인트

| 함수 | URL | 인증 |
|------|-----|------|
| `searchMbid` | `https://musicbrainz.org/ws/2/artist/?query={name}&limit=1&fmt=json` | 없음 (User-Agent 필수) |
| `fetchFanartImages` | `https://webservice.fanart.tv/v3/music/{mbid}?api_key={KEY}` | `FANART_API_KEY` |
| `fetchTheAudioDB` | `https://www.theaudiodb.com/api/v1/json/{KEY}/artist-mb.php?i={mbid}` | `THEAUDIODB_API_KEY` (기본 `"2"`) |
| `fetchWikipediaBio` | `https://ko.wikipedia.org/api/rest_v1/page/summary/{encodedName}` | 없음 |

### 3.4 MusicBrainz User-Agent 요구사항

```typescript
const MB_USER_AGENT = 'ClipClef/1.0 (iamjinwang23@gmail.com)';
// fetch 호출 시 반드시 포함
fetch(url, { headers: { 'User-Agent': MB_USER_AGENT } })
```

### 3.5 폴백 체인 구현

```typescript
// 이미지 폴백 (artist.server.ts에서 처리)
export function resolveImage(
  fanart: FanartImages | null,
  audiodb: TheAudioDBData | null
): string | null {
  return (
    fanart?.artistbackground ??
    fanart?.artistthumb ??
    audiodb?.strArtistThumb ??
    audiodb?.strArtistFanart ??
    null
  );
}

// 바이오 폴백
export function resolveBio(
  wikipediaKo: string | null,
  audiodbEn: string | null
): string | null {
  return wikipediaKo ?? audiodbEn ?? null;
}
```

---

## 4. API 계약

### 4.1 `GET /api/artists/[slug]`

**Request 변경사항:**

| 파라미터 | 이전 | 이후 |
|----------|------|------|
| `name` | 필수 | 선택 (폴백용) |
| `mbid` | 없음 | 신규 추가 (ArtistStrip에서 전달) |

```
GET /api/artists/taylor-swift?mbid=20244d07-534f-...&name=Taylor+Swift
```

**Response:** 기존 `ArtistRow` 형식 유지 (mbid 필드 추가됨)

```json
{
  "id": "...",
  "name": "Taylor Swift",
  "slug": "taylor-swift",
  "mbid": "20244d07-534f-...",
  "image_url": "https://assets.fanart.tv/...",
  "bio_en": "Taylor Swift is an American...",
  "not_found": false,
  "cached_at": "2026-04-16T..."
}
```

**not_found 응답 (변경 없음):**
```json
{ "not_found": true }
```

### 4.2 mbid 없는 경우 처리

```typescript
// route.ts — mbid 없으면 서버에서 MusicBrainz 호출 (폴백)
const mbidParam = req.nextUrl.searchParams.get('mbid');
// mbid가 없으면 artist.server.ts 내부에서 searchMbid 호출
```

---

## 5. 컴포넌트 설계

### 5.1 ArtistStrip.tsx 변경

**현재:** `useEffect + useState` (단일 fetch)

**변경 후:** `useQuery` 2-step chain

```typescript
'use client';
import { useQuery } from '@tanstack/react-query';
import { searchMbid } from '@/lib/artist-apis';

// Step 1: MBID 조회 (클라이언트 MusicBrainz 직접)
function useArtistMbid(slug: string, name: string) {
  return useQuery({
    queryKey: ['mbid', slug, name],
    queryFn: () => searchMbid(name),
    staleTime: 30 * 60 * 1000,  // 30분
    retry: 1,
  });
}

// Step 2: 아티스트 데이터 조회 (mbid 있을 때만)
function useArtistData(slug: string, name: string, mbid: string | null | undefined) {
  return useQuery({
    queryKey: ['artist', slug, mbid],
    queryFn: async () => {
      const params = new URLSearchParams({ name });
      if (mbid) params.set('mbid', mbid);
      const res = await fetch(`/api/artists/${encodeURIComponent(slug)}?${params}`);
      return res.json() as Promise<ArtistResult>;
    },
    enabled: mbid !== undefined,  // mbid 쿼리 완료 후 실행 (null 포함)
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}
```

**각 아티스트 카드를 개별 컴포넌트로 분리:**

```typescript
// ArtistStrip: artists 배열을 순회하여 ArtistStripItem 렌더
// ArtistStripItem: 단일 아티스트의 2-step query 담당
function ArtistStripItem({ name, slug, locale }: ...) {
  const { data: mbid } = useArtistMbid(slug, name);
  const { data: artist, isLoading } = useArtistData(slug, name, mbid);
  // ...
}
```

### 5.2 QueryClientProvider 확인

`@tanstack/react-query` 이미 설치됨 (`^5.96.2`). QueryClientProvider가 루트에 이미 설정되어 있는지 확인 후 필요 시 추가.

---

## 6. `artist.server.ts` 변경

### 6.1 시그니처 업데이트

```typescript
// 이전
export async function fetchArtistWithCache(
  slug: string,
  artistName: string
): Promise<ArtistRow | null>

// 변경 후
export async function fetchArtistWithCache(
  slug: string,
  artistName: string,
  mbid?: string | null  // 신규 선택 파라미터
): Promise<ArtistRow | null>
```

### 6.2 내부 로직 변경

```typescript
// lastfm.ts 의존 제거
// artist-apis.ts 사용

import {
  searchMbid,
  fetchFanartImages,
  fetchTheAudioDB,
  fetchWikipediaBio,
  resolveImage,
  resolveBio,
} from '@/lib/artist-apis';

// 캐시 만료 시:
const resolvedMbid = mbid ?? await searchMbid(artistName);
if (!resolvedMbid) {
  // mbid 없으면 not_found upsert
}

const [fanart, audiodb, wikiBio] = await Promise.all([
  fetchFanartImages(resolvedMbid),
  fetchTheAudioDB(resolvedMbid),
  fetchWikipediaBio(artistName),
]);

const row = {
  name: artistName,
  slug,
  mbid: resolvedMbid,
  image_url: resolveImage(fanart, audiodb),
  bio_en: resolveBio(wikiBio, audiodb?.strBiographyEN ?? null),
  listeners: null,  // Last.fm 제거로 더 이상 수집 안 함
  not_found: false,
  cached_at: new Date().toISOString(),
};
```

---

## 7. `next.config.ts` 변경

```typescript
// 제거
{ protocol: 'https', hostname: 'lastfm.freetls.fastly.net' },
{ protocol: 'https', hostname: 'cdn-images.dzcdn.net' },

// 추가
{ protocol: 'https', hostname: 'assets.fanart.tv' },
{ protocol: 'https', hostname: 'www.theaudiodb.com' },
{ protocol: 'https', hostname: 'cdn.theaudiodb.com' },
```

---

## 8. 환경 변수

| 변수 | 용도 | 필수 |
|------|------|------|
| `FANART_API_KEY` | Fanart.tv API 키 | Yes |
| `THEAUDIODB_API_KEY` | TheAudioDB API 키 (기본 `"2"`) | Yes (기본값 있음) |
| `LASTFM_API_KEY` | **삭제** | - |

`.env.local` 업데이트:
```bash
# 추가
FANART_API_KEY=your_fanart_key_here
THEAUDIODB_API_KEY=2

# 삭제
# LASTFM_API_KEY=...
```

---

## 9. 파일 변경 목록

### 신규
| 파일 | 설명 |
|------|------|
| `src/lib/artist-apis.ts` | MusicBrainz + Fanart.tv + TheAudioDB + Wikipedia + 유틸 함수 |
| `supabase/migrations/016_artists_mbid.sql` | artists 테이블 mbid 컬럼 추가 |

### 수정
| 파일 | 변경 내용 |
|------|----------|
| `src/features/artist/lib/artist.server.ts` | lastfm.ts 제거, artist-apis.ts 기반 재작성, mbid 파라미터 추가 |
| `src/app/api/artists/[slug]/route.ts` | mbid 쿼리 파라미터 수신 |
| `src/features/artist/components/ArtistStrip.tsx` | useEffect → useQuery 2-step (ArtistStripItem 분리) |
| `src/app/[locale]/artist/[slug]/page.tsx` | artist.server.ts 시그니처 변경 반영 |
| `src/app/[locale]/playlist/[id]/page.tsx` | lastfm.ts import → artist-apis.ts로 교체 |
| `src/components/ui/SearchOverlay.tsx` | lastfm.ts toArtistSlug import → artist-apis.ts로 교체 |
| `next.config.ts` | 이미지 도메인 교체 |
| `.env.local` | FANART_API_KEY 추가, LASTFM_API_KEY 삭제 |

### 삭제
| 파일 | 이유 |
|------|------|
| `src/lib/lastfm.ts` | artist-apis.ts로 완전 대체 |

---

## 10. 리스크 및 대응

| 리스크 | 대응 |
|--------|------|
| MusicBrainz MBID 매칭 실패 | 첫 번째 결과 사용, null이면 서버에서 폴백 처리 |
| Fanart.tv 데이터 미존재 | TheAudioDB → 이니셜 플레이스홀더 폴백 체인 |
| Wikipedia KO 항목 없음 | TheAudioDB EN 바이오 자동 폴백 |
| TheAudioDB 무료 키 `"2"` 제한 | 7일 DB 캐시로 실제 호출 최소화 |
| 기존 artists 캐시 데이터 호환 | mbid NULL 허용 → 점진적 채움 (stale 갱신 시 자동) |
| `playlist/[id]` lastfm.ts import 잔류 | SearchOverlay 포함 전체 grep 후 일괄 교체 |

---

## 11. Implementation Guide

### 11.1 구현 순서

1. **M1: DB Migration + 환경 변수** (전제 조건)
   - `supabase/migrations/016_artists_mbid.sql` 작성 + 적용
   - `.env.local` FANART_API_KEY 추가, LASTFM_API_KEY 제거

2. **M2: `src/lib/artist-apis.ts` 신규**
   - 유틸 함수 이전 (`extractMainArtist`, `toArtistSlug`)
   - 4개 API 함수 구현
   - `resolveImage`, `resolveBio` 폴백 헬퍼 구현

3. **M3: `artist.server.ts` 리팩터**
   - lastfm.ts import 제거
   - artist-apis.ts 기반으로 `fetchArtistWithCache` 재작성
   - mbid 파라미터 추가

4. **M4: `route.ts` + `next.config.ts` 수정**
   - route.ts: mbid 쿼리 파라미터 수신
   - next.config.ts: 이미지 도메인 교체

5. **M5: `ArtistStrip.tsx` React Query 전환**
   - useEffect → ArtistStripItem 분리 + useQuery 2-step

6. **M6: import 경로 일괄 교체 + lastfm.ts 삭제**
   - `playlist/[id]/page.tsx`, `SearchOverlay.tsx` import 교체
   - `src/lib/lastfm.ts` 삭제

### 11.2 의존성 체크

```bash
# TanStack React Query 이미 설치됨 (@tanstack/react-query ^5.96.2)
# QueryClientProvider 설정 확인 필요
```

### 11.3 Session Guide

| Module | 범위 | 예상 작업량 |
|--------|------|------------|
| M1 | DB + env | 소 (~20줄) |
| M2 | artist-apis.ts 신규 | 중 (~120줄) |
| M3 | artist.server.ts 리팩터 | 중 (~60줄 변경) |
| M4 | route.ts + next.config.ts | 소 (~20줄) |
| M5 | ArtistStrip React Query | 중 (~60줄 변경) |
| M6 | import 교체 + 삭제 | 소 (~10줄) |

**권장 세션 분할:**
- 세션 1: M1 → M2 → M3 (기반 구축)
- 세션 2: M4 → M5 → M6 (연결 + 완성)

또는 단일 세션: `/pdca do artist-api-refactor --scope M1,M2,M3,M4,M5,M6`
