# notifications Design Document

> **Summary**: 팔로우·좋아요·댓글 알림 시스템, 상대 시간 표기, 헤더 벨 아이콘 (웹 드롭다운 / 모바일 페이지)
>
> **Project**: ClipClef (youchoose)
> **Author**: —
> **Date**: 2026-04-13
> **Status**: Draft
> **Planning Doc**: [notifications.plan.md](../../01-plan/features/notifications.plan.md)
> **Architecture**: Option C — Pragmatic Balance

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 상호작용 알림 부재로 재방문 동기 및 커뮤니티 활성도 저하 |
| **WHO** | 로그인한 모든 회원 (알림 수신자) |
| **RISK** | DB 트리거 자기 자신 알림 생성 / likes 테이블에 업로더 정보 없어 JOIN 필요 |
| **SUCCESS** | 팔로우·좋아요·댓글 → 1s 이내 헤더 빨간 점, 알림 목록 정확 조회 |
| **SCOPE** | Module-1: DB → Module-2: 상대 시간 → Module-3: 컴포넌트 → Module-4: 페이지·헤더 |

---

## 1. Overview

### 1.1 Design Goals

- DB 트리거로 알림 생성 (클라이언트 독립적, 서버 코드 불필요)
- Supabase Realtime으로 헤더 카운터 실시간 갱신
- 웹/모바일에서 각기 최적화된 UX 제공
- 댓글 날짜를 Instagram 스타일 상대 시간으로 통일

### 1.2 Design Principles

- **트리거 격리**: 자기 자신 행동은 알림 생성 안 함 (`follower_id != following_id` 조건)
- **컴포넌트 공유**: `NotificationItem`을 드롭다운과 모바일 페이지에서 재사용
- **화면 분기**: 벨 클릭 시 `window.innerWidth < 640`으로 모바일/데스크톱 분기

---

## 2. Architecture

### 2.1 파일 구조

```
src/
  features/notification/
    components/
      NotificationBell.tsx       ← [신규] 벨 아이콘 + Realtime + 드롭다운 (웹)
      NotificationItem.tsx       ← [신규] 알림 아이템 (드롭다운 + 페이지 공유)
    lib/
      formatRelativeTime.ts      ← [신규] 상대 시간 유틸
  app/[locale]/me/notifications/
    page.tsx                     ← [신규] 모바일 전용 알림 페이지
  features/interaction/components/
    CommentList.tsx              ← [수정] formatDate → formatRelativeTime
  components/layout/
    Header.tsx                   ← [수정] NotificationBell 추가
supabase/migrations/
  013_notifications.sql          ← [신규] 테이블 + parent_id + 트리거 + RLS
```

---

## 3. Data Model

### 3.1 notifications 테이블

```sql
CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('follow', 'like', 'comment', 'reply')),
  entity_id    UUID,          -- playlist_id or comment_id
  entity_type  TEXT,          -- 'playlist' | 'profile'
  is_read      BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications (recipient_id, created_at DESC);
CREATE INDEX idx_notifications_unread    ON notifications (recipient_id, is_read) WHERE is_read = FALSE;
```

### 3.2 comments.parent_id 추가

```sql
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES comments(id);
```

### 3.3 DB 트리거

#### follows → notification

```sql
CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER AS $$
BEGIN
  -- 자기 자신 팔로우 방지 (CHECK 제약에도 있지만 이중 방어)
  IF NEW.follower_id != NEW.following_id THEN
    INSERT INTO notifications (recipient_id, actor_id, type, entity_id, entity_type)
    VALUES (NEW.following_id, NEW.follower_id, 'follow', NEW.follower_id, 'profile');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_follow
  AFTER INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION notify_on_follow();
```

#### likes → notification

```sql
CREATE OR REPLACE FUNCTION notify_on_like()
RETURNS TRIGGER AS $$
DECLARE v_uploader UUID;
BEGIN
  SELECT uploaded_by INTO v_uploader FROM playlists WHERE id = NEW.playlist_id;
  -- 업로더가 없는 플리(관리자 등록)이거나 자기 자신 좋아요는 알림 제외
  IF v_uploader IS NOT NULL AND v_uploader != NEW.user_id THEN
    INSERT INTO notifications (recipient_id, actor_id, type, entity_id, entity_type)
    VALUES (v_uploader, NEW.user_id, 'like', NEW.playlist_id, 'playlist');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_like
  AFTER INSERT ON likes
  FOR EACH ROW EXECUTE FUNCTION notify_on_like();
```

#### comments → notification

```sql
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE v_uploader UUID;
BEGIN
  -- parent_id IS NULL = 최상위 댓글만 알림 (대댓글은 추후)
  IF NEW.parent_id IS NULL THEN
    SELECT uploaded_by INTO v_uploader FROM playlists WHERE id = NEW.playlist_id;
    IF v_uploader IS NOT NULL AND v_uploader != NEW.user_id THEN
      INSERT INTO notifications (recipient_id, actor_id, type, entity_id, entity_type)
      VALUES (v_uploader, NEW.user_id, 'comment', NEW.playlist_id, 'playlist');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_comment
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_comment();
```

