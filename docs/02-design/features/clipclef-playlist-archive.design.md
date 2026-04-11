# ClipClef Playlist Archive Design Document

> **Summary**: 유튜브 플레이리스트 큐레이션 아카이브 — DB 스키마, API, 컴포넌트 설계
>
> **Project**: clipclef
> **Version**: 0.1.0
> **Author**: jinwang
> **Date**: 2026-04-06
> **Status**: Draft
> **Planning Doc**: [clipclef-playlist-archive.plan.md](../01-plan/features/clipclef-playlist-archive.plan.md)

---

## Context Anchor

> Copied from Plan document. Ensures strategic context survives Design→Do handoff.

| Key | Value |
|-----|-------|
| **WHY** | 유튜브 플리는 분산되어 있어 분위기·장르별 탐색이 불가능하고, 좋은 플리를 발견하기 어렵다 |
| **WHO** | 음악 취향이 있는 일반 사용자 (탐색·반응) + 큐레이터 역할의 관리자 (등록·관리) |
| **RISK** | YouTube Data API quota 제한 (일 10,000 유닛), 관리자 인증 보안, 익명 스팸 댓글 |
| **SUCCESS** | 4종 필터(장르/분위기/장소/시대) + 3종 정렬, 트랙리스트·댓글·좋아요·컬렉션 전체 플로우 동작, 한/영 전환 |
| **SCOPE** | Phase 1: 아카이브+필터/정렬 / Phase 2: 소셜 로그인+댓글·좋아요·컬렉션 / Phase 3: Admin+i18n |

---

## 1. Overview

### 1.1 Design Goals

- YouTube Data API는 플리 등록 시 1회만 호출 후 Supabase에 캐시 → quota 절약
- `[locale]` dynamic segment로 한/영 URL prefix 분리 (`/ko/`, `/en/`)
- features/ 도메인 그룹으로 관심사 분리, 공용 UI는 `components/ui/`에 집중
- Supabase RLS로 DB 레벨 접근 제어, Admin role은 서버 사이드에서 검증

### 1.2 Design Principles

- **Server Component First**: 데이터 페칭은 Server Component, 인터랙션만 Client Component
- **Feature Cohesion**: 한 기능의 컴포넌트·훅·타입은 같은 `features/` 폴더에 유지
- **Single YouTube Call**: 플리 등록 시에만 YouTube API 호출, 이후 DB에서 읽기
- **RLS + Server Validation**: 보안은 DB(RLS) + 서버 middleware 이중 검증

---

## 2. Architecture

### 2.0 Architecture Comparison

| Criteria | Option A: Flat | Option B: Clean | Option C: Pragmatic |
|----------|:-:|:-:|:-:|
| **Approach** | 단순 flat 구조 | 4레이어 엄격 분리 | features/ 도메인 그룹 |
| **New Files** | ~30 | ~60 | ~45 |
| **Complexity** | Low | High | Medium |
| **Maintainability** | Low | High | High |
| **Effort** | Low | High | Medium |
| **Recommendation** | 프로토타입 | 엔터프라이즈 | **Dynamic 레벨 기본** |

**Selected**: Option C — Pragmatic Balance
**Rationale**: features/ 도메인 그룹으로 확장성 확보하면서 불필요한 추상 레이어 제거. i18n [locale] 라우팅과 Server Component 우선 패턴에 최적.

### 2.1 Component Diagram

```
Browser (Client)
    │
    ├── Next.js App Router ([locale]/...)
    │       │
    │       ├── Server Components ──→ Supabase (PostgreSQL + RLS)
    │       └── Client Components ──→ Supabase (realtime / auth)
    │
    └── API Routes (server-side only)
            ├── /api/youtube  ──→ YouTube Data API v3
            └── /api/auth/callback ──→ Supabase OAuth callback
```

### 2.2 Full Folder Structure

