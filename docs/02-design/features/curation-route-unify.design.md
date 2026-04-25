# Design: curation-route-unify

**Feature**: curation-route-unify
**Phase**: Design
**Created**: 2026-04-26
**Plan Ref**: `docs/01-plan/features/curation-route-unify.plan.md`

---

## 1. 데이터 흐름 (`/collection/[id]` 확장)

```
URL /collection/:id (server)
  └─ getCollection(id):
       1. SELECT * FROM curated_collections WHERE id = :id AND is_active
            → 발견? source='curated', items via curated_collection_items + playlists
       2. ELSE SELECT * FROM user_playlists WHERE id = :id AND published_at IS NOT NULL
            → 발견? source='user', items via user_playlist_items + playlists,
                    creator via profiles JOIN(user_id)
       3. ELSE notFound()
```

**서비스 클라이언트**: 그대로 service role 사용 (curated 공개 + user_playlists는 published_at 있어야 노출 — service에서 직접 조건 부여).

## 2. 반환 타입

```ts
type CollectionData = {
  source: 'curated' | 'user';
  id: string;
  title: string;             // curated.title | user_playlists.name
  description: string | null;// curated.description | user_playlists.caption
  coverUrl: string | null;   // curated.banner_image_url | user_playlists.cover_url
  items: Playlist[];
  creator: {                 // user source일 때만
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
  } | null;
};
```

## 3. UI 분기 (CollectionPageClient)

| 영역 | curated | user |
|------|---------|------|
| 히어로 라벨 | "큐레이션 · 플레이리스트 N개" | "큐레이션 · 플레이리스트 N개" (동일) |
| 상단 헤더(추가) | (없음) | `<UserAvatar> + name + VerifiedBadge + UserFollowChip` — 히어로 위 1줄 |
| 본문 | 그대로 | 그대로 |

`creator` prop optional → 있을 때만 헤더 렌더 (기존 admin URL regression 0).

## 4. Migration 023

```sql
-- top_playlists ORDER BY: like_count DESC, created_at DESC
-- 인덱스: 인기순 인덱스 부재 시 idempotent 추가
CREATE INDEX IF NOT EXISTS idx_playlists_active_likes
  ON playlists (like_count DESC, created_at DESC)
  WHERE is_active = true;
```

함수 본문은 022에서 ORDER BY 한 줄만 수정 — 나머지 동일.

## 5. 프로필 큐레이션 카드

기존: 큐레이션마다 4-grid 미리보기.
변경: 큐레이션 1건 = 카드 1개.

```
[CoverImage 16:9]
[name (line-clamp-2)]
[N개 플리 · YYYY-MM-DD]
```

데이터 로드:
```ts
user_playlists.id, name, cover_url, published_at
LEFT JOIN user_playlist_items (count + first item's playlists.thumbnail_url)
WHERE user_id = :userId AND published_at IS NOT NULL
ORDER BY published_at DESC
```

cover_url 비었을 때 첫 아이템 썸네일 fallback. 둘 다 없으면 placeholder.

`is_public` 필터 → `published_at IS NOT NULL`로 교체 (Migration 021 정합성).

## 6. 라벨 변경

| 위치 | Before | After |
|------|--------|-------|
| `page.tsx` `<HomeSection label>` | "전체 피드" | "전체 플레이리스트" |
| `page.tsx` 상단 주석 § 4 | "전체 피드" | "전체 플레이리스트" |
| `PlaylistHomeSection.tsx` 주석 | "전체 피드" | "전체 플레이리스트" |

문서(00-pm, 01-plan, 02-design v2)는 본 PDCA 범위 외 (archive 시 일괄).

## 7. 미해결/후속

- 비공개 user_playlist 본인 preview — 후속 PDCA `curation-self-preview`
- `/collection/[id]` → `/curation/[id]` URL rename — post-MVP
- 큐레이션 상세 페이지 디자인 리뉴얼 — 별도 트랙

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-26 | Initial — Plan v0.1 implementation notes | iamjinwang@gmail.com |