### 3.4 RLS 정책

```sql
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 자신의 알림만 읽기 가능
CREATE POLICY "notifications_read_own"
  ON notifications FOR SELECT
  USING (auth.uid() = recipient_id);

-- 시스템(SECURITY DEFINER 트리거)이 생성, 사용자는 직접 생성 불가
-- is_read 업데이트 (읽음 처리)는 본인만
CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);
```

---

## 4. Relative Time Rules

### 4.1 `formatRelativeTime(iso: string): string`

| 경과 시간 | 표시 |
|-----------|------|
| < 60초 | 방금 전 |
| 1분 ~ 59분 | N분 전 |
| 1시간 ~ 23시간 | N시간 전 |
| 1일 ~ 6일 | N일 전 |
| 7일 ~ 29일 | N주 전 |
| 30일 이상 | YYYY.MM.DD |

```typescript
export function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const diff = Math.floor((now - new Date(iso).getTime()) / 1000); // seconds

  if (diff < 60)   return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}주 전`;

  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
```

---

## 5. Component Design

### 5.1 NotificationItem

**Props:**
```typescript
interface NotificationItemProps {
  notification: {
    id: string;
    type: 'follow' | 'like' | 'comment' | 'reply';
    actor: { display_name: string | null; avatar_url: string | null };
    entity_id: string | null;
    entity_type: string | null;
    is_read: boolean;
    created_at: string;
  };
  locale: string;
  onClick?: (id: string, entityId: string | null, entityType: string | null) => void;
}
```

**알림 텍스트 규칙:**
| type | 텍스트 |
|------|--------|
| follow | `{actor}님이 팔로우하기 시작했습니다` |
| like | `{actor}님이 플리에 좋아요를 눌렀습니다` |
| comment | `{actor}님이 플리에 댓글을 남겼습니다` |
| reply | `{actor}님이 댓글에 답글을 남겼습니다` |

**읽음 시각 표시:** `is_read === false` → 왼쪽 border-l-2 border-blue-400 or 배경 강조

### 5.2 NotificationBell

**내부 상태:**
```typescript
const [unreadCount, setUnreadCount] = useState(0);
const [open, setOpen] = useState(false);
const [notifications, setNotifications] = useState<Notification[]>([]);
const [loadingList, setLoadingList] = useState(false);
```

**초기 unread count 로드:**
```typescript
useEffect(() => {
  if (!userId) return;
  supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false)
    .then(({ count }) => setUnreadCount(count ?? 0));
}, [userId]);
```

**Realtime 구독:**
```typescript
useEffect(() => {
  if (!userId) return;
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `recipient_id=eq.${userId}`,
    }, () => setUnreadCount(c => c + 1))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [userId]);
```

**벨 클릭 분기:**
```typescript
const handleBellClick = () => {
  if (window.innerWidth < 640) {
    router.push(`/${locale}/me/notifications`);
  } else {
    if (!open) fetchNotifications();
    setOpen(v => !v);
  }
};
```

**드롭다운 데이터 로드:**
```typescript
const fetchNotifications = async () => {
  setLoadingList(true);
  const { data } = await supabase
    .from('notifications')
    .select(`
      id, type, entity_id, entity_type, is_read, created_at,
      actor:profiles!actor_id(display_name, avatar_url)
    `)
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  setNotifications((data ?? []) as Notification[]);
  setLoadingList(false);
  // 읽음 처리
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);
  setUnreadCount(0);
};
```

**벨 아이콘 렌더링 위치:**
```
Header 우측 영역 (user && ...):
  [검색 아이콘 (모바일)] [+ 만들기] [NotificationBell] [프로필 드롭다운]
```

벨 아이콘 SVG: outline bell, white (text-white), w-5 h-5

### 5.3 모바일 알림 페이지

**경로:** `/[locale]/me/notifications`

**서버 컴포넌트** (데이터 SSR):
```typescript
// 최신 50개 알림 조회
const { data } = await supabase
  .from('notifications')
  .select('id, type, entity_id, entity_type, is_read, created_at, actor:profiles!actor_id(display_name, avatar_url)')
  .eq('recipient_id', user.id)
  .order('created_at', { ascending: false })
  .limit(50);

// 모두 읽음 처리 (페이지 접근 시)
await supabase
  .from('notifications')
  .update({ is_read: true })
  .eq('recipient_id', user.id)
  .eq('is_read', false);
```

**레이아웃:**
```
← 뒤로    알림
─────────────────────────────────────────────
[Avatar] {actor}님이 팔로우하기 시작했습니다  방금 전
[Avatar] {actor}님이 플리에 좋아요를 눌렀습니다  2분 전
...
```

### 5.4 CommentList 수정

**변경:** `formatDate(iso)` → `formatRelativeTime(iso)` 교체

```typescript
// 제거:
// function formatDate(iso: string) { ... }

// 추가:
import { formatRelativeTime } from '@/features/notification/lib/formatRelativeTime';