```
src/
├── app/
│   ├── [locale]/                       # i18n 라우트 (ko | en)
│   │   ├── layout.tsx                  # 루트 레이아웃 (Provider, Header, Footer)
│   │   ├── page.tsx                    # 목록 페이지
│   │   ├── playlist/
│   │   │   └── [id]/
│   │   │       └── page.tsx            # 플리 상세 페이지
│   │   ├── collection/
│   │   │   ├── page.tsx                # 큐레이션 컬렉션 목록
│   │   │   └── [id]/
│   │   │       └── page.tsx            # 큐레이션 컬렉션 상세
│   │   ├── me/
│   │   │   ├── profile/page.tsx        # 프로필 편집 (로그인 필요)
│   │   │   ├── likes/page.tsx          # 내 좋아요 목록
│   │   │   ├── comments/page.tsx       # 내 댓글 목록
│   │   │   └── playlists/page.tsx      # 내 재생목록 + YouTube 내보내기
│   │   └── admin/
│   │       ├── layout.tsx              # Admin 인증 가드
│   │       └── page.tsx                # 플리 관리 페이지
│   ├── api/
│   │   ├── youtube/
│   │   │   ├── route.ts                # YouTube URL 파싱 API
│   │   │   ├── channels/
│   │   │   │   └── route.ts            # 채널 ID 목록 → 프로필 이미지 URL (1h 캐시)
│   │   │   └── export/
│   │   │       └── route.ts            # YouTube 재생목록 내보내기 (OAuth provider_token)
│   │   ├── collections/
│   │   │   └── route.ts                # 큐레이션 컬렉션 목록 조회
│   │   ├── admin/
│   │   │   └── collections/
│   │   │       └── route.ts            # 큐레이션 컬렉션 관리 (Admin only)
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts            # Supabase OAuth callback
│   └── layout.tsx                      # Root layout (next-intl provider)
│
├── features/
│   ├── playlist/
│   │   ├── components/
│   │   │   ├── PlaylistCard.tsx         # 목록 카드 (썸네일+AI뱃지, 채널아바타, 제목, 좋아요수)
│   │   │   ├── PlaylistGrid.tsx         # 카드 그리드 레이아웃
│   │   │   ├── TrackList.tsx            # 트랙리스트 테이블
│   │   │   ├── ChannelStoriesBar.tsx    # 인스타그램 스토리 형식 채널 목록 (가로 스크롤)
│   │   │   └── ChannelAvatar.tsx        # 채널 프로필 이미지 (useChannelThumbnail 사용, 이니셜 fallback)
│   │   ├── hooks/
│   │   │   ├── usePlaylists.ts          # 목록 쿼리 (필터/정렬/채널ID 파라미터)
│   │   │   ├── usePlaylist.ts           # 단건 상세 쿼리
│   │   │   ├── useAllPlaylists.ts       # 채널 스토리 바 전용 — 필터 없이 전체 플리 조회
│   │   │   ├── useChannelStories.ts     # 플리에서 유니크 채널 추출 + 썸네일 fetching
│   │   │   └── useChannelThumbnail.ts   # 단일 채널 썸네일 조회 (1h 캐시)
│   │   └── types.ts
│   │
│   ├── filter/
│   │   ├── components/
│   │   │   ├── FilterBar.tsx            # 전체 필터 컨테이너 + 선택 필터 태그 행
│   │   │   ├── FilterChip.tsx           # 드롭다운 칩 (장르/분위기/장소/시대 공용)
│   │   │   ├── EraFilter.tsx            # 시대 필터 — FilterChip 래퍼 (드롭다운 형식)
│   │   │   └── SortSelect.tsx           # 정렬 드롭다운
│   │   └── store.ts                     # Zustand: 필터/정렬/채널ID 상태
│   │
│   ├── interaction/                     # 댓글 · 좋아요 · 컬렉션
│   │   ├── components/
│   │   │   ├── LikeButton.tsx
│   │   │   ├── CollectionButton.tsx     # 북마크 토글
│   │   │   ├── CommentList.tsx
│   │   │   └── CommentForm.tsx
│   │   └── hooks/
│   │       ├── useLike.ts
│   │       ├── useCollection.ts
│   │       └── useComments.ts
│   │
│   └── admin/
│       ├── components/
│       │   ├── AdminContent.tsx         # 클라이언트 래퍼 — 수정 대상 상태 관리
│       │   ├── PlaylistForm.tsx         # 등록/수정 겸용 폼 (AI 체크박스, editTarget prop)
│       │   └── PlaylistTable.tsx        # 등록된 플리 목록 / 수정 버튼 / 삭제 / AI뱃지
│       └── hooks/
│           └── useAdminPlaylists.ts     # createPlaylist, updatePlaylist, toggleActive, deletePlaylist, fetchTracks
│
├── components/
│   ├── ui/                              # 공용 원자 컴포넌트
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── Avatar.tsx
│   └── layout/
│       └── Header.tsx                   # SVG 로고, 로그인, 언어 토글
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                    # createBrowserClient
│   │   └── server.ts                    # createServerClient (cookies)
│   └── youtube.ts                       # YouTube API 헬퍼 함수
│
├── middleware.ts                         # next-intl locale redirect + admin guard
│
├── i18n/
│   ├── ko.json
│   └── en.json
│
└── types/
    └── index.ts                          # 공용 타입 정의
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| PlaylistGrid | usePlaylists, filter/store | 필터 상태를 쿼리 파라미터로 전달 |
| LikeButton / CollectionButton | Supabase Auth, useAuth | 로그인 상태 확인 후 토글 |
| FilterBar | filter/store (Zustand) | 필터 상태 읽기/쓰기 |
| /api/youtube route | YouTube Data API v3 | 서버에서만 API 키 사용 |
| Admin layout | Supabase server client | 서버에서 role 검증 |

---

## 3. Data Model

### 3.1 Entity Relationships

```
[profiles] 1 ──── N [comments]
    │                    │
    │              N ────┘ (on playlists)
    │
    ├── 1 ──── N [likes]      (user_id + playlist_id, unique)
    └── 1 ──── N [collections] (user_id + playlist_id, unique)

[playlists] 1 ──── N [tracks]
     │
     ├── 1 ──── N [likes]
     ├── 1 ──── N [collections]
     └── 1 ──── N [comments]
