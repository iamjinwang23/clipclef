---
template: design
version: 1.3
feature: clipclef-v2
date: 2026-04-22
author: iamjinwang@gmail.com
project: ClipClef
architecture: Option C — Pragmatic Balance
---

# clipclef-v2 Design Document

> **Summary**: "감상 공간" 피벗의 구현 설계. Global Persistent Player를 중심으로 Scrobble 인프라, 저장→묶기→발행 플로우, 홈 5섹션을 통합 설계.
>
> **Project**: ClipClef
> **Pre-pivot tag**: v1.1 (commit 69ac3e9)
> **Author**: iamjinwang@gmail.com
> **Date**: 2026-04-22
> **Status**: Draft
> **Planning Doc**: [clipclef-v2.plan.md](../../01-plan/features/clipclef-v2.plan.md)
> **PRD**: [clipclef-v2.prd.md](../../00-pm/clipclef-v2.prd.md)
> **Architecture**: Option C — Pragmatic Balance

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 재방문 주기 길고 페이지 이동 시 재생 끊김 = 유튜브 이탈 #1. 감상이 기록·축적되지 않아 "내 취향 아카이브" 부재 |
| **WHO** | Primary: 국내 2030 early curator 500명 (Beachhead). Secondary: Listener, Archivist |
| **RISK** | R1 Persistent Player iframe 재초기화 (Critical) · R3 발행 플로우 전환율 (High) · R2 Scrobble 정확도 (High) |
| **SUCCESS** | DAU×duration +20% MoM / scrobble/DAU ≥ 1.0 / weekly publish ≥ 8% WAU |
| **SCOPE** | MVP: F1 Player + F2 Scrobble + F3 저장 승격 + F4 라이브러리 + F5 묶기→발행 + F6 혼합 선반 + F8 홈 5섹션 |

---

## 1. Overview

### 1.1 Design Goals

1. **Persistent Player 안정성** (R1): iframe이 사용자 세션 동안 단 한 번만 생성되며, 재생 단절 0회
2. **Scrobble 정확도** (R2): 4min/50% 임계값 준수, 중복/누락 < 10%
3. **발행 플로우 마찰 최소** (R3): 라이브러리 3+ 상태에서 3-step (선택→카피→커버)로 완결
4. **v1.1 리그레션 0**: 기존 기능(auth/upload/admin/profile/social) 영향 없음
5. **모듈 분리**: 8-12 세션으로 나눠 incremental 구현 가능

### 1.2 Design Principles

1. **Single iframe principle**: `<iframe src="*youtube*">`는 `app/[locale]/layout.tsx` 내 `<PersistentPlayer>` 외 어디에도 존재하지 않는다
2. **State as single source of truth**: `playerStore`(Zustand)가 재생 상태의 유일한 진실. 모든 UI는 구독만, 직접 iframe 조작 금지
3. **Transform-only view changes**: 플레이어 위치·크기 변경은 CSS `transform`으로만. DOM 트리 이동 절대 금지
4. **Reuse over abstraction**: 기존 `features/interaction`의 useCollection/useLike 재사용, 신규 store·hook은 player/curation/library 영역에서만
5. **Migration safety**: 기존 `user_playlists` 스키마는 nullable 컬럼 추가만. 기존 데이터 보수적 백필

---

## 2. Architecture Options

### 2.0 Architecture Comparison

| Criteria | Option A: Minimal | Option B: Clean | **Option C: Pragmatic** |
|----------|:-:|:-:|:-:|
| New files | ~15 | ~35 | **~22** |
| Modified files | ~8 | ~8 | **~10** |
| Complexity | Low | High | **Medium** |
| Maintainability | Medium | High | **High** |
| Effort | Low | High | **Medium** |
| R1 structural safety | Weak | Strong | **Sufficient** |
| Migration risk | Low | High | **Low** |
| Sessions | 8-10 | 14-18 | **8-12** |

**Selected**: Option C — **Rationale**: F1 Critical 리스크에 맞는 구조적 분리(components/hooks 경계)는 확보하되, 1인 개발 6-8주 타임라인 안에서 MVP 완결 가능. `user_playlists` 재활용으로 마이그레이션 리스크(R6) 최소화. 단위 테스트 대신 E2E Critical Path 집중으로 PRD test scenarios(T-1~T-6) 요구 충족.

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Root: app/[locale]/layout.tsx                                   │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ <PersistentPlayer>  (never unmounts during session)       │  │
│  │   ┌─────────────────────────────────────────────────────┐ │  │
│  │   │ <iframe src="youtube.com/embed/..."/>   (single)    │ │  │
│  │   │   - position: fixed                                 │ │  │
│  │   │   - transform: translate + scale (view switch)      │ │  │
│  │   │   - controlled by playerStore (Zustand)             │ │  │
│  │   └─────────────────────────────────────────────────────┘ │  │
│  │   ┌───────────────┐    ┌─────────────────────┐            │  │
│  │   │ <MiniBar>     │    │ <ExpandedView>      │            │  │
│  │   │  always on    │    │  only on playlist   │            │  │
│  │   │  subscribes   │    │  detail, subscribes │            │  │
│  │   └───────────────┘    └─────────────────────┘            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Home (/)     │  │ Playlist     │  │ /me/library          │   │
│  │  5 sections  │  │ detail page  │  │  F4 library          │   │
│  │  F6 shelf    │  │  F3 save btn │  │  F5 publish CTA      │   │
│  │  F8          │  │              │  │                      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
           │                │                  │
           ▼                ▼                  ▼
  ┌───────────────────────────────────────────────────────────────┐
  │  playerStore (Zustand) — single source of truth               │
  │   state: { videoId, playlistId, currentTrack, time, status }  │
  │   actions: play, pause, seek, load, next, previous            │
  │   subscribes to iframe events via YouTube IFrame API          │
  └───────────────────────────────────────────────────────────────┘
           │
           ▼
  ┌───────────────────────────────────────────────────────────────┐
  │  useScrobble hook (F2)                                        │
  │   1s setInterval + getCurrentTime()                           │
  │   crosses tracks[n].start_sec → crosses tracks[n+1].start_sec │
  │   applies 4min/50% rule → POST /api/listens                   │
  │   visibilitychange listener for tab-background correction     │
  └───────────────────────────────────────────────────────────────┘
           │                                                       
           ▼                                                       
  ┌───────────────────────────────────────────────────────────────┐
  │  Supabase                                                     │
  │  - listens (new table)                                        │
  │  - user_playlists (+ published_at, cover_url, caption)        │
  │  - existing tables unchanged                                  │
  └───────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

