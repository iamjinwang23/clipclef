# Plan: artist-api-refactor

## Executive Summary

| 관점 | 내용 |
|------|------|
| Problem | Last.fm/Deezer 조합이 이미지는 해결했으나 MBID 기반 정규화 없어 아티스트 매칭 불안정하고 바이오 품질이 낮음 |
| Solution | MusicBrainz(MBID 식별) + Fanart.tv(고화질 이미지) + TheAudioDB(이미지 폴백·EN 바이오) + Wikipedia(KO 바이오) 조합으로 교체 |
| Functional UX Effect | 아티스트 페이지에 고화질 배경 이미지와 한국어 바이오그래피 제공, React Query로 중복 호출 제거 |
| Core Value | 아티스트 데이터 신뢰성·품질 향상 + 서버 비용 절감 (클라이언트 MusicBrainz + React Query 캐싱) |

## Context Anchor

| 항목 | 내용 |
|------|------|
| WHY | Deezer는 아티스트 주요 사진 품질이 낮고, Last.fm은 바이오 신뢰도가 낮으며 MBID 기반 정규화가 없어 동명이인 매칭 실패 가능 |
| WHO | ClipClef 아티스트 탐색 기능 사용자 / 개발팀(유지보수성 개선) |
| RISK | MusicBrainz 1 req/sec 제한, Fanart.tv/TheAudioDB 데이터 미존재 아티스트 (인디·신인), Wikipedia KO 항목 없음 |
| SUCCESS | Fanart.tv 이미지 노출 / Wikipedia KO 바이오 노출 / Deezer·Last.fm 코드 삭제 / React Query 캐싱 동작 |
| SCOPE | DB 1컬럼 추가, lib 신규 1개·삭제 1개, artist.server.ts 수정, ArtistStrip 수정, next.config 수정 |

---

## 1. 현재 구조

### 1.1 현재 데이터 흐름

```
ArtistStrip (client)
  → fetch /api/artists/[slug]?name={name}
  → route.ts → artist.server.ts → lastfm.ts
    ├─ Last.fm (bio + listeners)
    └─ Deezer (이미지)
  → Supabase artists 테이블 (slug 기반 7일 캐시)
```

### 1.2 현재 파일 목록

| 파일 | 역할 |
|------|------|
| `src/lib/lastfm.ts` | Last.fm + Deezer 데이터 조회 ← **삭제 대상** |
| `src/features/artist/lib/artist.server.ts` | 캐시 조회/갱신 서버 유틸 ← **수정** |
| `src/app/api/artists/[slug]/route.ts` | GET 핸들러 |
| `src/features/artist/components/ArtistStrip.tsx` | 클라이언트 카드 행 ← **수정** |

---

## 2. 목표 아키텍처

### 2.1 데이터 소스 계층

```
1. Identity (MBID 획득)
   └─ MusicBrainz API — 아티스트명 검색 → MBID 반환
      - 인증 불필요 / 클라이언트 직접 호출 (IP 분산 → rate limit 우회)
      - 1 req/sec 제한이나 클라이언트 호출로 사실상 무제한

2. Images (고화질 이미지)
   Primary:  Fanart.tv API — MBID → hdtvlogo, artistbackground, artistthumb
   Fallback: TheAudioDB API — MBID → strArtistThumb, strArtistFanart
   ※ 둘 다 없으면 이니셜 플레이스홀더

3. Biography
   Priority 1: Wikipedia API — 아티스트명 → KO 발췌
   Priority 2: TheAudioDB API — MBID → strBiographyEN
   ※ 둘 다 없으면 바이오 섹션 미표시
```

### 2.2 신규 데이터 흐름

```
ArtistStrip (client):
  useArtistData(slug, name) — React Query
    Step 1: MusicBrainz (클라이언트 직접) → MBID 획득
    Step 2: /api/artists/[slug]?mbid={mbid} → Fanart.tv/TheAudioDB/Wikipedia
    React Query staleTime: 30분 (세션 중 중복 호출 없음)

/api/artists/[slug] route.ts (서버):
  1. DB 조회 (slug + cached_at 확인)
  2. 캐시 유효 → 즉시 반환
  3. 캐시 만료/미존재 → mbid 파라미터로:
     - Fanart.tv (이미지)
     - TheAudioDB (이미지 폴백 + EN 바이오)
     - Wikipedia (KO 바이오) — 병렬 Promise.all
  4. Supabase upsert (mbid + 이미지 + 바이오)

아티스트 상세 페이지 (서버 컴포넌트):
  slug → DB → mbid 있으면 Fanart.tv/TheAudioDB/Wikipedia 병렬 호출
```

---

## 3. 요구사항

### 3.1 기능 요구사항

**FR-01: DB Migration — mbid 컬럼 추가**
```sql
ALTER TABLE artists ADD COLUMN IF NOT EXISTS mbid text;
CREATE UNIQUE INDEX IF NOT EXISTS artists_mbid_idx
  ON artists (mbid) WHERE mbid IS NOT NULL;
```