```

### 3.2 Database Schema (Supabase PostgreSQL)

```sql
-- 사용자 프로필 (Supabase Auth 연동)
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 플레이리스트 메타데이터
CREATE TABLE playlists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_id      TEXT NOT NULL UNIQUE,         -- YouTube 플리 ID
  title           TEXT NOT NULL,
  channel_name    TEXT NOT NULL,
  channel_id      TEXT NOT NULL,
  thumbnail_url   TEXT NOT NULL,
  description     TEXT,
  editor_note     TEXT,                          -- 관리자 에디터 노트 (홈 카드에 표시)
  track_count     INTEGER DEFAULT 0,
  view_count      BIGINT DEFAULT 0,             -- YouTube 조회수 (등록 시 캐시)
  like_count      INTEGER DEFAULT 0,            -- ClipClef 내 좋아요 수 (denormalized)
  genre           TEXT[],                        -- ['Pop', 'Jazz', ...]
  mood            TEXT[],                        -- ['Chill', 'Focus', ...]
  place           TEXT[],                        -- ['카페', '드라이브', ...]
  era             TEXT[],                        -- ['1990s', '2000s', ...]
  is_active       BOOLEAN DEFAULT TRUE,
  is_ai           BOOLEAN DEFAULT FALSE,         -- AI 생성 콘텐츠 뱃지 여부
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 큐레이션 컬렉션 (관리자가 플리를 묶어 홈에 캐러셀로 노출)
CREATE TABLE curated_collections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  position    INTEGER NOT NULL DEFAULT 0,        -- 캐러셀 노출 순서
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 큐레이션 컬렉션 ↔ 플리 연결
CREATE TABLE curated_collection_items (
  collection_id UUID NOT NULL REFERENCES curated_collections(id) ON DELETE CASCADE,
  playlist_id   UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, playlist_id)
);

-- 트랙리스트
CREATE TABLE tracks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id   UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL,              -- 순서 (1부터 시작)
  title         TEXT NOT NULL,
  artist        TEXT,
  duration_sec  INTEGER,                        -- 초 단위
  youtube_video_id TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 댓글
CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 좋아요 (유니크 제약으로 중복 방지)
CREATE TABLE likes (
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, playlist_id)
);

-- 컬렉션 (북마크)
CREATE TABLE collections (
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, playlist_id)
);

-- 인덱스
CREATE INDEX idx_playlists_genre ON playlists USING GIN (genre);
CREATE INDEX idx_playlists_mood  ON playlists USING GIN (mood);
CREATE INDEX idx_playlists_place ON playlists USING GIN (place);
CREATE INDEX idx_playlists_era   ON playlists USING GIN (era);
CREATE INDEX idx_tracks_playlist ON tracks (playlist_id, position);
CREATE INDEX idx_comments_playlist ON comments (playlist_id, created_at DESC);
```

### 3.3 RLS Policies

```sql
-- playlists: 모든 사용자 읽기 가능, 서버만 쓰기 (service role)
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "playlists_read_all" ON playlists FOR SELECT USING (is_active = TRUE);

-- comments: 모든 사용자 읽기, 로그인 사용자만 쓰기
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_read_all" ON comments FOR SELECT USING (TRUE);
CREATE POLICY "comments_insert_auth" ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete_own" ON comments FOR DELETE
  USING (auth.uid() = user_id);

-- likes, collections: 본인 데이터만 CRUD
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes_own" ON likes USING (auth.uid() = user_id);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collections_own" ON collections USING (auth.uid() = user_id);
```

### 3.4 TypeScript Types

```typescript
// types/index.ts

export interface Playlist {
  id: string;
  youtube_id: string;
  title: string;
  channel_name: string;
  channel_id: string;
  thumbnail_url: string;
  description: string | null;
  editor_note: string | null;    // 관리자 에디터 노트
  track_count: number;
  view_count: number;
  like_count: number;
  genre: string[];
  mood: string[];
  place: string[];
  era: string[];
  is_active: boolean;
  is_ai: boolean;                // AI 생성 콘텐츠 뱃지
  created_at: string;
}

export interface CuratedCollection {
  id: string;
  title: string;
  description: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
  items?: Playlist[];
}

export interface Track {
  id: string;
  playlist_id: string;
  position: number;
  title: string;
  artist: string | null;
  start_sec: number | null;      // 재생 시작 위치
  duration_sec: number | null;
  youtube_video_id: string | null;
}

export interface Comment {
  id: string;
  playlist_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: { display_name: string | null; avatar_url: string | null };
}

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface UserPlaylist {
  id: string;
  user_id: string;
  name: string;
  is_public: boolean;
  is_default: boolean;
  created_at: string;
}

export type SortOption = 'latest' | 'likes' | 'views';

export type FilterState = {
  genre: string[];
  mood: string[];
  place: string[];
  era: string[];
  sort: SortOption;
};

export const ERA_OPTIONS = [
  '1950s','1960s','1970s','1980s','1990s','2000s','2010s','2020s'
] as const;

export const GENRE_OPTIONS = [
  'Pop','Hip-hop','Jazz','Classical','Lo-fi','K-pop','R&B','Electronic','Rock','Indie'
] as const;

export const MOOD_OPTIONS = [
  'Chill','Energetic','Sad','Happy','Focus','Romantic','Melancholic','Hype'
] as const;

