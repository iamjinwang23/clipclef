# Feature Plan: home-redesign

## Executive Summary

| 관점 | 내용 |
|------|------|
| Problem | 홈이 '플레이리스트 그리드 + 필터'에 치우쳐 채널·아티스트·장르 탐색이 어렵고, 필터·소팅 UI가 1뎁스에 노출돼 큐레이션 브랜드 톤이 흐려짐 |
| Solution | 홈을 **큐레이션 → 채널 → 아티스트 → 장르 → 플레이리스트** 요약 섹션으로 재편, 각 섹션 우측 `자세히 보기 →`로 전체 리스팅 페이지 이전(`/channels`, `/artists`, `/genres`, `/playlists`). 필터/소팅/무한스크롤은 `/playlists`에서만 제공 |
| UX Effect | 홈은 '무엇이 있나' 둘러보기, 각 리스팅은 '깊게 파기'로 역할 분리 — 탐색 동선이 명확해지고 각 도메인 엔트리 포인트가 동등하게 보임 |
| Core Value | "알고리즘 없는 인간 큐레이션"의 면모를 4개 축(사람·아티스트·장르·플리)으로 균형 있게 노출 |

## Context Anchor

| | |
|--|--|
| WHY | 현 홈은 플리 그리드 중심이라 다른 엔티티 디스커버리가 낮고, 필터/소팅이 홈 1뎁스에 자리해 큐레이션 톤과 충돌 |
| WHO | 홈 방문자 전체 — 특히 재방문자(뭐 새로 있나 훑어보기) |
| RISK | 기존 홈의 필터/소팅/무한스크롤 로직을 `/playlists`로 이전하면서 기능 리그레션 가능성. 장르 테이블 신설 + 마이그레이션 + admin UI 범위 큼. 아티스트 집계 쿼리 성능 |
| SUCCESS | 홈 5개 섹션이 각 레이블 + `자세히 보기 →`로 구성되고 전체 리스팅 페이지가 모두 존재, 장르 테이블·admin 관리·상세 페이지 동작, 홈 플리 섹션은 Top 12로 축소 |
| SCOPE | 홈 재구성 + 리스팅 4종 페이지 + 장르 도메인(테이블·admin·상세) 신설 + 홈 섹션 레이블 공용 컴포넌트 |

## 1. 요구사항

### 1.1 홈 페이지 재구성

홈(`/`)에 다음 섹션을 순차 노출. 각 섹션은 **상단 레이블**(`text-xl font-semibold leading-snug` — 플리 상세 제목 스타일) + **우측 `자세히 보기 →`** CTA로 구성.

| # | 섹션 | 노출 개수 | 카드 타입 | 자세히 보기 → |
|---|------|:---------:|-----------|--------------|
| 1 | 큐레이션 | 현행 (캐러셀) | 기존 CuratedCollectionSection | (기존 `/collection/[id]` 진입) |
| 2 | 채널 | **10** | `ChannelStoriesBar` 아이템 (80px 원형) | `/channels` |
| 3 | 아티스트 | **8** | 원형 카드, 채널보다 살짝 큼 (**96px**) | `/artists` |
| 4 | 장르 | **8** | 정방형 레이어드 카드 (앨범 스택) | `/genres` |
| 5 | 플레이리스트 | **12** | `PlaylistCard` | `/playlists` |

- 홈에서 **FilterBar·SortSelect·무한스크롤 제거** — `/playlists`에서만 제공
- 홈 플리 섹션 정렬: 인기순(like_count desc) 단순 정렬

### 1.2 섹션 레이블 공용 컴포넌트

신규 `HomeSection` (또는 `SectionHeader`) 컴포넌트:

```tsx
<section>
  <div className="flex items-baseline justify-between mb-4">
    <h2 className="text-xl font-semibold leading-snug">{label}</h2>
    {href && (
      <Link href={href} className="text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)]">
        자세히 보기 →
      </Link>
    )}
  </div>
  {children}
</section>
```