**Playback start flow:**
```
User clicks play on PlaylistCard
  → playerStore.load(playlistId)
  → fetch playlist + tracks from Supabase
  → iframe.loadVideoById(youtube_id)
  → onReady → playerStore.status = "ready"
  → onStateChange(PLAYING) → useScrobble starts polling
  → getCurrentTime() every 1s
  → if crossed track boundary: emit track_started / track_ended
  → if 4min or 50% played: POST /api/listens
```

**Page navigation flow (R1 critical):**
```
User navigates / → /playlist/[id]
  → Next.js App Router rerenders ONLY child routes
  → layout.tsx NOT re-rendered → <PersistentPlayer> NOT unmounted
  → <iframe> NOT re-created → playback continues
  → /playlist/[id] page reads playerStore.playlistId
  → if matches: show ExpandedView (transform iframe into large view)
  → if differs: show MiniBar + track detail (no iframe swap)
```

**Save flow:**
```
User clicks SaveButton (MiniBar / PlaylistCard)
  → if not authed: show LoginModal, halt
  → useCollection.add(playlistId) (reused from features/interaction)
  → optimistic update + toast "라이브러리에 저장됨"
  → invalidate react-query cache for /me/library
```

**Publish flow (F5):**
```
User on /me/library with savedPlaylists.length >= 3
  → PublishCTA visible
  → User clicks "묶어서 발행"
  → PublishFlow modal opens (3-step)
    → Step 1: Multi-select saved playlists (checkbox grid)
    → Step 2: Caption input (max 140 chars) + optional title
    → Step 3: Cover image picker (from selected playlists' thumbnails or upload)
  → POST /api/user-playlists/publish
    → creates new user_playlist with published_at=NOW(), cover_url, caption
    → inserts user_playlist_items pointing to selected playlists
  → redirect /me/library → toast "컬렉션 발행됨"
  → MixedShelf react-query invalidated → home updates
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `<PersistentPlayer>` | playerStore, `lib/youtube-player.ts` | iframe lifecycle + API 래퍼 |
| `<MiniBar>` | playerStore, useCollection | 상시 노출 UI + 저장 버튼 |
| `<ExpandedView>` | playerStore | 플리 상세 대형뷰 |
| `useScrobble` | playerStore, `/api/listens` | 트랙 경계 감지 + write |
| `useVisibility` | (없음) | `document.visibilitychange` 이벤트 |
| `<PublishFlow>` | useLibrary, `/api/user-playlists/publish` | 발행 플로우 |
| `<MixedShelf>` | useMixedShelf (fetch curated + published user_playlists) | 혼합 선반 |
| `<LibraryGrid>` | useLibrary (saved + own playlists) | 라이브러리 뷰 |

---

## 3. Data Model

### 3.1 Entity Definition

```typescript
// F2 Scrobble record
interface Listen {
  id: string;                // UUID
  user_id: string;           // FK profiles
  track_id: string;          // FK tracks
  playlist_id: string;       // FK playlists (cached for "recent playlists" queries)
  played_at: Date;           // timestamp when 4min/50% threshold crossed
  duration_ms: number;       // actual listened ms at threshold
  created_at: Date;
}

// F5 Extended user_playlists (existing table + new columns)
interface UserPlaylist {
  id: string;
  user_id: string;
  name: string;
  is_public: boolean;        // existing — 링크 공개 여부 (내부 공유용)
  is_default: boolean;
  created_at: Date;
  // NEW in v2
  published_at: Date | null; // NOT NULL = 발행상태 (혼합 선반 노출 조건)
  cover_url: string | null;  // 발행 커버
  caption: string | null;    // 한 줄 카피 (max 140)
}

// F1 Zustand player state (client-only, not DB)
interface PlayerState {
  status: "idle" | "loading" | "ready" | "playing" | "paused" | "ended" | "error";
  view: "mini" | "expanded";           // 미니바 vs 확장뷰
  playlistId: string | null;
  playlist: Playlist | null;
  tracks: Track[];
  currentTrackIndex: number;
  currentTime: number;                 // seconds, updated 1Hz
  duration: number;
  // actions
  load: (playlistId: string) => Promise<void>;
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  next: () => void;
  previous: () => void;
  setView: (view: "mini" | "expanded") => void;
}
```

### 3.2 Entity Relationships

```
[profiles] 1 ─── N [listens] N ─── 1 [tracks]
    │                                   │
    │                                   │
    └── 1 ─── N [user_playlists] 1 ─── N [user_playlist_items] N ─── 1 [playlists]
                    │
                    ├── published_at (NEW)
                    ├── cover_url (NEW)
                    └── caption (NEW)

[listens] N ─── 1 [playlists] (cached FK for recent-playlists query)

[curated_collections] ─┐
                       ├── UNION in MixedShelf
[user_playlists published_at IS NOT NULL] ─┘
```

### 3.3 Database Schema

**Migration file**: `supabase/migrations/021_v2_player_scrobble.sql`

```sql
-- ============================================================================
-- 021_v2_player_scrobble.sql
-- v2 Pivot: listens table + user_playlists column extension
-- ============================================================================