export const PLACE_OPTIONS = [
  '카페','드라이브','운동','공부','파티','수면','여행','산책'
] as const;
```

---

## 4. API Specification

### 4.1 Next.js API Routes (Server-side only)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/youtube` | YouTube 플리 URL 파싱 | Admin only |
| GET | `/api/youtube/channels` | 채널 ID → 프로필 이미지 URL (1h 캐시) | — |
| POST | `/api/youtube/export` | YouTube 재생목록 내보내기 (OAuth) | 로그인 필요 |
| GET | `/api/collections` | 큐레이션 컬렉션 목록 (홈 캐러셀용) | — |
| GET/POST/PATCH/DELETE | `/api/admin/collections` | 큐레이션 컬렉션 관리 | Admin only |
| GET | `/api/auth/callback` | Supabase OAuth callback | — |

### 4.2 `/api/youtube` — YouTube 플리 파싱

**Request:**
```json
POST /api/youtube
{
  "url": "https://www.youtube.com/playlist?list=PLxxxxxx"
}
```

**Response (200 OK):**
```json
{
  "youtube_id": "PLxxxxxx",
  "title": "Playlist Title",
  "channel_name": "Channel Name",
  "channel_id": "UCxxxxxx",
  "thumbnail_url": "https://i.ytimg.com/...",
  "description": "...",
  "view_count": 120000,
  "tracks": [
    {
      "position": 1,
      "title": "Track Title",
      "artist": "Artist Name",
      "duration_sec": 240,
      "youtube_video_id": "xxxxxx"
    }
  ]
}
```

**Error Responses:**
- `400` : URL 형식 오류 또는 YouTube ID 추출 실패
- `401` : Admin 아님
- `404` : YouTube에서 플리를 찾을 수 없음
- `429` : YouTube API quota 초과

### 4.3 Supabase DB 쿼리 패턴 (Client → Supabase Direct)

```typescript
// 목록 조회 (필터 + 정렬)
const query = supabase
  .from('playlists')
  .select('*')
  .eq('is_active', true);

if (filters.genre.length)  query.overlaps('genre', filters.genre);
if (filters.mood.length)   query.overlaps('mood', filters.mood);
if (filters.place.length)  query.overlaps('place', filters.place);
if (filters.era.length)    query.overlaps('era', filters.era);

if (sort === 'latest') query.order('created_at', { ascending: false });
if (sort === 'likes')  query.order('like_count', { ascending: false });
if (sort === 'views')  query.order('view_count', { ascending: false });

// 좋아요 토글 (upsert / delete)
// 컬렉션 토글 (upsert / delete)
// 댓글 목록 (profiles 조인)
const { data } = await supabase
  .from('comments')
  .select('*, profiles(display_name, avatar_url)')
  .eq('playlist_id', id)
  .order('created_at', { ascending: false });
```

---

## 5. UI/UX Design

### 5.1 Screen Layout

```
┌──────────────────────────────────────────────────────┐
│  Header: Logo | [검색창 pill]          [아바타 드롭다운] │
├──────────────────────────────────────────────────────┤
│  CuratedCollectionSection (캐러셀 카드)               │
│  ┌────────────────────┐ ┌────────────────────┐       │
│  │ 배경 썸네일          │ │ 배경 썸네일          │       │
│  │ 컬렉션 제목          │ │ 컬렉션 제목          │       │
│  └────────────────────┘ └────────────────────┘       │
│              ● ○ ○  (도트 인디케이터 하단 중앙)        │
├──────────────────────────────────────────────────────┤
│  ChannelStoriesBar (가로 스크롤)                      │
│  [ALL] [채널1] [채널2] [채널3] ...                    │
├──────────────────────────────────────────────────────┤
│  FilterBar:                                          │
│  [장르▾] [분위기▾] [장소▾] [시대▾]      정렬: [최신순▾] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐               │
│  │ 썸네일│ │ 썸네일│ │ 썸네일│ │ 썸네일│               │
│  │ 제목  │ │ 제목  │ │ 제목  │ │ 제목  │               │
│  │채널명 │ │채널명 │ │채널명 │ │채널명 │               │
│  │♥ 123 │ │♥  89 │ │♥  45 │ │♥  12 │               │
│  └──────┘ └──────┘ └──────┘ └──────┘               │
│                                                      │
└──────────────────────────────────────────────────────┘

상세 페이지:
┌─────────────────────────────────────────────┐
│  ← 목록으로                                  │
├─────────────────────────────────────────────┤
│  [YouTube 영상 플레이어 — 16:9]               │
├─────────────────────────────────────────────┤
│  제목 (AI 뱃지 옵션)                          │
│  채널 아바타 + 채널명 · 트랙 N개               │
│  에디터 노트 (italic blockquote, 있을 때만)   │
│  태그 (장르/분위기/장소/시대 rounded chips)    │
│  [♥ 좋아요] [담기] [내 목록] [YouTube에서 보기]│
├─────────────────────────────────────────────┤
│  트랙리스트                                  │
│   1. 트랙명 — 아티스트          3:45         │
│   2. 트랙명 — 아티스트          4:12         │
├─────────────────────────────────────────────┤
│  댓글                                        │
│  [댓글 작성 textarea + 등록 버튼]             │
│  Avatar  닉네임  날짜                         │
│  댓글 내용                                   │
└─────────────────────────────────────────────┘
```