### 1.3 전체 리스팅 페이지

#### 1.3.1 `/channels` — 채널 전체 목록

- 레이아웃: **검색 결과의 채널 행과 동일** (`[ChannelAvatar] 채널명 / 플레이리스트 N개`)
- 정렬: 홈 채널 레일과 동일한 로그 정규화 인기 점수
- 페이지네이션 또는 단순 전체 표시(현재 데이터 규모가 작아 전체로 시작)

#### 1.3.2 `/artists` — 아티스트 전체 목록

- 레이아웃: `ArtistCard` 그리드 (80~96px 원형, 2열 / 3~4열 반응형)
- 정렬: 포함 플리 수 × 1.0 + 신규(최근 30일 내 플리에 포함) × 0.5 (로그 정규화 or 단순)

#### 1.3.3 `/genres` — 장르 전체 목록

- 레이아웃: 장르 카드 그리드 (앨범 스택 스타일)
- 정렬: 해당 장르를 가진 플리 수 + 신규(최근 30일 플리 수) 보너스
- 클릭 시 `/genres/{name}` 상세로 이동

#### 1.3.4 `/playlists` — 플레이리스트 전체 목록

- 레이아웃: 기존 홈 그리드 이전
- **필터바(장르·분위기·장소·시대·채널 필터) + 소팅(최신/인기/조회) + 무한스크롤** 전부 이동
- 홈에는 존재하지 않음 — 전적으로 이 페이지 책임

### 1.4 장르 도메인 신설

#### 1.4.1 DB 테이블 `genres`

```sql
CREATE TABLE genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  thumbnail_url TEXT,
  position INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON genres (position);
```

마이그레이션 시 기존 `GENRE_OPTIONS` 상수를 seed:
```sql
INSERT INTO genres (name, position) VALUES
  ('Pop', 1), ('Hip-hop', 2), ('Jazz', 3), ...;
```

`GENRE_OPTIONS` 상수는 유지 (플리 태그 선택 UI용). DB는 썸네일·순서 관리용.

#### 1.4.2 Admin 장르 관리

관리자 탭 `큐레이션 관리` 옆에 `장르 관리` 탭 추가 (또는 `필터 관리` 자리 대체):
- 장르 목록 조회
- 썸네일 업로드 (`curated_collections`와 동일 스토리지 패턴 재사용 — Supabase Storage)
- position 수정 (드래그 또는 입력)
- is_active 토글

#### 1.4.3 `/genres/{name}` 장르 상세 페이지

- 헤더: 장르 썸네일(큰 정방형 or 배너형) + 장르명 (채널 상세와 유사한 스타일, Spotify-like 그라데이션 재사용)
- 본문: 해당 장르를 포함한 플리 그리드 (`PlaylistCard`)
- 정렬: 인기순(like_count desc) 또는 최신순 — 기본 인기순

### 1.5 아티스트 섹션 데이터 소스

- 기존 `artists` 테이블 + `tracks` 테이블 조인
- 집계: 각 `artists.slug`에 대해 `tracks.artist ILIKE` 매칭되는 `playlist_id distinct count` = `playlist_count`
  - 실제 구현은 `tracks.artist` 문자열 정규화 후 집계(artist slug와 매칭)
- 점수: `log(1 + playlist_count) × 1.0 + recency_bonus`
- `not_found=true`, `image_url IS NULL` 인 아티스트는 제외(또는 initial만)

### 1.6 장르 카드 디자인 (앨범 레이어드)

```
     ┌─────┐
    ┌─────┐│    (뒤쪽 레이어 2개가 살짝 offset)
   ┌─────┐││
   │     │││
   │ 썸  │┘
   │ 네  │
   │ 일  │
   │     │
   └─────┘
     Jazz
     12
```

- 정방형 이미지 썸네일
- 뒤쪽에 2개 레이어 살짝 겹치게 (rotate·translate·opacity로 앨범 스택 느낌)
- 하단 장르명 + 플리 개수

