# Plan: artist-page

## Executive Summary

| 관점 | 내용 |
|------|------|
| Problem | 트랙리스트에 아티스트명만 있고 아티스트 정보·사진이 없어 음악 탐색 깊이가 얕음 |
| Solution | Last.fm API로 아티스트 사진·바이오를 가져와 캐싱하고, 아티스트 전용 페이지와 트랙리스트 하단 카드를 신설 |
| Functional UX Effect | 플리 감상 중 아티스트 카드 → 클릭 → 아티스트 페이지(사진+바이오+출연플리) / 검색에서 아티스트 섹션 별도 노출 |
| Core Value | 플리 단위 탐색에서 아티스트 단위 탐색으로 확장, 콘텐츠 체류 시간 증가 |

## Context Anchor

| 항목 | 내용 |
|------|------|
| WHY | 트랙명·아티스트명은 있지만 클릭 가능한 아티스트 정보가 없어 탐색이 단절됨 |
| WHO | 특정 아티스트 팬 / 새 아티스트를 발견하고 싶은 사용자 |
| RISK | Last.fm API 이미지 품질 편차, 아티스트명 정규화 실패(오타·피처링 표기 등) |
| SUCCESS | 트랙리스트 하단 아티스트 카드 노출 / 아티스트 페이지 접근 / 검색에서 아티스트 섹션 표시 |
| SCOPE | DB 1개 테이블, API 라우트 1개, 신규 페이지 1개, 기존 페이지 2개 수정 |

## 1. 현재 구조

### 1.1 관련 데이터
- `tracks.artist` — `string | null` 평문 텍스트 (예: "Laufey", "Frank Ocean ft. ...")
- 검색(`SearchOverlay`)은 이미 `tracks.artist` ilike 검색 지원, 단 결과는 플리만 노출
- `PlaylistDetailPage`: PlaylistPlayer(TrackList 포함) → 태그 → 액션 → 댓글 순

### 1.2 아티스트명 정규화 문제
`tracks.artist`는 비정형 텍스트이므로 API 조회 전 정규화 필요:
- 소문자 trim
- "ft.", "feat.", "featuring", "x", "&" 앞 부분만 사용 (메인 아티스트 추출)
- URL slug: 공백→하이픈, 특수문자 제거

## 2. 외부 API

### Last.fm (선택)
- **인증**: API Key 발급 필요 (무료, 즉시 발급)
- **엔드포인트**: `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist={name}&api_key={key}&format=json`
- **제공 데이터**: `image[]`(small~mega), `bio.content`, `bio.summary`, `tags`, `stats.listeners`
- **Rate Limit**: 무료 5req/sec

### 캐싱 전략
- Supabase `artists` 테이블에 저장
- `cached_at` 기준 **7일** 이후 stale → 재요청
- 404 (아티스트 미발견) → `not_found: true` 저장, 재시도 없음

## 3. 요구사항

### 3.1 기능 요구사항

**FR-01: DB — artists 테이블 신설**
```sql
create table artists (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,           -- 원본 표기
  slug       text not null unique,    -- 정규화된 URL 키
  image_url  text,                    -- Last.fm 이미지
  bio_en     text,                    -- Last.fm bio.summary
  listeners  integer,
  not_found  boolean default false,   -- API 결과 없음
  cached_at  timestamptz default now(),
  created_at timestamptz default now()
);
create index on artists (slug);
```

**FR-02: API Route — /api/artists/[slug]**
- GET: Supabase 캐시 확인 → stale이면 Last.fm 재요청 → 응답
- 아티스트명 → slug 변환 로직 포함

**FR-03: 아티스트 카드 (트랙리스트 하단)**
- 위치: `PlaylistDetailPage`의 `<PlaylistPlayer>` 내부 TrackList 바로 아래
- 내용: 아티스트 썸네일(원형) + 이름 + "아티스트 보기 →" 링크
- 해당 플리 트랙의 고유 아티스트 추출 (정규화 후 중복 제거), 최대 5명
- `not_found` 아티스트는 카드 미표시

**FR-04: 아티스트 페이지 — /[locale]/artist/[slug]**
- 헤더: 아티스트 사진(대형) + 이름 + 리스너 수
- 바이오그래피: Last.fm bio.summary (HTML 태그 strip)
- 출연 플리 목록: `tracks` 테이블에서 해당 slug 아티스트 포함 플리 조회 → PlaylistCard 그리드

**FR-05: 검색 — 아티스트 섹션 추가**
- `SearchOverlay`에서 아티스트 ilike 검색 결과를 별도 섹션으로 노출
- 아티스트 섹션: 썸네일 + 이름 → 클릭 시 `/artist/[slug]` 이동
- 최대 3명 노출

### 3.2 비기능 요구사항
- Last.fm API Key: `.env.local`에 `LASTFM_API_KEY` 추가
- 서버 컴포넌트에서만 Last.fm 직접 호출 (API Key 노출 방지)
- Next.js Image domains에 Last.fm 이미지 도메인 추가 (`lastfm.freetls.fastly.net`)

## 4. 구현 범위

### 신규 파일
| 파일 | 역할 |
|------|------|
| `src/lib/lastfm.ts` | Last.fm API 클라이언트 + 아티스트명 정규화 |
| `src/app/api/artists/[slug]/route.ts` | 캐시 확인·갱신 API |
| `src/app/[locale]/artist/[slug]/page.tsx` | 아티스트 상세 페이지 |
| `src/features/artist/components/ArtistCard.tsx` | 트랙리스트 하단 소형 카드 |
| `src/features/artist/components/ArtistStrip.tsx` | 플리 내 아티스트 카드 행 컨테이너 |

### 수정 파일
| 파일 | 변경 내용 |
|------|----------|
| `src/app/[locale]/playlist/[id]/page.tsx` | PlaylistPlayer 내 TrackList 하단에 ArtistStrip 삽입 |
| `src/components/ui/SearchOverlay.tsx` | 아티스트 검색 섹션 추가 |
| `next.config.js` (또는 `next.config.ts`) | Last.fm 이미지 도메인 허용 |
| Supabase migration | artists 테이블 생성 |

## 5. Success Criteria

| # | 기준 | 측정 |
|---|------|------|
| SC-01 | 플리 상세 진입 시 트랙리스트 하단에 아티스트 카드 노출 | 시각적 확인 |
| SC-02 | 아티스트 카드 클릭 → `/artist/[slug]` 페이지 이동 | 내비게이션 확인 |
| SC-03 | 아티스트 페이지에 사진·바이오·출연 플리 노출 | 시각적 확인 |
| SC-04 | 검색에서 아티스트명 입력 시 아티스트 섹션 별도 표시 | 시각적 확인 |
| SC-05 | Supabase `artists` 테이블에 캐시 저장 확인 | DB 쿼리 확인 |
| SC-06 | `not_found` 아티스트 카드 미표시 | 엣지케이스 확인 |

## 6. 리스크

| 리스크 | 대응 |
|--------|------|
| 아티스트명 정규화 실패 | 피처링 파싱 실패 시 원본 그대로 조회, 실패하면 not_found 처리 |
| Last.fm 이미지 없음 | `not_found: true`면 카드 미표시, 이미지만 없으면 플레이스홀더 |
| API 키 미설정 | 환경변수 없으면 카드 렌더링 skip (에러 아님) |
| 느린 첫 로드 | 캐시 미스 시 서버 컴포넌트에서 Last.fm 호출 → 이후 7일 캐시 |