### 5.2 User Flow

```
[비로그인]
Home(목록) → 필터/정렬 → PlaylistCard 클릭 → 상세(트랙리스트 확인, 댓글 읽기)
                                              → 좋아요/댓글 시도 → 로그인 모달 → Google 로그인 → 돌아오기

[로그인]
Home → 상세 → 좋아요 토글 / 댓글 작성 / 컬렉션 저장
Header [Collection] → /collection → 저장된 플리 목록

[관리자]
/admin (인증 체크) → YouTube URL 입력 → API 파싱 미리보기 → 태그 입력 → 등록
                  → 등록된 플리 목록 → 수정/삭제
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| Header | `components/layout/Header.tsx` | 로고, 검색창 (Zustand query), 로그인/아웃, 프로필 드롭다운 |
| CuratedCollectionSection | `features/playlist/components/CuratedCollectionSection.tsx` | 홈 큐레이션 컬렉션 캐러셀. 16:9 비율 full-width peek 레이아웃 (min(720px,78vw)). scroll 이벤트로 중심과 가장 가까운 카드 활성화 (scale-100/opacity-100). 무한 루프: displayItems=[last,...all,first], scrollend 시 클론 → 실제 카드 순간이동. 도트 인디케이터 하단 중앙 |
| PlaylistPlayer | `features/playlist/components/PlaylistPlayer.tsx` | YouTube IFrame API 플레이어 + 트랙리스트. children prop 슬롯: 영상과 트랙리스트 사이에 자유 콘텐츠 삽입 가능 |
| PlaylistCard | `features/playlist/components/PlaylistCard.tsx` | 썸네일+AI뱃지, 채널아바타+채널명, 제목, 좋아요수, 컬렉션 버튼 |
| PlaylistGrid | `features/playlist/components/PlaylistGrid.tsx` | 반응형 카드 그리드 |
| TrackList | `features/playlist/components/TrackList.tsx` | 트랙 순번/제목/아티스트/시간 테이블 |
| ChannelAvatar | `features/playlist/components/ChannelAvatar.tsx` | 채널 프로필 이미지. size prop. 로딩 전 이니셜 fallback |
| FilterBar | `features/filter/components/FilterBar.tsx` | 4종 필터 + 정렬 컨테이너. 선택된 필터 태그 행 (× 개별 삭제) |
| FilterChip | `features/filter/components/FilterChip.tsx` | 드롭다운 칩 (장르/분위기/장소/시대 공용). 칩 카운트 숫자 없음 |
| EraFilter | `features/filter/components/EraFilter.tsx` | FilterChip 래퍼 — 시대 드롭다운 (1950s~2020s) |
| SortSelect | `features/filter/components/SortSelect.tsx` | 최신순/좋아요순/조회수순 |
| ChannelStoriesBar | `features/playlist/components/ChannelStoriesBar.tsx` | 인스타그램 스토리 형식 채널 가로 스크롤. ALL + 채널 목록. 선택=그라디언트 보더, 미선택=회색 |
| LikeButton | `features/interaction/components/LikeButton.tsx` | 좋아요 토글 (optimistic update) |
| CollectionButton | `features/interaction/components/CollectionButton.tsx` | 컬렉션 북마크 토글 |
| CommentList | `features/interaction/components/CommentList.tsx` | 댓글 목록 |
| CommentForm | `features/interaction/components/CommentForm.tsx` | 댓글 입력 폼 |
| PlaylistForm | `features/admin/components/PlaylistForm.tsx` | URL 입력 + 파싱 미리보기 + AI 체크 + 태그 선택. editTarget prop으로 수정 모드 전환 |
| AdminContent | `features/admin/components/AdminContent.tsx` | 수정 대상 상태 관리. 수정 클릭 시 트랙 fetch + 폼 상단 스크롤 |
| LanguageToggle | `components/layout/Header.tsx` (inline) | KO / EN 전환 버튼 |

### 5.4 Page UI Checklist

#### 홈 (목록) 페이지 `/[locale]/`

- [x] 헤더 검색창 (pill 형태, Zustand query 상태 공유 → 플리 그리드 실시간 필터링)
- [x] 큐레이션 컬렉션 캐러셀 — 상단, 도트 인디케이터 하단 중앙, 카드 클릭 → 컬렉션 상세
- [x] 채널 스토리 바 — 큐레이션 캐러셀 아래. ALL + 채널 프로필 가로 스크롤. 선택=그라디언트 보더, 미선택=회색 보더
- [x] 필터 칩: 장르 드롭다운 (Pop, Hip-hop, Jazz, Classical, Lo-fi, K-pop, R&B, Electronic, Rock, Indie — 복수 선택)
- [x] 필터 칩: 분위기 드롭다운 (Chill, Energetic, Sad, Happy, Focus, Romantic, Melancholic, Hype — 복수 선택)
- [x] 필터 칩: 장소 드롭다운 (카페, 드라이브, 운동, 공부, 파티, 수면, 여행, 산책 — 복수 선택)
- [x] 필터 칩: 시대 드롭다운 (1950s~2020s — FilterChip 형식으로 통일, 드롭다운)
- [x] 선택된 필터 태그 행 — 선택 값이 1개 이상일 때 표시, 각 태그 × 버튼으로 개별 삭제
- [x] 정렬 드롭다운 (최신순 / 좋아요순 / 조회수순)
- [x] 활성 필터 리셋 버튼 (태그 행 우측)
- [x] 플레이리스트 카드 그리드 (반응형)
- [x] 카드: 썸네일 이미지 (클릭 → 상세)
- [x] 카드: 썸네일 좌상단 'AI' 뱃지 (is_ai=true인 경우, 보라색)
- [x] 카드: 제목 (최대 2줄)
- [x] 카드: 채널 프로필 이미지 + 채널명
- [ ] 카드: 좋아요수 (♥ N)
- [ ] 카드: 컬렉션 버튼 (저장/해제 토글, 로그인 필요)
- [ ] 결과 없음 상태 (필터 결과 0건)

#### 상세 페이지 `/[locale]/playlist/[id]`

레이아웃 순서: 뒤로가기 → 영상 → 제목/채널 → 에디터 노트 → 태그 → 액션 버튼 → 트랙리스트 → 댓글

- [x] 뒤로가기 버튼 (← 목록으로)
- [x] YouTube 플레이어 (IFrame API, 16:9 비율)
- [x] 제목 (AI 뱃지 포함)
- [x] 채널 프로필 이미지 + 채널명 + 트랙 수
- [x] 에디터 노트 (blockquote, italic, 있을 때만 표시)
- [x] 장르/분위기/장소/시대 태그 chips
- [x] 좋아요 버튼 (토글, 현재 수 표시, 로그인 필요)
- [x] 컬렉션 저장 버튼 (토글, 로그인 필요)
- [x] 내 목록에 담기 버튼 (로그인 필요)
- [x] YouTube에서 보기 버튼 (외부 링크)
- [x] 트랙리스트 테이블 (순번 / 제목 / 아티스트 / 재생시간, 클릭 시 seek)
- [x] 댓글 입력 textarea (로그인 필요, 비로그인 시 안내)
- [x] 댓글 등록 버튼
- [x] 댓글 목록 (아바타 / 닉네임 / 날짜 / 내용)
- [ ] 본인 댓글 삭제 버튼

#### 내 컬렉션 페이지 `/[locale]/collection`

- [ ] 로그인 guard (미로그인 시 리디렉트)
- [ ] 저장한 플레이리스트 그리드 (홈과 동일한 카드)
- [ ] 빈 상태 (저장한 플리 없음 안내)
- [ ] 컬렉션 해제 버튼 (카드 내)
- [ ] 정렬 (저장 최신순)

#### 관리자 페이지 `/[locale]/admin`

- [x] Admin guard (비관리자 차단 → 홈 리디렉트)
- [x] YouTube URL 입력 필드
- [x] 파싱 버튼
- [x] 파싱 결과 미리보기 (제목, 썸네일, 채널명)
- [x] AI 생성 콘텐츠 체크박스 (체크 시 썸네일에 AI 뱃지 표시)
- [x] 장르 / 분위기 / 장소 / 시대 다중 선택 (태그 칩)
- [x] 트랙리스트 편집 (제목/아티스트 수정, 행 추가/삭제)
- [x] 등록 버튼
- [x] 등록된 플리 목록 테이블 (제목+AI뱃지 / 채널 / 좋아요 / 공개여부 / 수정 / 삭제)
- [x] 수정 클릭 시 폼 상단으로 스크롤 + 기존 데이터 pre-fill

---

## 6. Error Handling

### 6.1 Error Code Definition

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| 400 | Invalid YouTube URL | URL 파싱 실패 | 입력 필드 오류 표시 |
| 401 | Unauthorized | 미로그인 접근 | 로그인 모달 or 리디렉트 |
| 403 | Forbidden | Admin 아닌 사용자 | 홈 리디렉트 + 토스트 |
| 404 | Playlist not found | YouTube 삭제된 플리 | 404 페이지 |
| 429 | YouTube API quota exceeded | API 한도 초과 | 오류 메시지 + 할당량 안내 |
| 500 | Internal error | 서버 오류 | 에러 바운더리 + 토스트 |

### 6.2 Client Error Handling Pattern

```typescript
// Optimistic update with rollback (좋아요/컬렉션)
const { mutate } = useMutation({
  mutationFn: toggleLike,
  onMutate: async (playlistId) => {
    await queryClient.cancelQueries(['playlist', playlistId]);
    const previous = queryClient.getQueryData(['playlist', playlistId]);
    queryClient.setQueryData(['playlist', playlistId], (old) => ({
      ...old,
      like_count: isLiked ? old.like_count - 1 : old.like_count + 1,
    }));
    return { previous };
  },
  onError: (err, variables, context) => {
    queryClient.setQueryData(['playlist', variables], context?.previous);
    toast.error('오류가 발생했습니다');
  },
});
```

---

## 7. Security Considerations

- [x] **YouTube API Key**: `/api/youtube` route (서버 전용, `YOUTUBE_API_KEY` 노출 없음)
- [x] **Admin Guard**: `middleware.ts`에서 Supabase session 확인 + `ADMIN_EMAIL` 환경변수 비교
- [x] **RLS**: Supabase 테이블별 Row Level Security 정책 (§3.3)
- [x] **CSRF**: Next.js App Router + Supabase Auth는 CSRF 보호 내장
- [x] **댓글 길이 제한**: DB CHECK constraint (1~500자) + 클라이언트 검증
- [x] **Rate Limiting**: `/api/youtube` 에서 어드민만 호출 가능 (이중 보호)

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| L1: API Tests | `/api/youtube` 엔드포인트 | curl | Do |
| L2: UI Action Tests | 필터, 좋아요, 댓글, 컬렉션 | Playwright | Do |
| L3: E2E Scenario | 목록→상세→인터랙션 전체 플로우 | Playwright | Do |

### 8.2 L1: API Test Scenarios

| # | Endpoint | Method | Test Description | Expected Status |
|---|----------|--------|-----------------|:--------------:|
| 1 | /api/youtube | POST | 유효한 YouTube 플리 URL 파싱 | 200 |
| 2 | /api/youtube | POST | 잘못된 URL 형식 | 400 |
| 3 | /api/youtube | POST | 비관리자 호출 | 401 |
| 4 | /api/youtube | POST | 존재하지 않는 플리 ID | 404 |

### 8.3 L2: UI Action Test Scenarios

| # | Page | Action | Expected Result |
|---|------|--------|----------------|
| 1 | 홈 | 장르 필터 선택 | 카드 목록 필터링됨 |
| 2 | 홈 | 시대 필터 '1990s' 클릭 | 1990s 플리만 표시 |
| 3 | 홈 | 정렬 '좋아요순' 선택 | like_count 내림차순 정렬 |
| 4 | 상세 | 좋아요 버튼 클릭 (로그인) | 카운트 +1, 버튼 활성 |
| 5 | 상세 | 댓글 작성 후 등록 | 댓글 목록 상단에 추가 |
| 6 | 상세 | 컬렉션 버튼 클릭 | 버튼 상태 변경, collection 페이지에 추가 |
| 7 | 홈 | 언어 KO→EN 전환 | 필터 레이블, 버튼 텍스트 영어로 변경 |

### 8.4 L3: E2E Scenario Test Scenarios

| # | Scenario | Steps | Success Criteria |
|---|----------|-------|-----------------|
| 1 | 비로그인 탐색 | 홈→필터 적용→카드 클릭→트랙리스트 확인 | 트랙리스트 렌더링, 댓글 읽기 가능 |
| 2 | 로그인 후 인터랙션 | 로그인→상세→좋아요→댓글 작성→컬렉션 저장 | 모든 상태 반영, /collection에 저장됨 |
| 3 | 언어 전환 | 홈 EN→KO 전환→필터 사용→상세 이동 | URL prefix 변경, 모든 텍스트 변환 |
| 4 | 관리자 플리 등록 | /admin→URL 입력→파싱→태그→등록→홈에서 확인 | 목록에 새 플리 등장 |

### 8.5 Seed Data Requirements

| Entity | Minimum Count | Key Fields Required |
|--------|:------------:|---------------------|
| playlists | 20 | genre, mood, place, era 각 2개 이상 조합 |
| tracks | 각 플리 5개 이상 | position, title, duration_sec |
| profiles | 2 | display_name (일반 유저 1, admin 1) |

---

## 9. i18n Design

### 9.1 next-intl 구조

```
middleware.ts         # locale 감지 + redirect (/→/ko)
app/
├── layout.tsx        # NextIntlClientProvider 래핑
└── [locale]/
    └── ...

