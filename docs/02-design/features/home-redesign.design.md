# home-redesign Design Document

> **Summary**: Home page restructured into 5 summary sections with "자세히 보기 →" links; filter/sort relocated to `/playlists`; new `genres` domain introduced (table + admin + list + detail).
>
> **Project**: ClipClef (youchoose)
> **Date**: 2026-04-19
> **Status**: Draft
> **Planning Doc**: [home-redesign.plan.md](../../01-plan/features/home-redesign.plan.md)
> **Architecture**: Option C — Pragmatic Balance

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 홈이 플리 그리드+필터 중심이라 채널·아티스트·장르 탐색 어려움, 큐레이션 브랜드 톤 흐림 |
| **WHO** | 홈 방문자 전체 — 특히 재방문자(새 콘텐츠 둘러보기) |
| **RISK** | 필터/소팅/무한스크롤 로직 이전 리그레션 / 장르 도메인 신설 범위 큼 / 아티스트 집계 쿼리 비용 |
| **SUCCESS** | 홈 5개 섹션 + 자세히 보기 → + 4개 전체 리스팅 페이지 + 장르 도메인 전체 동작 |
| **SCOPE** | M1 홈 스켈레톤 → M2 /playlists → M3 /channels → M4 아티스트 → M5 장르(최대) → M6 정리 |

---

## 1. Overview

### 1.1 Design Goals

- **도메인 균형 노출**: 큐레이션·채널·아티스트·장르·플레이리스트 — 홈에서 각 도메인 엔트리 포인트가 동등
- **역할 분리**: 홈 = 둘러보기 요약 / 리스팅 페이지 = 깊게 파기 (필터·소팅·페이지네이션)
- **브랜드 일관성**: 섹션 레이블 = 플리 상세 제목과 동일 폰트/사이즈, "자세히 보기 →" 한 문구로 통일
- **점진적 확장**: 클라이언트 집계로 시작 → 데이터 규모 커지면 RPC/MV 이관 가능한 경로 확보

### 1.2 Design Principles

- **공용 섹션 래퍼**: `HomeSection` 하나로 레이블 + CTA 구성, 모든 섹션이 동일 규칙 따름
- **도메인 주권**: 각 도메인(channel/artist/genre/playlist)은 자체 폴더 내에서 hook/component/section 완결
- **홈 = 오케스트레이터**: `/page.tsx`는 섹션 컴포넌트만 순서대로 렌더, 데이터 페칭 책임 없음
- **데이터 페칭 전략**: 현재 규모에서 React Query 1시간 staleTime + 클라 집계로 충분, RPC는 데이터 10x 성장 시점에 이관
- **진입점 vs 필터**: 채널/아티스트/장르 카드 클릭은 **해당 상세 페이지**로 이동 (홈 필터가 아님)

---

## 2. Module Map

| Module | 역할 | 선행 |
|--------|------|------|
| **M1 홈 스켈레톤** | `HomeSection` 공용 컴포넌트 + 홈 5섹션 레이아웃 (아티스트·장르는 placeholder) | — |
| **M2 `/playlists`** | 홈의 FilterBar + Sort + PlaylistGrid + 무한스크롤 전체 이전 | M1 |
| **M3 `/channels`** | 검색 결과 채널 행 스타일 재사용한 전체 채널 목록 | M1 |
| **M4 아티스트** | `usePopularArtists` 훅 + `ArtistHomeSection` + `/artists` 페이지 | M1 |
| **M5 장르** | 마이그레이션 + `/api/genres` + `GenreCard` + `/genres` + `/genres/[name]` + admin UI | M1 |
| **M6 정리** | 홈 placeholder 제거 + 실환경 확인 + 접근성 점검 | M1~M5 |

---

## 3. Data Model

### 3.1 신규 테이블: `genres`

```sql
CREATE TABLE genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,              -- e.g. 'Jazz', 'Hip-hop'
  thumbnail_url TEXT,                     -- admin 업로드 (nullable)
  position INT NOT NULL DEFAULT 0,        -- 수동 정렬 (admin 조절)
  is_active BOOLEAN NOT NULL DEFAULT TRUE,-- 숨김 토글
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON genres (position) WHERE is_active;
CREATE INDEX ON genres (name);

-- RLS: public read (active only), admin write
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "genres_public_read" ON genres
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "genres_admin_all" ON genres
  FOR ALL USING (auth.uid() IN (SELECT id FROM admins));  -- 실제는 app 관리자 체크
```