**FR-02: `src/lib/artist-apis.ts` 신규** (lastfm.ts 대체)
```typescript
// MusicBrainz
searchMbid(name: string): Promise<string | null>
  // GET https://musicbrainz.org/ws/2/artist/?query={name}&limit=1&fmt=json
  // User-Agent 헤더 필수: 'ClipClef/1.0 (contact@email.com)'

// Fanart.tv
fetchFanartImages(mbid: string): Promise<FanartImages | null>
  // GET https://webservice.fanart.tv/v3/music/{mbid}?api_key={FANART_API_KEY}
  // 반환: artistbackground[0].url, artistthumb[0].url, hdmusiclogo[0].url

// TheAudioDB
fetchTheAudioDB(mbid: string): Promise<TheAudioDBData | null>
  // GET https://www.theaudiodb.com/api/v1/json/{THEAUDIODB_API_KEY}/artist-mb.php?i={mbid}
  // 반환: strArtistThumb, strArtistFanart, strBiographyEN

// Wikipedia (KO)
fetchWikipediaBio(name: string): Promise<string | null>
  // GET https://ko.wikipedia.org/api/rest_v1/page/summary/{encodedName}
  // 반환: extract (500자 제한)
```

**FR-03: `artist.server.ts` 수정**
- `fetchArtistWithCache(slug, name, mbid?)` 시그니처 업데이트
- 내부에서 `artist-apis.ts` 모듈 사용
- `lastfm.ts` 의존 제거

**FR-04: `ArtistStrip.tsx` 수정**
- `useEffect + fetch` → `useQuery` (TanStack Query, 이미 설치됨)
- 2단계 로직:
  1. `useQuery(['mbid', slug], () => searchMbid(name))` — 클라이언트 MusicBrainz 직접 호출
  2. `useQuery(['artist', slug, mbid], () => fetch('/api/...'))` — mbid 있을 때만

**FR-05: `next.config.ts` 업데이트**
- 추가: `assets.fanart.tv`, `www.theaudiodb.com`, `cdn.theaudiodb.com`
- 제거: `cdn-images.dzcdn.net` (Deezer)

**FR-06: 환경 변수**
| 변수 | 출처 | 필수 |
|------|------|------|
| `FANART_API_KEY` | fanart.tv 개인 계정 | Yes |
| `THEAUDIODB_API_KEY` | theaudiodb.com 계정 | Yes (기본: `"2"` 무료) |
| `LASTFM_API_KEY` | **삭제** | - |

### 3.2 비기능 요구사항

- **Rate Limit**: MusicBrainz는 클라이언트 직접 호출 (IP 분산). `User-Agent` 헤더 필수.
- **React Query staleTime**: 30분 — 동일 세션 중 중복 외부 호출 없음
- **Fanart.tv 이미지**: `next/image` + `sizes` 설정으로 고해상도 최적화
- **lastfm.ts 파일 삭제**: 함수명 `fetchArtistFromLastFm` 포함 완전 제거

---

## 4. 폴백 체인

### 이미지 폴백
```
Fanart.tv artistbackground
  → Fanart.tv artistthumb
    → TheAudioDB strArtistThumb
      → TheAudioDB strArtistFanart
        → 이니셜 플레이스홀더 (항상 존재)
```

### 바이오 폴백
```
Wikipedia KO (extract)
  → TheAudioDB EN (strBiographyEN)
    → 바이오 섹션 미표시
```

---

## 5. 수정 파일 목록

### 신규
| 파일 | 설명 |
|------|------|
| `src/lib/artist-apis.ts` | MusicBrainz + Fanart.tv + TheAudioDB + Wikipedia 클라이언트 |
| `supabase/migrations/016_artists_mbid.sql` | mbid 컬럼 추가 |

### 수정
| 파일 | 변경 내용 |
|------|----------|
| `src/features/artist/lib/artist.server.ts` | artist-apis.ts 사용, lastfm.ts 제거 |
| `src/app/api/artists/[slug]/route.ts` | mbid 쿼리 파라미터 수신 |
| `src/features/artist/components/ArtistStrip.tsx` | useEffect → useQuery (2단계) |
| `src/app/[locale]/artist/[slug]/page.tsx` | artist.server.ts 업데이트 반영 |
| `next.config.ts` | 이미지 도메인 교체 |

### 삭제
| 파일 | 이유 |
|------|------|
| `src/lib/lastfm.ts` | 완전 대체 |

---

## 6. Success Criteria

| # | 기준 | 측정 |
|---|------|------|
| SC-01 | 플리 상세 — ArtistStrip에 Fanart.tv/TheAudioDB 이미지 노출 | 시각적 확인 |
| SC-02 | 아티스트 상세 — Wikipedia KO 또는 TheAudioDB EN 바이오 표시 | 시각적 확인 |
| SC-03 | `src/lib/lastfm.ts` 및 Deezer 관련 코드 완전 제거 | 파일 존재 여부 |
| SC-04 | React Query — 동일 아티스트 2회 접근 시 네트워크 요청 없음 | DevTools 확인 |
| SC-05 | 이미지 없는 아티스트 → 이니셜 플레이스홀더 표시 | 엣지케이스 확인 |
| SC-06 | MusicBrainz 호출이 클라이언트 측에서 발생 (서버 호출 아님) | Network 탭 확인 |

---

## 7. 리스크

| 리스크 | 대응 |
|--------|------|
| Fanart.tv 데이터 미존재 (인디 아티스트) | TheAudioDB → 플레이스홀더 폴백 체인 |
| Wikipedia KO 항목 없음 | TheAudioDB EN 바이오로 자동 폴백 |
| MusicBrainz MBID 매칭 실패 (동명이인 등) | 첫 번째 검색 결과 사용 + `not_found` 캐시 |
| TheAudioDB free key `"2"` 요청 제한 | 7일 DB 캐시로 실제 호출 최소화 |
| artist.server.ts 리팩터 중 기존 캐시 데이터 호환 | mbid NULL 허용 컬럼 → 점진적 채움 |