// 사용:
<span className="text-xs text-[var(--text-secondary)]">
  {formatRelativeTime(comment.created_at)}
</span>
```

### 5.5 Header 수정

```typescript
// 추가 import:
import NotificationBell from '@/features/notification/components/NotificationBell';

// user 분기 안에 추가 (프로필 드롭다운 바로 앞):
{user && (
  <NotificationBell userId={user.id} locale={locale} />
)}
```

---

## 6. API / Data Flow

### 6.1 알림 생성 플로우 (DB 트리거)

```
사용자 행동                DB 트리거                notifications 테이블
    │                         │                           │
    ├─ follow INSERT ─────────►│ notify_on_follow() ──────►│ INSERT (type=follow)
    ├─ likes INSERT ──────────►│ notify_on_like()   ──────►│ INSERT (type=like)
    └─ comments INSERT ────────►│ notify_on_comment()──────►│ INSERT (type=comment)
```

### 6.2 실시간 카운터 갱신

```
notifications INSERT           Supabase Realtime
      │                              │
      └─ 새 행 감지 ─────────────────►│ NotificationBell.onPostgresChanges
                                      │  → setUnreadCount(c => c + 1)
                                      │  → 빨간 점 표시
```

---

## 7. Error Handling

| 상황 | 처리 |
|------|------|
| Realtime 구독 실패 | 조용히 실패 (unread count는 정적 값 유지) |
| 알림 목록 로드 실패 | "알림을 불러오지 못했습니다" 표시 |
| 읽음 처리 실패 | UI는 업데이트, DB 오류 무시 (재시도 불필요) |
| likes 업로더 없음 | 트리거에서 NULL 체크 후 스킵 |

---

## 8. Test Plan

| 시나리오 | 기대 결과 |
|---------|---------|
| A → B 팔로우 | B 헤더 벨에 빨간 점 (1초 이내) |
| 자기 자신 팔로우 (불가하지만 방어) | 알림 미생성 |
| A → B 플리 좋아요 | B 헤더 벨에 빨간 점 |
| 관리자 등록 플리(uploaded_by=NULL) 좋아요 | 알림 미생성 |
| A → B 플리 댓글 | B 헤더 벨에 빨간 점 |
| 데스크톱 벨 클릭 | 드롭다운 열림, 최신 20개 표시, 읽음 처리 |
| 모바일 벨 클릭 | `/me/notifications` 페이지 이동 |
| 댓글 날짜 표시 | "방금 전", "N분 전" 등 상대 시간 |

---

## 9. Security

| 항목 | 처리 |
|------|------|
| 알림 RLS | `recipient_id = auth.uid()` — 자신의 알림만 조회/수정 |
| 트리거 SECURITY DEFINER | RLS 우회하여 notifications 삽입 (안전한 서버 측 로직) |
| 직접 알림 삽입 | INSERT 정책 미설정 → 클라이언트에서 직접 삽입 불가 |

---

## 10. Implementation Guide

### 10.1 구현 순서

```
Module-1: DB 마이그레이션
  - 013_notifications.sql:
    comments.parent_id 추가 →
    notifications 테이블 생성 →
    인덱스 →
    트리거 3개 (follow, like, comment) →
    RLS 정책

Module-2: 상대 시간 + CommentList
  - formatRelativeTime.ts 신규
  - CommentList.tsx: formatDate → formatRelativeTime

Module-3: 알림 컴포넌트
  - NotificationItem.tsx 신규
  - NotificationBell.tsx 신규 (Realtime 구독 포함)

Module-4: 모바일 페이지 + Header 연결
  - /me/notifications/page.tsx 신규
  - Header.tsx: NotificationBell import + 배치
```

### 10.2 파일별 변경 요약

| 파일 | 작업 | 예상 규모 |
|------|------|----------|
| `013_notifications.sql` | 신규 | ~80줄 |
| `formatRelativeTime.ts` | 신규 | ~20줄 |
| `NotificationItem.tsx` | 신규 | ~60줄 |
| `NotificationBell.tsx` | 신규 | ~130줄 |
| `/me/notifications/page.tsx` | 신규 | ~60줄 |
| `CommentList.tsx` | 수정 | -8+3줄 |
| `Header.tsx` | 수정 | +5줄 |

### 10.3 Session Guide

#### Module Map

| Module | 내용 | 파일 |
|--------|------|------|
| module-1 | DB 마이그레이션 | `013_notifications.sql` |
| module-2 | 상대 시간 유틸 + CommentList | `formatRelativeTime.ts`, `CommentList.tsx` |
| module-3 | 알림 컴포넌트 (Bell + Item) | `NotificationBell.tsx`, `NotificationItem.tsx` |
| module-4 | 모바일 페이지 + Header | `/me/notifications/page.tsx`, `Header.tsx` |

#### Recommended Session Plan

```
Single Session: /pdca do notifications
  → module-1 → module-2 → module-3 → module-4 순서

분리 옵션:
  Session A: /pdca do notifications --scope module-1,module-2
  Session B: /pdca do notifications --scope module-3,module-4
```