**Seed** (기존 `GENRE_OPTIONS` 상수 기반):
```sql
INSERT INTO genres (name, position) VALUES
  ('Pop', 1), ('Hip-hop', 2), ('Jazz', 3), ('Classical', 4),
  ('Lo-fi', 5), ('K-pop', 6), ('R&B', 7), ('Electronic', 8),
  ('Rock', 9), ('Indie', 10), ('Soul', 11), ('기타', 12);
```

### 3.2 기존 테이블 활용

| 테이블 | 사용 목적 |
|--------|----------|
| `playlists` | `genre[]`, `channel_id`, `like_count`, `comment_count`, `view_count`, `created_at` — 홈 섹션 집계 전반 |
| `tracks` | `artist` 필드로 아티스트 섹션 집계 (playlist_id distinct) |
| `artists` | `slug`, `name`, `image_url`, `not_found` — 아티스트 카드 노출 대상 |
| `curated_collections` | 홈 큐레이션 배너 (기존) |

### 3.3 `Genre` 타입

```ts
// src/types/index.ts
export interface Genre {
  id: string;
  name: string;
  thumbnail_url: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
}
```

---

## 4. API / Query Contracts

### 4.1 `GET /api/genres` (public)

응답: `is_active = true` 장르 목록, `position asc`

```ts
// response shape
Array<{ id, name, thumbnail_url, position }>
```

각 장르의 플리 개수·신규 개수는 클라이언트에서 `useAllPlaylists` 데이터와 함께 집계하거나, 별도 `?withStats=true` 옵션으로 서버 집계 반환(향후). 초기엔 **클라 집계**.

### 4.2 `/api/admin/genres` (admin only)

- `POST` — 신규 장르 생성 `{ name, position }`
- `PATCH` `?id=...` — 업데이트 `{ thumbnail_url?, position?, is_active? }`
- `DELETE` `?id=...` — 삭제 (soft delete 대신 hard delete; 플리와 FK 없음)

### 4.3 `usePopularArtists` hook (클라 집계)

```ts
type PopularArtist = {
  slug: string;
  name: string;
  image_url: string | null;
  playlistCount: number;  // 이 아티스트가 등장한 플리 수 (distinct)
  new30Count: number;      // 최근 30일 내 플리 중 등장 횟수
};

function usePopularArtists(limit = 8): { data: PopularArtist[]; loading: boolean };
```

내부 동작:
1. `useAllPlaylists()` (이미 존재) — 전체 active 플리 + 트랙 가져오기
2. `artists` 테이블 (`not_found=false, image_url 존재`) 쿼리
3. 트랙별 `artist` 필드를 `slug` 정규화하여 매칭 후 `playlistCount` 집계
4. 점수: `log(1 + playlistCount) * 1.0 + new30Count * 0.5`
5. 정렬 후 `slice(limit)`

### 4.4 `useGenres` hook

```ts
function useGenres(): { data: Genre[]; loading: boolean };
```
- `/api/genres` fetch, staleTime 30분
- 추가 집계(플리 개수·신규) 필요하면 `useGenresWithStats` 로 확장

---

## 5. UI Spec

### 5.1 `HomeSection` 공용 컴포넌트

```tsx
interface HomeSectionProps {
  label: string;
  href?: string;        // "자세히 보기 →" 링크
  children: React.ReactNode;
}

export default function HomeSection({ label, href, children }: HomeSectionProps) {
  return (
    <section className="max-w-6xl mx-auto px-4 mt-10 first:mt-6">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xl font-semibold leading-snug text-[var(--foreground)]">
          {label}
        </h2>
        {href && (
          <Link
            href={href}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
          >
            자세히 보기 →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
```

### 5.2 홈 페이지 구성

```tsx
// src/app/[locale]/page.tsx
export default function HomePage() {
  const locale = ...;
  return (
    <div>
      <CuratedCollectionSection />  {/* 배너 — 레이블 없이 그대로 */}

      <HomeSection label="채널" href={`/${locale}/channels`}>
        <ChannelHomeSection limit={10} />
      </HomeSection>

      <HomeSection label="아티스트" href={`/${locale}/artists`}>
        <ArtistHomeSection limit={8} />
      </HomeSection>

      <HomeSection label="장르" href={`/${locale}/genres`}>
        <GenreHomeSection limit={8} />
      </HomeSection>

      <HomeSection label="플레이리스트" href={`/${locale}/playlists`}>
        <PlaylistHomeSection limit={12} />
      </HomeSection>
    </div>
  );
}
```

### 5.3 각 홈 섹션 상세

#### 5.3.1 `ChannelHomeSection`