### 1.7 `자세히 보기 →` 링크 규칙

- 모든 섹션에 일관된 스타일·위치
- `text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)]`
- 데이터 0건인 섹션은 섹션 자체 숨김 (자세히 보기도 숨김)

## 2. 파일 목록

### 2.1 신규

| 파일 | 내용 |
|------|------|
| `src/components/layout/HomeSection.tsx` | 섹션 레이블 + 자세히 보기 CTA 공용 컴포넌트 |
| `src/app/[locale]/channels/page.tsx` | 전체 채널 목록 페이지 |
| `src/app/[locale]/artists/page.tsx` | 전체 아티스트 목록 페이지 |
| `src/app/[locale]/genres/page.tsx` | 전체 장르 목록 페이지 |
| `src/app/[locale]/genres/[name]/page.tsx` | 장르 상세 페이지 |
| `src/app/[locale]/playlists/page.tsx` | 전체 플리 목록 (필터+소팅+무한스크롤) |
| `src/features/artist/hooks/usePopularArtists.ts` | 인기 아티스트 집계 훅 |
| `src/features/artist/components/ArtistHomeSection.tsx` | 홈용 아티스트 섹션 |
| `src/features/genre/hooks/useGenres.ts` | 장르 목록 조회 훅 |
| `src/features/genre/components/GenreCard.tsx` | 앨범 레이어드 장르 카드 |
| `src/features/genre/components/GenreHomeSection.tsx` | 홈용 장르 섹션 |
| `src/features/genre/components/GenreHero.tsx` | /genres/{name} 상단 헤더 |
| `src/features/admin/components/GenreManager.tsx` | admin 장르 관리 |
| `src/app/api/genres/route.ts` | 장르 목록 API (public) |
| `src/app/api/admin/genres/route.ts` | 장르 admin CRUD API |
| `supabase/migrations/0XX_genres.sql` | genres 테이블 + seed |

### 2.2 수정

| 파일 | 변경 |
|------|------|
| `src/app/[locale]/page.tsx` | 홈 재구성 — 5개 섹션 배치, FilterBar/PlaylistGrid 제거 |
| `src/features/playlist/components/ChannelStoriesBar.tsx` | 홈 모드에서 Top 10으로 축소 (prop `limit` 추가 or 별도 래퍼) |
| `src/features/playlist/components/PlaylistGrid.tsx` | `/playlists`로 이동 — 변경 최소 |
| `src/features/admin/components/AdminContent.tsx` | `필터 관리` 탭을 `장르 관리`로 대체 |
| `src/types/index.ts` | `Genre` 인터페이스 추가 (id, name, thumbnail_url, position, is_active) |

## 3. Success Criteria

1. 홈(`/`) 이 큐레이션 → 채널 → 아티스트 → 장르 → 플레이리스트 순 섹션으로 구성됨
2. 각 섹션에 플리 상세 제목 스타일(`text-xl font-semibold`) 레이블 + 우측 `자세히 보기 →` 노출
3. 홈에 FilterBar·Sort·무한스크롤이 **없음**
4. 홈 섹션 노출 개수: 채널 10 · 아티스트 8 · 장르 8 · 플리 12
5. `/channels` — 검색 결과 목록형 스타일로 전체 채널 노출 (인기 점수 정렬)
6. `/artists` — 아티스트 카드 그리드 (포함 플리 수 + 신규 점수 정렬)
7. `/genres` — 장르 앨범 레이어드 카드 그리드 (플리 수 + 신규 정렬)
8. `/genres/{name}` — 장르 헤더 + 해당 장르 플리 그리드
9. `/playlists` — 필터바 + 소팅 + 무한스크롤 포함된 기존 홈 그리드 이전
10. `genres` 테이블 생성 + GENRE_OPTIONS seed 마이그레이션 적용
11. Admin에 `장르 관리` 탭 — 썸네일 업로드 + position 편집 + is_active 토글
12. 장르 카드는 앨범 레이어드 스타일 (뒤쪽 2개 레이어 offset, 정방형 썸네일)
13. 아티스트 카드는 96px 원형(채널 80px보다 큼)
14. 데이터 0건 섹션은 자체 숨김 (자세히 보기도 숨김)