-- 1. listens table (F2 Scrobble)
CREATE TABLE listens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  played_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms INT NOT NULL CHECK (duration_ms >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_listens_user_played ON listens (user_id, played_at DESC);
CREATE INDEX idx_listens_playlist ON listens (playlist_id);
CREATE INDEX idx_listens_track ON listens (track_id);

-- Duplicate prevention: no duplicate insert within same minute for same (user, track)
CREATE UNIQUE INDEX idx_listens_dedupe
  ON listens (user_id, track_id, DATE_TRUNC('minute', played_at));

-- RLS: users see only their own listens
ALTER TABLE listens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own listens"
  ON listens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own listens"
  ON listens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 2. user_playlists column extension (F5)
ALTER TABLE user_playlists
  ADD COLUMN published_at TIMESTAMPTZ NULL,
  ADD COLUMN cover_url TEXT NULL,
  ADD COLUMN caption VARCHAR(140) NULL;

CREATE INDEX idx_user_playlists_published ON user_playlists (published_at DESC)
  WHERE published_at IS NOT NULL;

-- 3. RLS update: public read for published user_playlists
DROP POLICY IF EXISTS "Public user_playlists are readable" ON user_playlists;
CREATE POLICY "Published user_playlists are public read"
  ON user_playlists FOR SELECT
  USING (published_at IS NOT NULL OR auth.uid() = user_id);

-- 4. Backfill (conservative — FR-14)
-- 기존 is_public=true + 항목 1개 이상 + 90일 내 생성된 것만 자동 발행 처리
UPDATE user_playlists up
SET published_at = up.created_at
WHERE up.is_public = true
  AND up.published_at IS NULL
  AND up.created_at >= NOW() - INTERVAL '90 days'
  AND EXISTS (
    SELECT 1 FROM user_playlist_items upi WHERE upi.user_playlist_id = up.id
  );

-- 5. RPC for "recent playlists" (F8 이어듣기 섹션)
CREATE OR REPLACE FUNCTION recent_playlists_for_user(p_user_id UUID, p_limit INT DEFAULT 5)
RETURNS TABLE (
  playlist_id UUID,
  last_played_at TIMESTAMPTZ
) AS $$
  SELECT DISTINCT ON (l.playlist_id)
    l.playlist_id,
    l.played_at AS last_played_at
  FROM listens l
  WHERE l.user_id = p_user_id
  ORDER BY l.playlist_id, l.played_at DESC
  LIMIT p_limit;
$$ LANGUAGE SQL STABLE;

-- 6. RPC for mixed shelf (F6)
CREATE OR REPLACE FUNCTION mixed_shelf(p_limit INT DEFAULT 20)
RETURNS TABLE (
  source TEXT,            -- 'curated' or 'user'
  id UUID,
  title TEXT,
  cover_url TEXT,
  caption TEXT,
  creator_id UUID,
  published_at TIMESTAMPTZ
) AS $$
  (SELECT
    'curated'::TEXT AS source,
    cc.id,
    cc.title,
    NULL::TEXT AS cover_url,
    cc.description AS caption,
    NULL::UUID AS creator_id,
    cc.created_at AS published_at
   FROM curated_collections cc
   WHERE cc.is_active = true)
  UNION ALL
  (SELECT
    'user'::TEXT AS source,
    up.id,
    up.name AS title,
    up.cover_url,
    up.caption,
    up.user_id AS creator_id,
    up.published_at
   FROM user_playlists up
   WHERE up.published_at IS NOT NULL)
  ORDER BY published_at DESC
  LIMIT p_limit;
$$ LANGUAGE SQL STABLE;
```

**Rollback** (if migration needs revert):
```sql
DROP FUNCTION IF EXISTS mixed_shelf;
DROP FUNCTION IF EXISTS recent_playlists_for_user;
DROP POLICY IF EXISTS "Published user_playlists are public read" ON user_playlists;
ALTER TABLE user_playlists
  DROP COLUMN caption,
  DROP COLUMN cover_url,
  DROP COLUMN published_at;
DROP TABLE IF EXISTS listens;
```

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/listens` | Scrobble write (insert listens record) | **Required** |
| GET | `/api/listens/recent` | 이어듣기 섹션 데이터 (최근 5 plays) | Required |
| POST | `/api/user-playlists/publish` | 컬렉션 발행 (published_at + cover + caption 설정) | **Required** (owner) |
| PATCH | `/api/user-playlists/:id` | 발행 후 수정 (Letterboxd 방식) | Required (owner) |
| DELETE | `/api/user-playlists/:id` | 발행 후 삭제 | Required (owner) |
| GET | `/api/mixed-shelf` | 홈 혼합 선반 (curated + published user_playlists) | 공개 |
| GET | `/api/library` | `/me/library` 페이지 데이터 (saved + own playlists) | Required |

### 4.2 Detailed Specification

#### `POST /api/listens`

**Purpose**: F2 scrobble — 트랙이 임계값(4min or 50%) 교차 시점에 호출.

**Request:**
```json
{
  "track_id": "uuid",
  "playlist_id": "uuid",
  "duration_ms": 240000
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "uuid",
    "played_at": "2026-04-22T14:30:12Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: `{ "error": { "code": "VALIDATION_ERROR", "details": { "fieldErrors": { "duration_ms": "must be >= 0" } } } }`
- `401 Unauthorized`: 비로그인 시
- `409 Conflict`: unique index 위반(1분 내 중복) → 정상 동작, 에러지만 무시 가능 신호
- `429 Too Many Requests`: 같은 (user, track, playlist)에 대해 5분 내 2회 이상 시도 (서버 rate limit)

#### `GET /api/listens/recent`

**Purpose**: F8 이어듣기 섹션 — 최근 들은 플리 5개 FIFO.

**Request:** `GET /api/listens/recent?limit=5`

**Response (200 OK):**
```json
{
  "data": [
    {
      "playlist_id": "uuid",
      "playlist": { /* playlist detail */ },
      "last_played_at": "2026-04-22T14:30:00Z"
    }
  ]
}
```

#### `POST /api/user-playlists/publish`

**Purpose**: F5 발행 — 저장한 플리들을 묶어서 컬렉션 발행.

**Request:**
```json
{
  "title": "주말 드라이브용 시티팝",
  "caption": "토요일 오후에 듣기 좋은 시티팝 셀렉션",
  "cover_url": "https://...",
  "playlist_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Validation (Zod)**:
- `title`: string, 1-100 chars
- `caption`: string, 0-140 chars (optional)
- `cover_url`: URL, optional (null이면 첫 플리 썸네일 자동 사용)
- `playlist_ids`: array of UUID, min 1, max 20 (3+ CTA 조건은 클라이언트에서만 체크)

**Response (201 Created):**
```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "주말 드라이브용 시티팝",
    "published_at": "2026-04-22T14:35:00Z",
    "cover_url": "https://...",
    "caption": "토요일 오후에 듣기 좋은 시티팝 셀렉션",
    "items": [ /* playlist refs */ ]
  }
}
```

**Error Responses:**
- `400`: validation error
- `401`: unauth
- `403`: 소유권 검증 실패 (playlist_ids 중 저장하지 않은 것)

#### `PATCH /api/user-playlists/:id`

**Purpose**: 발행 후 수정 (Letterboxd 방식 — 커버/카피/항목 수정).

**Request:**
```json
{
  "title": "...",
  "caption": "...",
  "cover_url": "...",
  "playlist_ids": ["uuid1", "uuid2"]   // optional, 전달되면 items 재구성
}
```

**Auth**: `user_id = auth.uid()` 검증.

**Response (200 OK)**: updated row.

#### `DELETE /api/user-playlists/:id`

**Purpose**: 발행 후 삭제 (Letterboxd 방식).

**Auth**: `user_id = auth.uid()` 검증.

**Response (204 No Content)**.

#### `GET /api/mixed-shelf`

**Purpose**: F6 홈 혼합 선반.

**Request:** `GET /api/mixed-shelf?limit=20`

**Response (200 OK):**
```json
{
  "data": [
    {
      "source": "curated",
      "id": "uuid",
      "title": "2026 봄 셀렉션",
      "cover_url": null,
      "caption": "...",
      "creator": null,
      "published_at": "2026-04-20T..."
    },
    {
      "source": "user",
      "id": "uuid",
      "title": "내 시티팝",
      "cover_url": "https://...",
      "caption": "...",
      "creator": { "id": "uuid", "display_name": "재훈" },
      "published_at": "2026-04-22T..."
    }
  ]
}
```

**Note**: RPC `mixed_shelf(p_limit)` 호출. 시간순 혼합.

---

## 5. UI/UX Design

### 5.1 Screen Layout

**Global (all pages — F1 PersistentPlayer):**

```
┌────────────────────────────────────────────────────────┐
│  Header (existing)                                     │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Main Content (varies by route)                        │
│                                                        │
├────────────────────────────────────────────────────────┤
│  Mobile bottom nav (existing)                          │
└────────────────────────────────────────────────────────┘
     ┌──────────────────────────────────────────────┐
     │ <MiniBar> (position: fixed, bottom above nav)│
     │  [▶] 플리이름 - 아티스트    [♡] [💾] [...] │
     └──────────────────────────────────────────────┘

     <iframe> position: fixed (hidden or transform-placed)
             크기/위치: view === "mini" ? 0×0 offscreen : expanded
```

**Home (`/`) — F8 5-section layout:**

```
┌─────────────────────────────────────────────────────────┐
│ Header                                                  │
├─────────────────────────────────────────────────────────┤
│ § 1. 이어듣기                          [자세히 보기 →]   │
│   (최근 5 FIFO 큐, ScrollRail)                          │
│   [PL1] [PL2] [PL3] [PL4] [PL5]                         │
├─────────────────────────────────────────────────────────┤
│ § 2. 에디토리얼·컬렉션               [자세히 보기 →]     │
│   (혼합 선반, published_at DESC, Top 12)                │
│   [관리자_A][유저_B][유저_C][관리자_D]...               │
├─────────────────────────────────────────────────────────┤
│ § 3. 팔로우 큐레이터                [자세히 보기 →]      │
│   (follows 기반, 최근 발행 플리)                        │
├─────────────────────────────────────────────────────────┤
│ § 4. 전체 피드                       [자세히 보기 →]    │
│   (기존 /playlists, 인기순 Top 12)                      │
├─────────────────────────────────────────────────────────┤
│ § 5. 장르 · 아티스트 탐색           [자세히 보기 →]      │
│   (기존 v1.1 홈의 4·5 섹션 통합)                        │
├─────────────────────────────────────────────────────────┤
│ Bottom nav                            <MiniBar>         │
└─────────────────────────────────────────────────────────┘
```

**Empty States (FR-12):**
- § 1 empty → "아직 들은 플리가 없어요. 아래에서 하나 골라보세요 ↓"
- § 2 empty → "첫 에디토리얼을 기다리고 있어요"
- § 3 empty → "관심 있는 큐레이터를 팔로우해보세요"
- § 4 empty → (최소 관리자 seed로 항상 채워짐, 비활성화 예외)
- § 5 empty → (v1.1 그대로 작동, 영향 없음)

**Playlist detail (`/playlist/[id]`):**

```
┌─────────────────────────────────────────────────────────┐
│ Header                                                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ <ExpandedView>  (YouTube iframe here, transform)  │  │
│  │  (현 PlaylistPlayer 위치 — iframe 이동 아닌       │  │
│  │   transform으로 이 자리에 오는 걸로 보이기)       │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  TrackList (existing)                                   │
│  UploaderCard (existing)                                │
│  LikeButton / CollectionButton / AddToPlaylist          │
│  Comments (existing)                                    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ <MiniBar> hidden (view=expanded)                        │
└─────────────────────────────────────────────────────────┘
```

**Library (`/me/library`) — F4:**

```
┌─────────────────────────────────────────────────────────┐
│ Header                                                  │
├─────────────────────────────────────────────────────────┤
│  내 라이브러리                                          │
│                                                         │
│  [저장한 플리]     [내가 만든 컬렉션]  [발행한 것만]    │
│   ─────────────                                         │
│                                                         │
│  [저장 3+이면]                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │ 💡 이 플리들을 묶어 컬렉션으로 발행해보세요        │  │
│  │ [묶어서 발행 →]                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  PlaylistGrid (저장한 플리들)                           │
│  [PL1] [PL2] [PL3] [PL4] ...                            │
└─────────────────────────────────────────────────────────┘
```

**Publish modal (F5 3-step):**

```
Step 1: 플리 선택
┌─────────────────────────────────────────────────┐
│ 묶을 플리를 선택하세요 (3개 이상)               │
│ ─────────────────────────────────────           │
│ [✓] PL1  [✓] PL2  [ ] PL3  [✓] PL4 ...          │
│                                                 │
│           [취소]           [다음 →]              │
└─────────────────────────────────────────────────┘

Step 2: 한 줄 카피
┌─────────────────────────────────────────────────┐
│ 컬렉션 이름: [_____________________]            │
│ 한 줄 카피 (선택): [_________________] 0/140    │
│                                                 │
│           [← 이전]         [다음 →]              │
└─────────────────────────────────────────────────┘

Step 3: 커버
┌─────────────────────────────────────────────────┐
│ 커버 이미지                                     │
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐                         │
│ │🖼️ │ │🖼️ │ │🖼️ │ │📤 │   (선택한 플리 썸네일  │
│ └───┘ └───┘ └───┘ └───┘    + 업로드 버튼)       │
│                                                 │
│           [← 이전]         [발행하기 🚀]         │
└─────────────────────────────────────────────────┘
```

### 5.2 User Flow

**Scrobble (가장 중요):**
```
유저 재생 클릭 → playerStore.load → iframe loads → play
  → useScrobble polling 시작 (1Hz)
  → 트랙 boundary 감지 (start_sec 교차)
  → 4min or 50% 경과 시 POST /api/listens
  → UI 변화 없음 (백그라운드 동작)
  → /me/library "이어듣기" 섹션에 반영
```

**Save → Publish:**
```
유저 재생 중 → MiniBar 저장 버튼 클릭
  → 이미 저장됨: 토스트 "이미 저장되었습니다"
  → 신규: POST /api/collections → 토스트 "라이브러리에 저장"
  → /me/library 진입 → 저장 3+ 확인
  → PublishCTA 배너 노출
  → 클릭 → PublishFlow 3-step
  → 발행 완료 → /me/library 리다이렉트 + "컬렉션 발행됨"
  → 홈 MixedShelf에 본인 컬렉션 등장 (react-query invalidation)
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `PersistentPlayer` | `src/features/player/components/PersistentPlayer.tsx` | iframe 단일 마운트 + lifecycle 관리 |
| `MiniBar` | `src/features/player/components/MiniBar.tsx` | 상시 노출 컨트롤 바 |
| `ExpandedView` | `src/features/player/components/ExpandedView.tsx` | 플리 상세 대형뷰 슬롯 (iframe이 이 자리로 transform) |
| `SaveButton` | `src/features/player/components/SaveButton.tsx` | 플레이어 바 안 저장 버튼 (F3) |
| `LoginModal` | `src/components/ui/LoginModal.tsx` (신규) | 비로그인 저장 시도 시 표시 |
| `playerStore` | `src/features/player/store.ts` | Zustand — 재생 상태 SSOT |
| `useScrobble` | `src/features/player/hooks/useScrobble.ts` | 1s polling + 트랙 경계 + 임계값 write |
| `useVisibility` | `src/features/player/hooks/useVisibility.ts` | visibilitychange 보정 |
| `youtubePlayer` | `src/lib/youtube-player.ts` | YouTube IFrame API 래퍼 (singleton) |
| `LibraryGrid` | `src/features/library/components/LibraryGrid.tsx` | /me/library 그리드 |
| `useLibrary` | `src/features/library/hooks/useLibrary.ts` | saved + own playlists fetch |
| `PublishFlow` | `src/features/curation/components/PublishFlow.tsx` | 3-step 모달 |
| `PublishCTA` | `src/features/curation/components/PublishCTA.tsx` | 라이브러리 상단 배너 |
| `MixedShelf` | `src/features/curation/components/MixedShelf.tsx` | F6 혼합 선반 |
| `usePublish` | `src/features/curation/hooks/usePublish.ts` | POST /api/user-playlists/publish |
| `useMixedShelf` | `src/features/curation/hooks/useMixedShelf.ts` | GET /api/mixed-shelf |
| `HomeContinueRail` | `src/features/home/components/HomeContinueRail.tsx` | § 1 이어듣기 섹션 |

### 5.4 Page UI Checklist

#### Home (`/`)

- [ ] Section: § 1 이어듣기 (title "이어듣기" + 자세히 보기 → `/me/library`)
- [ ] HomeContinueRail: `listens` 기반 최근 5개 플리 카드, 순서대로 노출
- [ ] Empty state for § 1: "아직 들은 플리가 없어요"
- [ ] Section: § 2 에디토리얼·컬렉션 (title + 자세히 보기 → `/collections`)
- [ ] MixedShelf: published_at DESC Top 12, curated + user 혼합
- [ ] Card 식별 배지: user 소유 시 발행자 avatar + display_name 표시
- [ ] Section: § 3 팔로우 큐레이터 (title + 자세히 보기 → `/me/following`)
- [ ] Section: § 4 전체 피드 (자세히 보기 → `/playlists`)
- [ ] Section: § 5 장르·아티스트 탐색 (자세히 보기 → `/genres`, `/artists`)
- [ ] MiniBar visible at bottom (if playerStore.status !== "idle")

#### `/me/library` (신규)

- [ ] Tab: "저장한 플리" (default)
- [ ] Tab: "내가 만든 컬렉션"
- [ ] Tab: "발행한 것만"
- [ ] PublishCTA banner (시각: 저장 3+이면 상단 노출, 미만이면 hidden)
- [ ] PublishCTA button: "묶어서 발행 →"
- [ ] PlaylistGrid: 저장한 플리 카드 리스트
- [ ] Empty state (저장 0): "아직 저장한 플리가 없어요. 홈에서 저장해보세요"
- [ ] MiniBar visible

#### `/playlist/[id]` (기존 + F3)

- [ ] ExpandedView: iframe이 이 자리에 transform으로 표시
- [ ] TrackList (기존)
- [ ] SaveButton in player bar (F3) — 기존 CollectionButton을 MiniBar로 이관, 본문은 유지
- [ ] Uploader card, comments (기존)
- [ ] MiniBar hidden (view === "expanded")

#### PublishFlow modal (3-step)

- [ ] Step 1: Multi-select grid with checkboxes
- [ ] Step 1: Counter "{n}/{total} 선택됨" with min 1 enforced
- [ ] Step 2: Title input (required, 1-100 chars)
- [ ] Step 2: Caption textarea (optional, max 140 chars, char counter)
- [ ] Step 3: Cover picker — 선택한 플리 썸네일들 + 업로드 버튼
- [ ] Navigation: [이전] [다음] [발행하기]
- [ ] Loading state on 발행하기 (disable + spinner)
- [ ] Success: redirect `/me/library` + toast

---

## 6. Error Handling

### 6.1 Error Code Definition

| Code | Message (KR) | Cause | Handling |
|------|---------|-------|----------|
| `PLAYER_INIT_FAILED` | 플레이어 초기화 실패 | YouTube iframe API 로드 실패 | 자동 재시도 2회, 실패 시 "페이지 새로고침을 시도해주세요" |
| `PLAYBACK_BLOCKED` | 자동재생이 차단됐습니다 | iOS Safari 정책 | 유저에게 재생 버튼 클릭 요청 UI |
| `SCROBBLE_NETWORK_ERROR` | — (silent) | `/api/listens` 호출 실패 | 3회 재시도 + localStorage queue → 다음 plays에 batch |
| `UNAUTHORIZED` | 로그인이 필요합니다 | 비로그인 저장/발행 시도 | LoginModal 오픈 |
| `VALIDATION_ERROR` | 입력 검증 실패 | Zod schema 위반 | field-level 에러 표시 |
| `PUBLISH_CONFLICT` | 이미 발행된 항목입니다 | 중복 발행 시도 | 기존 발행 보이기 + "수정하시겠습니까?" |
| `RATE_LIMITED` | — (silent) | scrobble 429 | 다음 polling 주기까지 대기 |

### 6.2 Error Response Format (API)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력이 올바르지 않습니다",
    "details": {
      "fieldErrors": {
        "caption": "140자 이하로 입력해주세요"
      }
    }
  }
}
```

### 6.3 Player Recovery Strategy (R1)

iframe 재생 이슈 발생 시 복구 순서:
1. `onError` 이벤트 포착 → `playerStore.status = "error"`
2. `lastPosition` (currentTime) 저장
3. iframe.loadVideoById(videoId, lastPosition) 재시도
4. 3회 재시도 실패 시 유저에게 "새로고침" 메시지 + 텔레메트리 전송

---

## 7. Security Considerations

- [ ] **RLS 이중 가드**: 모든 API route(`/api/listens`, `/api/user-playlists/*`)에서 Supabase RLS + Next.js route handler 세션 가드 이중 적용
- [ ] **Input validation**: Zod schema 적용 (/api/listens, /api/user-playlists/publish, patch)
- [ ] **Ownership check**: `PATCH/DELETE /api/user-playlists/:id`에서 `user_id = auth.uid()` 서버 검증
- [ ] **Rate limit**: `/api/listens` IP+user별 rate limit (예: 5분 내 100회 초과 시 429)
- [ ] **CSRF**: Next.js App Router Server Actions 사용 시 자동 CSRF 보호 유지
- [ ] **XSS**: caption/title은 `<>&` escape + 길이 제한. cover_url은 https:// URL만 허용 (Supabase Storage or YouTube 썸네일 whitelist)
- [ ] **CSP**: YouTube iframe 도메인 허용 (`*.youtube.com`, `*.ytimg.com`) — 기존 설정 유지
- [ ] **Unique index**: `listens` 중복 방지 (user_id, track_id, minute truncated)

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| L1: API Tests | `/api/listens`, `/api/user-playlists/*`, `/api/mixed-shelf` | Playwright request | Do |
| L2: UI Action Tests | MiniBar, Save button, PublishFlow, HomeContinueRail | Playwright | Do |
| L3: E2E Scenario Tests | Persistent playback, publish flow | Playwright | Do |

### 8.2 L1: API Test Scenarios

| # | Endpoint | Method | Description | Expected Status | Response |
|---|----------|--------|-------------|:--------------:|----------|
| 1 | `/api/listens` | POST | 유효한 scrobble insert | 201 | `.data.id` UUID |
| 2 | `/api/listens` | POST | 비로그인 차단 | 401 | `.error.code = UNAUTHORIZED` |
| 3 | `/api/listens` | POST | 1분 내 중복 insert | 409 | unique violation |
| 4 | `/api/listens` | POST | 음수 duration | 400 | `.error.code = VALIDATION_ERROR` |
| 5 | `/api/listens/recent` | GET | 5개 반환 | 200 | `.data.length <= 5`, DISTINCT playlist_id |
| 6 | `/api/user-playlists/publish` | POST | 유효한 발행 | 201 | `.data.published_at` exists |
| 7 | `/api/user-playlists/publish` | POST | 1개 미만 | 400 | VALIDATION_ERROR |
| 8 | `/api/user-playlists/publish` | POST | 비소유 플리 포함 | 403 | ownership violation |
| 9 | `/api/user-playlists/:id` | PATCH | 타인 수정 시도 | 403 | ownership violation |
| 10 | `/api/user-playlists/:id` | DELETE | 본인 삭제 | 204 | body empty |
| 11 | `/api/mixed-shelf` | GET | 혼합 결과 | 200 | `.data[]` has `source: 'curated'|'user'` mix, ORDER BY published_at DESC |

### 8.3 L2: UI Action Test Scenarios

| # | Page | Action | Expected Result | Verification |
|---|------|--------|----------------|--------------|
| 1 | `/` | Load | 5 sections visible | 섹션 heading 모두 렌더 |
| 2 | `/` | HomeContinueRail 비었을 때 | Empty state 메시지 | "아직 들은 플리가 없어요" |
| 3 | Any page | Click PlaylistCard play | MiniBar 등장 | `<MiniBar>` in DOM |
| 4 | Any page | MiniBar 저장 버튼 클릭 (비로그인) | LoginModal 표시 | modal visible |
| 5 | Any page | MiniBar 저장 버튼 클릭 (로그인) | 토스트 "라이브러리에 저장" | toast visible |
| 6 | `/me/library` | 저장 3+ | PublishCTA 노출 | CTA button visible |
| 7 | `/me/library` | 저장 0 | Empty state + CTA hidden | |
| 8 | PublishFlow | Step 1 — 1개만 선택 | [다음] disabled | button disabled |
| 9 | PublishFlow | Step 2 — title 비움 | [다음] disabled | |
| 10 | PublishFlow | Step 2 — caption 141자 | 에러 + 카운터 적색 | |
| 11 | PublishFlow | Step 3 — 발행하기 | 리다이렉트 + 토스트 | |

### 8.4 L3: E2E Scenario Test Scenarios

| # | Scenario | Steps | Success Criteria |
|---|----------|-------|-----------------|
| **1 (R1 CRITICAL)** | **Persistent playback** | 1. `/` 진입 2. PlaylistCard 재생 클릭 3. `/artists` 이동 4. `/playlist/[id]` 이동 5. `/me/library` 이동 | 4 전환 동안 **재생 단절 0회**, currentTime 누적, MiniBar 유지 |
| 2 | Scrobble E2E | 1. 재생 4분 2. 다른 플리로 전환 3. `/me/library` → 이어듣기 확인 | listens 테이블에 2개 row, `/api/listens/recent` 반영 |
| 3 | Save → Publish | 1. 3개 플리 저장 2. `/me/library` 진입 3. CTA 클릭 4. 3-step 완료 5. 홈 MixedShelf 확인 | MixedShelf 첫번째에 내 컬렉션 (published_at DESC) |
| 4 | 비로그인 재생 | 1. 비로그인 상태 2. 재생 클릭 3. 저장 버튼 클릭 | 재생 OK, 저장 시 LoginModal |
| 5 | Expanded view | 1. 재생 시작 2. `/playlist/[id]` 이동 3. 다른 페이지 이동 | Expanded → Mini 전환, iframe **재생 지속** |
| 6 | 발행 후 수정 | 1. 컬렉션 발행 2. `/me/library` → 내 컬렉션 3. 수정 → 카피 변경 | PATCH 성공, 홈에 반영 |
| 7 | 발행 후 삭제 | 1. 컬렉션 발행 2. 삭제 | MixedShelf에서 제거 |
| 8 | iOS 자동재생 정책 | (수동 실기기 테스트) | `playsinline` + 유저 제스처 OK |

### 8.5 Seed Data Requirements

| Entity | Minimum Count | Key Fields |
|--------|:------------:|------------|
| profiles | 3 | 1 admin, 2 alpha curators |
| playlists | 10 | title, youtube_id, 각 5 tracks |
| tracks | 50 | start_sec, duration_sec 필수 |
| user_playlists | 5 | 3 published, 2 private (backfill 테스트용) |
| curated_collections | 3 | title, is_active=true |
| listens | 0 (runtime-generated in E2E) | — |

`src/lib/db/seed.ts` 구현: Do phase M1 모듈에서 함께.

---

## 9. Clean Architecture

### 9.1 Layer Structure

| Layer | Responsibility | Location (v2 추가분만) |
|-------|---------------|------------------------|
| **Presentation** | UI, hooks (client) | `src/features/{player,curation,library}/components/`, `src/features/{player,curation,library}/hooks/` |
| **Application** | Domain orchestration | `src/features/{player,curation,library}/hooks/` (use-case 레벨), `src/lib/youtube-player.ts` |
| **Domain** | Types, entities | `src/types/player.ts`, `src/types/listen.ts`, `src/types/collection.ts` |
| **Infrastructure** | DB, API | `src/app/api/listens/route.ts`, `src/app/api/user-playlists/publish/route.ts`, `src/app/api/mixed-shelf/route.ts`, Supabase migrations |

### 9.2 This Feature's Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| `PersistentPlayer`, `MiniBar`, `ExpandedView`, `SaveButton` | Presentation | `src/features/player/components/` |
| `playerStore` (Zustand) | Application | `src/features/player/store.ts` |
| `useScrobble`, `useVisibility` | Application | `src/features/player/hooks/` |
| `youtubePlayer` (IFrame API 래퍼) | Infrastructure | `src/lib/youtube-player.ts` |
| `PublishFlow`, `PublishCTA`, `MixedShelf` | Presentation | `src/features/curation/components/` |
| `usePublish`, `useMixedShelf` | Application | `src/features/curation/hooks/` |
| `LibraryGrid` | Presentation | `src/features/library/components/` |
| `useLibrary` | Application | `src/features/library/hooks/` |
| `HomeContinueRail` | Presentation | `src/features/home/components/` (기존) |
| API routes (listens, publish, mixed-shelf) | Infrastructure | `src/app/api/` |
| `021_v2_player_scrobble.sql` | Infrastructure | `supabase/migrations/` |

---

## 10. Coding Convention Reference

### 10.1 Existing conventions (reuse)

- Folder: `src/features/{domain}/` (Option C Pragmatic)
- Component: PascalCase.tsx
- Hook: `use*.ts`
- Store: `store.ts` (Zustand)
- API route: `src/app/api/{resource}/route.ts`

### 10.2 v2-specific conventions

| Item | Convention |
|------|-----------|
| Design Ref 코멘트 | 모듈/파일 상단: `// Design Ref: §{section} — {decision}` |
| Success Criteria 코멘트 | Critical 로직: `// Plan SC: {criteria id}` |
| iframe 금지 | `<iframe src="*youtube*">`는 `PersistentPlayer.tsx` 외 파일에 등장 금지 (코드 리뷰에서 즉시 reject) |
| Zustand store | `getState()` 직접 호출 금지, hook으로만 접근 (제외: useScrobble 내 polling) |
| Migration 번호 | `021_v2_player_scrobble.sql` (연속 번호) |
| E2E 테스트 | `tests/e2e/clipclef-v2-{scenario}.spec.ts` |

---

## 11. Implementation Guide

### 11.1 File Structure

```
src/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx                            # MOD: mount <PersistentPlayer>
│   │   ├── page.tsx                              # MOD: F8 5섹션 재구성
│   │   └── me/
│   │       └── library/
│   │           └── page.tsx                      # NEW: F4
│   └── api/
│       ├── listens/
│       │   ├── route.ts                          # NEW: POST scrobble
│       │   └── recent/
│       │       └── route.ts                      # NEW: GET recent
│       ├── user-playlists/
│       │   ├── publish/
│       │   │   └── route.ts                      # NEW: F5
│       │   └── [id]/
│       │       └── route.ts                      # NEW: PATCH/DELETE (Letterboxd)
│       └── mixed-shelf/
│           └── route.ts                          # NEW: F6
│
├── features/
│   ├── player/                                   # NEW feature
│   │   ├── store.ts                              # Zustand playerStore
│   │   ├── components/
│   │   │   ├── PersistentPlayer.tsx              # iframe 단일 마운트
│   │   │   ├── MiniBar.tsx                       # 상시 노출
│   │   │   ├── ExpandedView.tsx                  # 플리 상세 확장뷰
│   │   │   └── SaveButton.tsx                    # F3 저장
│   │   └── hooks/
│   │       ├── useScrobble.ts                    # F2 polling
│   │       └── useVisibility.ts                  # visibility 보정
│   ├── curation/                                 # NEW feature
│   │   ├── components/
│   │   │   ├── PublishFlow.tsx                   # F5 3-step
│   │   │   ├── PublishCTA.tsx                    # 3+ 배너
│   │   │   └── MixedShelf.tsx                    # F6
│   │   └── hooks/
│   │       ├── usePublish.ts
│   │       └── useMixedShelf.ts
│   ├── library/                                  # NEW feature
│   │   ├── components/
│   │   │   └── LibraryGrid.tsx
│   │   └── hooks/
│   │       └── useLibrary.ts
│   ├── home/                                     # EXISTING
│   │   └── components/
│   │       └── HomeContinueRail.tsx              # NEW: § 1 이어듣기
│   └── interaction/                              # EXISTING (reuse useCollection)
│
├── lib/
│   ├── youtube-player.ts                         # NEW: IFrame API 래퍼
│   └── db/
│       └── seed.ts                               # NEW: 테스트 seed
│
├── types/
│   ├── player.ts                                 # NEW
│   ├── listen.ts                                 # NEW
│   └── collection.ts                             # NEW
│
├── components/
│   └── ui/
│       └── LoginModal.tsx                        # NEW (비로그인 차단)
│
supabase/
└── migrations/
    └── 021_v2_player_scrobble.sql                # NEW

tests/
└── e2e/
    ├── clipclef-v2-persistent.spec.ts            # L3-1 R1 critical
    ├── clipclef-v2-scrobble.spec.ts              # L3-2
    ├── clipclef-v2-publish.spec.ts               # L3-3
    ├── clipclef-v2-anon.spec.ts                  # L3-4
    └── clipclef-v2-api.spec.ts                   # L1 API tests
```

### 11.2 Implementation Order

1. [ ] **M1 DB migration**: `021_v2_player_scrobble.sql` + seed 데이터
2. [ ] **M2 Player infrastructure**: `lib/youtube-player.ts` + `playerStore` + `<PersistentPlayer>` + `<MiniBar>` + `<ExpandedView>`
3. [ ] **M3 Scrobble**: `useScrobble` + `useVisibility` + `/api/listens` + `/api/listens/recent`
4. [ ] **M4 Save UI + Library**: `<SaveButton>` (F3, MiniBar 안) + `/me/library` + `<LibraryGrid>` + `useLibrary` + `<LoginModal>`
5. [ ] **M5 Publish + Mixed shelf**: `<PublishCTA>` + `<PublishFlow>` + `/api/user-playlists/publish` + `/api/user-playlists/[id]` (PATCH/DELETE) + `<MixedShelf>` + `/api/mixed-shelf`
6. [ ] **M6 Home 5-section**: `<HomeContinueRail>` + `/` page restructure + Empty states
7. [ ] **M7 E2E tests + migration dry-run + 알파 런**: Playwright config + 4 spec files + 수동 smoke + migration apply

### 11.3 Session Guide

#### Module Map

| Module | Scope Key | Description | Est. Turns | Depends On |
|--------|-----------|-------------|:---------:|------------|
| **M1 DB** | `module-1-db` | Migration 021 + RLS + RPC + seed.ts | 15-20 | — |
| **M2 Player** | `module-2-player` | lib/youtube-player.ts + playerStore + PersistentPlayer + MiniBar + ExpandedView (layout mount) | 35-45 | M1 |
| **M3 Scrobble** | `module-3-scrobble` | useScrobble + useVisibility + /api/listens + /api/listens/recent | 25-30 | M1, M2 |
| **M4 Save/Library** | `module-4-library` | SaveButton (F3) + /me/library + LibraryGrid + useLibrary + LoginModal | 25-30 | M2 |
| **M5 Publish/Shelf** | `module-5-curation` | PublishCTA + PublishFlow + /api/user-playlists/publish|[id] + MixedShelf + useMixedShelf + /api/mixed-shelf | 35-45 | M1 |
| **M6 Home 5-section** | `module-6-home` | HomeContinueRail + / page restructure + Empty states | 20-25 | M3 (recent), M5 (shelf) |
| **M7 Tests + Alpha** | `module-7-tests` | Playwright config + 4 E2E spec files + seed run + migration live apply + 알파 큐레이터 초대링크 | 30-40 | ALL |

총: ~185-235 turns = **8-12 세션 (20-25 turns/세션 기준)**

#### Recommended Session Plan

| Session | Phase | Scope | Turns |
|---------|-------|-------|:-----:|
| 1 | Plan + Design | 전체 | 35-40 (완료) |
| 2 | Do | `--scope module-1-db` | 20 |
| 3 | Do | `--scope module-2-player` (part 1: lib + store + PersistentPlayer) | 25 |
| 4 | Do | `--scope module-2-player` (part 2: MiniBar + ExpandedView) | 25 |
| 5 | Do | `--scope module-3-scrobble` | 30 |
| 6 | Do | `--scope module-4-library` | 30 |
| 7 | Do | `--scope module-5-curation` (part 1: Publish flow) | 25 |
| 8 | Do | `--scope module-5-curation` (part 2: Mixed shelf) | 20 |
| 9 | Do | `--scope module-6-home` | 25 |
| 10 | Do | `--scope module-7-tests` | 35 |
| 11 | Check | `/pdca analyze clipclef-v2` + gap-detector | 30 |
| 12 | Act/Report | iterate if < 90% / report if ≥ 90% | 25-30 |

**Checkpoints during Do**:
- M2 완료 후: 페이지 전환 수동 스모크 — MiniBar 유지 확인
- M3 완료 후: 내부 감사 E1 (scrobble 7일 오차 < 10%)
- M5 완료 후: 알파 큐레이터 20명 섭외 병행 시작 (R3 mitigation)
- M7 완료 후: Migration dry-run (staging) → production apply

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-22 | Initial draft — Option C Pragmatic Balance, 7 modules, 8-12 sessions, full API/DB/UI spec | iamjinwang@gmail.com |