- 기존 `ChannelStoriesBar` 재사용하되 `limit` prop 받아 `.slice(0, limit)` 적용
- 카드: 80px 원형 + 2줄 텍스트 (기존 동일)
- 수평 스크롤

#### 5.3.2 `ArtistHomeSection`

- `usePopularArtists(8)` 훅
- 카드: **96px 원형** + 2줄 텍스트 (채널보다 큼), `ArtistCard` 변형 (size prop 추가 또는 별도 컴포넌트)
- 수평 스크롤 (`flex gap-4 overflow-x-auto scrollbar-hide`)

#### 5.3.3 `GenreHomeSection`

- `useGenres()` + 플리 집계 (상위 8개)
- 카드: `GenreCard` (앨범 레이어드, 정방형 ~120-140px)
- 수평 스크롤

#### 5.3.4 `PlaylistHomeSection`

- 인기순 Top 12 (`like_count desc`)
- 레이아웃: 모바일 2열, 태블릿 3열, 데스크톱 4열 (기존 그리드 유지, 12개로 제한)
- 필터/소팅 없음 (이 섹션은 프리뷰)

### 5.4 `GenreCard` 디자인 (앨범 레이어드)

```
     ┌───────┐
    ┌───────┐│   rotate:-4deg, translate-y-1, opacity-40
   ┌───────┐││   rotate:-2deg, translate-y-0.5, opacity-60
   │       │┘│
   │  IMG  │ │   foreground
   │       │ │
   └───────┘ ┘

     Jazz
     플리 12개
```

구현:
```tsx
<Link href={`/${locale}/genres/${encodeURIComponent(name)}`} className="flex flex-col items-center gap-2 group w-32">
  <div className="relative w-32 h-32">
    {/* Layer 3 (뒤) */}
    <div className="absolute inset-0 rounded-md bg-[var(--muted)] rotate-[-4deg] translate-y-1 opacity-40" />
    {/* Layer 2 (중간) */}
    <div className="absolute inset-0 rounded-md bg-[var(--muted)] rotate-[-2deg] translate-y-0.5 opacity-60" />
    {/* Layer 1 (앞 — 실제 이미지) */}
    <div className="absolute inset-0 rounded-md overflow-hidden shadow-lg ring-1 ring-white/5 group-hover:ring-[var(--accent)] transition-all">
      {thumbnailUrl ? (
        <Image src={thumbnailUrl} alt={name} fill className="object-cover" sizes="128px" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[var(--subtle)] text-2xl font-bold text-[var(--text-secondary)]">
          {name.charAt(0)}
        </div>
      )}
    </div>
  </div>
  <div className="text-center">
    <p className="text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">{name}</p>
    <p className="text-xs text-[var(--text-secondary)]">플레이리스트 {count}개</p>
  </div>
</Link>
```

### 5.5 `/channels` 페이지

- 레이아웃: 검색 결과 채널 행 재사용 (헤더 + divider 목록)
- 상단 헤더: `h1 text-2xl font-bold` "채널"
- 정렬: `useChannelStories(allPlaylists)` 기본 반환(Top 20) 사용, 하지만 limit 확대 (예: 전체)
  - `useChannelStories`에 `limit?` 파라미터 추가 (기본 20, `/channels`에선 `undefined` = 전체)
- 반응형: 모바일 1열, 태블릿 2열, 데스크톱 3열 그리드 또는 목록형 (Plan: 목록형)

### 5.6 `/artists` 페이지

- 레이아웃: `ArtistCard` 그리드 (2/3/4/5 열 반응형)
- 상단 헤더: "아티스트"
- 정렬: `usePopularArtists(100)` (limit 확대)

### 5.7 `/genres` 페이지

- 레이아웃: `GenreCard` 그리드 (2/3/4 열)
- 정렬: 플리 수 + 신규
- 상단 헤더: "장르"

### 5.8 `/genres/[name]` 장르 상세

- 헤더: 장르 이름(text-4xl/sm:text-6xl font-black) + 썸네일 + 그라데이션 배경(채널 상세의 `extractVibrantColor` 패턴 재사용) + 플리 개수
- 본문: 해당 장르 포함 플리 그리드 (`PlaylistCard`)
- 정렬: 기본 인기순

### 5.9 `/playlists` 페이지

- 레이아웃: 기존 홈 구조 복제
  - 상단 FilterBar (유지)
  - 그리드 (PlaylistGrid)
  - 무한스크롤
- 상단 헤더: "전체 플레이리스트" (작은 `h1 text-xl font-semibold` 정도)

### 5.10 Admin 장르 관리