## 4. Out of Scope

- i18n (`/en/...`) 영문 콘텐츠
- 장르 다국어 이름
- 장르·아티스트별 RSS / 알림
- 장르·아티스트 팔로우 기능
- `/playlists` 페이지의 URL 파라미터 공유(?filter=...) — 추후 확장
- 기존 `/collection/[id]` 페이지 변경
- 장르 카드 호버 애니메이션 세부

## 5. Risks & Mitigations

| 위험 | 완화 |
|------|------|
| `/playlists` 이전 시 기존 홈의 filterStore/usePlaylists 의존이 라우팅 따라 동작이 달라질 수 있음 | `/playlists` 도 같은 스토어 사용, 다른 라우트에서 FilterBar 렌더 안 하도록 확인 |
| 아티스트 집계 쿼리 비용 | 초기엔 클라이언트 집계(트랙 전체 읽기 후 distinct) — 작은 규모에서 OK. 추후 RPC로 이관 |
| 장르 썸네일 업로드 UI 공수 | 기존 `curated_collections` 의 배너 이미지 업로드 패턴 복사 — 유사 컴포넌트 재사용 |
| 장르 마이그레이션 rollback | seed INSERT만 하므로 rollback은 `DROP TABLE genres`로 간단 |
| 홈 리팩터 시 큐레이션 배너 동작 영향 | 배너 컴포넌트는 그대로 두고 주변 래퍼만 재배치 |
| 홈에서 필터 제거 시 기존 사용자의 바운스 | `/playlists` 버튼을 눈에 띄게(자세히 보기) + 필터 원하는 사용자는 한 번 클릭 |

## 6. Implementation — 모듈 분할 (권장 세션 단위)

이 피처는 범위가 커서 Design 단계에서 모듈로 세분화하는 것을 권장.

| Module | 내용 | 선행 |
|--------|------|------|
| **M1: 섹션 공용 컴포넌트 + 홈 재배치 (핵심)** | `HomeSection` 컴포넌트, 홈 페이지 스켈레톤 (큐레이션·채널·플리만, 아티스트/장르는 placeholder) | — |
| **M2: `/playlists` 전체 페이지** | 현재 홈 그리드+필터바+소팅+무한스크롤을 그대로 이전 | M1 |
| **M3: `/channels` 전체 페이지** | 검색 결과 채널 행 스타일 재사용 | M1 |
| **M4: 아티스트 섹션 + `/artists`** | `usePopularArtists`, `ArtistHomeSection`, `/artists` 페이지 | M1 |
| **M5: 장르 도메인 (가장 큰)** | 마이그레이션 + `/api/genres` + `GenreCard` + `/genres` + `/genres/{name}` + admin UI | M1 |
| **M6: 정리** | 홈 placeholder 제거, 데이터 0건 상태 테스트, 어세시빌리티 점검 | M1~M5 |

## 7. Open Questions

- `/playlists` 페이지의 타이틀/헤더: '전체 플레이리스트' / '플레이리스트' 어떤 문구? (이번 문서는 '전체 플레이리스트'로 가정)
- 장르 상세 헤더에 채널처럼 색 추출 그라데이션 적용할지 — 썸네일이 장르 대표색이라 효과 클 듯 (추천)
- 홈 큐레이션 배너 위에 별도 섹션 레이블(`큐레이션`)을 붙일지, 아니면 배너 자체가 섹션처럼 동작하여 생략할지 (현재는 생략 권장 — 배너가 이미 큐레이션임을 말함)
- Admin 기존 `필터 관리` 탭(빈 placeholder)은 삭제 vs 보존 — 삭제 권장
