# playlist-comment-count Design Document

> **Summary**: playlists.comment_count 비정규화 컬럼 + 트리거, PlaylistCard 💬 N 표시
>
> **Project**: ClipClef (youchoose)
> **Date**: 2026-04-13
> **Status**: Draft
> **Planning Doc**: [playlist-comment-count.plan.md](../../01-plan/features/playlist-comment-count.plan.md)
> **Architecture**: Option C — Pragmatic (Minimal + GREATEST 방어)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 댓글 활성도 불가시 → 커뮤니티 활성 플리 발견 어려움 |
| **WHO** | 리스트 페이지 방문자 전체 |
| **RISK** | 기존 notify_on_comment 트리거와 독립 동작 필요, DELETE 시 음수 방지 |
| **SUCCESS** | PlaylistCard에 💬 N 표시, 실제 댓글 수와 일치 |
| **SCOPE** | Migration 014 + 타입 + PlaylistCard UI — 단일 세션 |

---

## 1. Architecture

### 1.1 파일 구조

```
supabase/migrations/
  014_playlist_comment_count.sql   ← [신규] 컬럼 + 백필 + 트리거

src/
  types/index.ts                   ← [수정] comment_count: number 추가
  features/playlist/components/
    PlaylistCard.tsx               ← [수정] 💬 N UI 추가
```

총 3개 파일 (신규 1 + 수정 2)

---

## 2. DB 설계

### 2.1 Migration 014

```sql
-- ─── 1. 컬럼 추가 ────────────────────────────────────────────────────────────
ALTER TABLE playlists
  ADD COLUMN IF NOT EXISTS comment_count INT NOT NULL DEFAULT 0;

-- ─── 2. 기존 댓글 수 백필 ────────────────────────────────────────────────────
UPDATE playlists p
SET comment_count = (
  SELECT COUNT(*) FROM comments c WHERE c.playlist_id = p.id
);

-- ─── 3. INSERT 트리거 함수 ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE playlists SET comment_count = comment_count + 1
  WHERE id = NEW.playlist_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_comment_count
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION increment_comment_count();

-- ─── 4. DELETE 트리거 함수 ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION decrement_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE playlists SET comment_count = GREATEST(0, comment_count - 1)
  WHERE id = OLD.playlist_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decrement_comment_count
  AFTER DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION decrement_comment_count();
```

---

## 3. 타입 변경

```typescript
// src/types/index.ts — Playlist 인터페이스
export interface Playlist {
  // ... 기존 필드 ...
  like_count: number;
  comment_count: number;  // ← 추가
  // ...
}
```

---

## 4. UI 설계

### 4.1 PlaylistCard 하단 (현재 → 변경)

**현재:**
```tsx
<div className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
  <span>♥</span>
  <span>{playlist.like_count.toLocaleString()}</span>
</div>
```

**변경:**
```tsx
<div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
  <span className="flex items-center gap-1">
    <span>♥</span>
    <span>{playlist.like_count.toLocaleString()}</span>
  </span>
  <span className="flex items-center gap-1">
    <span>💬</span>
    <span>{playlist.comment_count.toLocaleString()}</span>
  </span>
</div>
```

---

## 5. 구현 순서

```
1. supabase/migrations/014_playlist_comment_count.sql 작성
2. src/types/index.ts — comment_count 추가
3. src/features/playlist/components/PlaylistCard.tsx — UI 수정
```