`AdminContent.tsx` 탭 구성 변경:
- `필터 관리` (placeholder) → `장르 관리` 로 대체 (또는 추가 탭)
- 컴포넌트: `GenreManager.tsx`
- 기능:
  - 목록 (position 순)
  - 새 장르 추가 (name 입력)
  - position 수정 (위/아래 버튼 또는 숫자 입력)
  - 썸네일 업로드 (Supabase Storage — 기존 collection banner 패턴 복사)
  - is_active 토글
  - 삭제

---

## 6. State & Navigation

| State | 위치 | 내용 |
|-------|------|------|
| `filterStore` | zustand (기존) | `/playlists`에서만 사용. 홈은 접근 안 함 |
| URL `?q`, `?genre` | `/playlists`, `/genres/[name]` | 필요 시 future work |
| `genres` | React Query `['genres']` | 30분 staleTime |
| `allPlaylists` | React Query `['all-playlists']` | 1시간 staleTime (채널/아티스트/장르 집계에 공유) |

**Navigation**:
- 홈 섹션 카드 → 각 상세 (`/channel/{id}`, `/artist/{slug}`, `/genres/{name}`, `/playlist/{id}`)
- 홈 `자세히 보기 →` → 리스팅 페이지
- 리스팅 페이지 내 카드 → 상세

---

## 7. Error Handling

| 상황 | 동작 |
|------|------|
| 장르 API 실패 | 장르 섹션 hide + 자세히 보기 hide (빈 배열 반환) |
| 아티스트 집계 실패 | 아티스트 섹션 hide |
| 썸네일 없음 | 장르 카드: 이름 첫 글자 placeholder + bg-[var(--subtle)] |
| 장르 상세 404 | `notFound()` |
| `/playlists` 필터 결과 0건 | 기존 empty state 유지 |

---

## 8. Test Plan

### 8.1 수동 시나리오

1. 홈 첫 화면: 5개 섹션 순서대로 렌더, 각 섹션 레이블 + `자세히 보기 →`
2. 채널 카드 탭 → `/channel/{id}` 이동
3. 아티스트 카드 탭 → `/artist/{slug}` 이동
4. 장르 카드 탭 → `/genres/{name}` 이동
5. 플리 카드 탭 → `/playlist/{id}` 이동
6. `/playlists` 에서 FilterBar + 정렬 + 무한스크롤 동작
7. `/genres` 그리드 정상, 각 장르 클릭 → 상세 이동
8. `/genres/[name]` 헤더 + 플리 그리드
9. Admin → 장르 관리 → 신규 추가 / 썸네일 업로드 / position 변경 → 홈 반영
10. is_active=false 장르 → 홈·`/genres`에서 숨김

### 8.2 회귀 체크

- 기존 플리 상세, 채널 상세, 아티스트 상세, 검색 결과, 컬렉션 배너 동작 유지
- filterStore 상태가 페이지 전환 시 잔류하지 않음

---

## 9. Acceptance Criteria (Plan SC 맵핑)

| Plan SC | Design §§ |
|---------|-----------|
| 1. 홈 5개 섹션 순서 | §5.2 |
| 2. 레이블 + 자세히 보기 | §5.1, §5.2 |
| 3. 홈에 FilterBar/Sort/무한스크롤 없음 | §5.2, §5.9 (이전처) |
| 4. 홈 노출 개수 10/8/8/12 | §5.3 |
| 5. `/channels` 검색 결과 스타일 | §5.5 |
| 6. `/artists` 점수 정렬 | §4.3, §5.6 |
| 7. `/genres` 앨범 카드 | §5.4, §5.7 |
| 8. `/genres/[name]` 헤더 + 그리드 | §5.8 |
| 9. `/playlists` FilterBar 이전 | §5.9 |
| 10. genres 테이블 + seed | §3.1 |
| 11. Admin 장르 관리 | §5.10 |
| 12. 장르 앨범 레이어드 카드 | §5.4 |
| 13. 아티스트 카드 96px | §5.3.2 |
| 14. 빈 섹션 숨김 | §7 |

---

## 10. Trade-offs & Alternatives

| 결정 | 대안 | 채택 이유 |
|------|------|-----------|
| 클라 집계(아티스트/장르) | 서버 RPC/MV | 현재 데이터 규모에서 충분, 복잡도 감소 |
| `genres` 테이블 신설 | 상수 유지 + 정적 이미지 | admin 업데이트 유연성 확보 |
| `HomeSection` 공용 래퍼 | 각 섹션 인라인 레이블 | 스타일 일관성 + 자세히 보기 규칙 변경 용이 |
| URL 단순형 (`/channels` 등) | `/explore/*` 그룹 | 짧고 직관적, 추후 `/explore` 허브 필요 시 이전 가능 |
| 장르 카드 앨범 스택 | 단순 정방형 | 브랜드 톤("앨범 모음집 같은 감성")과 부합 |
| 클라이언트 필터링 X | 홈에서 장르 클릭 시 `/playlists?genre=` | 전용 상세 페이지가 그라데이션/대표이미지로 풍부함 |