i18n/
├── ko.json           # 한국어 기본
└── en.json           # 영어

next.config.js        # withNextIntl 래핑
```

### 9.2 번역 키 구조 (i18n/ko.json 예시)

```json
{
  "common": {
    "login": "로그인",
    "logout": "로그아웃",
    "collection": "컬렉션",
    "save": "저장",
    "cancel": "취소"
  },
  "filter": {
    "genre": "장르",
    "mood": "분위기",
    "place": "장소",
    "era": "시대",
    "sort": {
      "latest": "최신순",
      "likes": "좋아요순",
      "views": "조회수순"
    }
  },
  "playlist": {
    "trackCount": "{{count}}개 트랙",
    "likeCount": "좋아요 {{count}}",
    "viewOnYoutube": "YouTube에서 보기",
    "noResults": "조건에 맞는 플레이리스트가 없습니다"
  },
  "comment": {
    "placeholder": "댓글을 작성하세요 (최대 500자)",
    "loginRequired": "로그인 후 댓글을 작성할 수 있습니다",
    "submit": "등록"
  }
}
```

---

## 10. Coding Convention Reference

### 10.1 Naming Conventions

| Target | Rule | Example |
|--------|------|---------|
| Components | PascalCase | `PlaylistCard`, `FilterBar` |
| Hooks | `use` + PascalCase | `usePlaylists`, `useCollection` |
| DB 컬럼 | snake_case | `youtube_id`, `like_count` |
| TypeScript 타입 | PascalCase | `Playlist`, `FilterState` |
| i18n 키 | camelCase 점 표기 | `filter.genre`, `common.login` |
| 환경변수 | UPPER_SNAKE_CASE | `YOUTUBE_API_KEY`, `ADMIN_EMAIL` |

### 10.2 Server vs Client Component 기준

| 판단 기준 | Server Component | Client Component |
|---------|:---:|:---:|
| 데이터 페칭 (초기) | ✅ | — |
| 이벤트 핸들러 | — | ✅ |
| useState / useEffect | — | ✅ |
| Supabase 서버 클라이언트 | ✅ | — |
| 필터/정렬 (URL params) | ✅ | — |
| 좋아요/댓글 토글 | — | ✅ |

---

## 11. Implementation Guide

### 11.1 Implementation Order

1. [ ] Supabase 프로젝트 생성 + 테이블 마이그레이션 (§3.2)
2. [ ] RLS 정책 적용 (§3.3)
3. [ ] Next.js 프로젝트 초기화 (`create-next-app` + next-intl 설정)
4. [ ] `lib/supabase/` 클라이언트 설정
5. [ ] `middleware.ts` (locale redirect + admin guard)
6. [ ] 공용 UI 컴포넌트 (`components/ui/`)
7. [ ] Header (로고, 언어 토글, 로그인 버튼)
8. [ ] filter/store.ts (Zustand) + FilterBar 컴포넌트
9. [ ] features/playlist — PlaylistCard, PlaylistGrid, usePlaylists
10. [ ] 홈 페이지 조합 (Server Component)
11. [ ] 상세 페이지 + TrackList (Server Component)
12. [ ] features/interaction — LikeButton, CollectionButton, CommentList, CommentForm
13. [ ] `/collection` 페이지
14. [ ] `/api/youtube` route + features/admin
15. [ ] i18n 번역 파일 (ko.json, en.json) 완성
16. [ ] Seed 데이터 + E2E 테스트

### 11.2 Key Dependencies

```bash
# 설치 명령
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add next-intl
pnpm add @tanstack/react-query
pnpm add zustand
pnpm add -D @playwright/test
```

### 11.3 Session Guide

#### Module Map

| Module | Scope Key | Description | Estimated Turns |
|--------|-----------|-------------|:---------------:|
| 인프라 + 인증 | `module-1` | Supabase 설정, Auth, middleware, Header | 30-40 |
| 목록 + 필터 | `module-2` | PlaylistCard, FilterBar, EraFilter, 홈 페이지 | 40-50 |
| 상세 + 인터랙션 | `module-3` | TrackList, LikeButton, CollectionButton, 댓글 | 40-50 |
| 컬렉션 + Admin | `module-4` | /collection 페이지, /admin, YouTube API | 30-40 |
| i18n + 마무리 | `module-5` | 번역 파일, 언어 전환, E2E 테스트 | 20-30 |

#### Recommended Session Plan

| Session | Phase | Scope | Turns |
|---------|-------|-------|:-----:|
| Session 1 | Plan + Design | 전체 (현재 완료) | 30-40 |
| Session 2 | Do | `--scope module-1,module-2` | 40-50 |
| Session 3 | Do | `--scope module-3,module-4` | 40-50 |
| Session 4 | Do | `--scope module-5` | 20-30 |
| Session 5 | Check + Report | 전체 | 30-40 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-06 | Initial design (Option C Pragmatic Balance) | jinwang |
| 0.2 | 2026-04-07 | 필터 UX 개선 (시대 드롭다운化, 선택 태그 행, 칩 카운트 제거). 채널 스토리 바 (ChannelStoriesBar, useChannelStories, useAllPlaylists, /api/youtube/channels). filter/store channelId 추가. AI 뱃지 (is_ai 타입+DB, PlaylistCard, PlaylistForm 체크박스). 관리자 수정 기능 (updatePlaylist, PlaylistForm edit mode, AdminContent, PlaylistTable 수정 버튼). 채널 프로필 이미지 (ChannelAvatar, useChannelThumbnail — 카드/상세 공용). 헤더 SVG 로고. 카피라이트 footer | jinwang |
| 0.3 | 2026-04-08 | 에디토리얼 큐레이션 강화: editor_note를 PlaylistCard(태그 대체 italic 인용)와 CuratedCollectionSection(카드 하단 description)에 노출. 큐레이션 캐러셀 전면 리디자인 — 16:9 full-width peek 레이아웃(min(720px,78vw)), IntersectionObserver→scroll 이벤트 방식으로 활성 카드 감지(컨테이너 중심 거리 기반), scale/opacity 전환 효과. 홈 레이아웃: CuratedCollectionSection → ChannelStoriesBar → FilterBar 순. Admin 다크 테마 전면 적용(AdminContent/PlaylistForm/PlaylistTable/CollectionManager). PlaylistTable colgroup 너비 최적화. 컬렉션 상세 페이지 channel_name + editor_note 노출. | jinwang |
| 0.4 | 2026-04-09 | 캐러셀 무한 루프: displayItems=[last,...all,first] 클론 구조, scrollend 이벤트로 클론 위치 감지 → 실제 카드 순간이동(isJumping 플래그). PlaylistPlayer children prop 추가(영상-트랙리스트 사이 슬롯). 상세 페이지 레이아웃 재정렬: 영상→제목/채널→에디터노트→태그→액션버튼(좋아요/담기/내목록/YouTube)→트랙리스트→댓글. | jinwang |