---

## 11. Implementation Guide

### 11.1 구현 순서 (권장)

1. **M1 홈 스켈레톤**: `HomeSection` + 홈 페이지 재배치 (큐레이션/채널/플리 섹션만 — 아티스트·장르는 placeholder 노출)
2. **M2 `/playlists`**: 기존 홈의 FilterBar + PlaylistGrid 이전. 홈에서 PlaylistGrid/FilterBar 제거 완성
3. **M3 `/channels`**: `useChannelStories` limit 확장 + 검색 채널 행 재사용
4. **M4 아티스트**: `usePopularArtists` + `ArtistHomeSection` + `/artists` 페이지
5. **M5 장르 (대작업)**: 마이그레이션 → `/api/genres` → admin `GenreManager` → `GenreCard` → `/genres` 그리드 → `/genres/[name]` 상세
6. **M6 정리**: placeholder 제거, 회귀 테스트, 배포 전 점검

### 11.2 관련 파일

신규:
- `src/components/layout/HomeSection.tsx`
- `src/app/[locale]/channels/page.tsx`
- `src/app/[locale]/artists/page.tsx`
- `src/app/[locale]/genres/page.tsx`
- `src/app/[locale]/genres/[name]/page.tsx`
- `src/app/[locale]/playlists/page.tsx`
- `src/features/artist/hooks/usePopularArtists.ts`
- `src/features/home/components/ArtistHomeSection.tsx`
- `src/features/home/components/ChannelHomeSection.tsx`
- `src/features/home/components/GenreHomeSection.tsx`
- `src/features/home/components/PlaylistHomeSection.tsx`
- `src/features/genre/hooks/useGenres.ts`
- `src/features/genre/components/GenreCard.tsx`
- `src/features/genre/components/GenreHero.tsx`
- `src/features/admin/components/GenreManager.tsx`
- `src/app/api/genres/route.ts`
- `src/app/api/admin/genres/route.ts`
- `supabase/migrations/0XX_genres.sql`

수정:
- `src/app/[locale]/page.tsx` — 오케스트레이터로 축소
- `src/features/playlist/components/ChannelStoriesBar.tsx` — `limit` prop
- `src/features/playlist/hooks/useChannelStories.ts` — `limit` 파라미터
- `src/features/admin/components/AdminContent.tsx` — 장르 관리 탭 추가
- `src/types/index.ts` — `Genre` 인터페이스

### 11.3 Session Guide (권장 세션 분할)

| Session | Modules | 예상 규모 | 목적 |
|---------|---------|-----------|------|
| **session-1** | M1 | 신규 1 + 수정 2 / ~250 LOC | 홈 스켈레톤 + `HomeSection` |
| **session-2** | M2 | 신규 1 + 수정 1-2 / ~200 LOC | `/playlists` 이전 |
| **session-3** | M3 | 신규 1 + 수정 1 / ~150 LOC | `/channels` |
| **session-4** | M4 | 신규 3 / ~250 LOC | 아티스트 섹션 + 페이지 |
| **session-5** | M5 | 신규 8 + 수정 1 / ~500 LOC + SQL | 장르 도메인 (최대) |
| **session-6** | M6 | 점검 | 정리·검증 |

`/pdca do home-redesign --scope module-1` 식으로 분할 실행 가능.

---

## 12. Open Issues

- **홈 큐레이션 배너 레이블**: `HomeSection` 적용 대상인지 — 현재는 배너 자체가 섹션 역할이라 제외 권장. Session-1 시 사용자 확인.
- **Admin 필터 관리 탭 처리**: 삭제 vs 장르 관리로 대체 — 장르 관리로 대체 권장(별도 탭 추가 시 UI 밀집도 증가).
- **`/playlists` 타이틀 문구**: "전체 플레이리스트" 가정, 실제 배치 후 UX 확인.
- **장르 상세 썸네일 사이즈/배치**: 채널 상세 mobile(176px 원형)에 비해 장르는 정방형이라 헤더 레이아웃 별도 검토 필요. Session-5 시 결정.
- **아티스트 집계 캐시**: `useAllPlaylists`가 1시간 staleTime인데 플리 업로드 직후 반영 지연 가능 — 초기엔 허용.
