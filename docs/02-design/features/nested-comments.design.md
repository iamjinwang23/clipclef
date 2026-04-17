# nested-comments Design Document

> **Summary**: 플레이리스트 댓글에 1단계 대댓글 기능 추가 — 항상 펼침, 답글 알림 포함
>
> **Project**: ClipClef (youchoose)
> **Date**: 2026-04-17
> **Status**: Draft
> **Planning Doc**: [nested-comments.plan.md](../../01-plan/features/nested-comments.plan.md)
> **Architecture**: Option C — Pragmatic Balance

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 댓글 간 대화 불가 → 커뮤니티 depth 부족, 재방문 동기 낮음 |
| **WHO** | 플리에 댓글을 남기는 로그인 유저 |
| **RISK** | Supabase nested select RLS 이중 적용 / notify_on_reply 자기 자신 알림 |
| **SUCCESS** | 대댓글 작성·표시·삭제·알림 E2E 동작, 대댓글에 답글 버튼 미노출 |
| **SCOPE** | Module-1: DB 트리거 → Module-2: 타입·훅 → Module-3: UI 컴포넌트 → Module-4: i18n |

---

## 1. Overview

### 1.1 Design Goals

- DB 트리거로 알림 생성 (클라이언트 독립, 서버 코드 불필요)
- Supabase nested select 단일 쿼리로 N+1 방지
- 기존 `CommentList` / `CommentForm` 인터페이스 호환 유지
- 1단계 제한을 UI와 DB 양쪽에서 강제

### 1.2 Design Principles

- **1단계 강제**: `parent_id IS NOT NULL`인 댓글에는 "답글 달기" 버튼 미표시 (UI), DB는 trigger에서 depth 체크 불필요 (INSERT 자체가 parent_id = leaf comment id면 가능하지만 UI에서 차단)
- **항상 펼침**: 접기/펼치기 없이 replies를 항상 렌더링
- **낙관적 업데이트 없음**: 단순 `invalidateQueries`로 일관성 우선

---

## 2. Architecture (Option C — Pragmatic Balance)

### 2.1 파일 구조

```
src/
  features/interaction/
    hooks/
      useComments.ts            ← [수정] nested 쿼리 + addReply mutation
    components/
      CommentList.tsx            ← [수정] replies 렌더링 + 답글 달기 버튼
      ReplyForm.tsx              ← [신규] 인라인 답글 입력 폼
      CommentForm.tsx            ← [유지] 변경 없음
  types/
    index.ts                    ← [수정] Comment 타입에 parent_id, replies 추가

supabase/migrations/
  017_reply_notification.sql    ← [신규] notify_on_reply 트리거

src/i18n/
  ko.json                       ← [수정] comment.reply* 키 추가
  en.json                       ← [수정] comment.reply* 키 추가
```

---

## 3. Data Model

### 3.1 comments 테이블 (기존 — 변경 없음)

```sql
-- migration 013에서 이미 추가됨
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES comments(id) ON DELETE SET NULL;
```

`parent_id IS NULL` → 최상위 댓글  
`parent_id IS NOT NULL` → 대댓글 (1단계만 허용, UI에서 강제)

### 3.2 notifications 트리거 (신규)

**파일**: `supabase/migrations/017_reply_notification.sql`

```sql
CREATE OR REPLACE FUNCTION notify_on_reply()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_author UUID;
BEGIN
  -- 대댓글인 경우만 처리
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO v_parent_author
    FROM comments
    WHERE id = NEW.parent_id;

    -- 자기 자신 답글 제외
    IF v_parent_author IS NOT NULL AND v_parent_author IS DISTINCT FROM NEW.user_id THEN
      INSERT INTO notifications (recipient_id, actor_id, type, entity_id, entity_type)
      VALUES (v_parent_author, NEW.user_id, 'reply', NEW.id, 'playlist');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_reply
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_reply();
```

---

## 4. Type Definitions

### 4.1 Comment 타입 수정

**파일**: `src/types/index.ts`

```typescript
export interface Comment {
  id: string;
  playlist_id: string;
  user_id: string;
  parent_id: string | null;           // 추가
  content: string;
  created_at: string;
  profiles: { display_name: string | null; avatar_url: string | null; is_verified: boolean };
  replies?: Comment[];                 // 추가 (최상위 댓글에만 존재)
}
```

---

## 5. Hook Design

### 5.1 useComments 수정

**파일**: `src/features/interaction/hooks/useComments.ts`

```typescript
// 쿼리 변경: parent_id IS NULL + nested replies
const { data: comments = [], isLoading } = useQuery<Comment[]>({
  queryKey: ['comments', playlistId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles(display_name, avatar_url, is_verified),
        replies:comments!comments_parent_id_fkey(
          *,
          profiles(display_name, avatar_url, is_verified)
        )
      `)
      .eq('playlist_id', playlistId)
      .is('parent_id', null)              // 최상위 댓글만
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Comment[];
  },
});

// addReply mutation 추가
const addReply = useMutation({
  mutationFn: async ({ parentId, content }: { parentId: string; content: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('로그인이 필요합니다');
    const { error } = await supabase
      .from('comments')
      .insert({ playlist_id: playlistId, user_id: user.id, parent_id: parentId, content });
    if (error) throw error;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', playlistId] }),
});

return { comments, isLoading, addComment, addReply, deleteComment };
```

**주의**: Supabase foreign key 역참조 alias `replies:comments!comments_parent_id_fkey` — FK 이름 확인 필요.

---

## 6. Component Design

### 6.1 ReplyForm (신규)

**파일**: `src/features/interaction/components/ReplyForm.tsx`

```
Props:
  playlistId: string
  parentId: string
  isLoggedIn: boolean
  onClose: () => void

UI:
  <textarea> (placeholder: "답글을 작성하세요", maxLength: 500, rows: 2)
  <button> 등록 / <button> 취소
  비로그인 클릭 시 → LoginModal
```

### 6.2 CommentList 수정

**파일**: `src/features/interaction/components/CommentList.tsx`

```
변경 사항:
1. comment.replies 렌더링 (들여쓰기 ml-8 + 세로 구분선 border-l)
2. 최상위 댓글에만 "답글 달기" 버튼 표시
3. "답글 달기" 클릭 → activeReplyId state로 해당 댓글 아래 ReplyForm 토글
4. 대댓글(reply)에는 "답글 달기" 버튼 미표시 (1단계 강제)
5. 대댓글 삭제: deleteComment.mutate(reply.id) (동일 함수 재사용)

State:
  activeReplyId: string | null  ← 현재 답글 폼이 열린 댓글 ID
```

**UI 구조**:

```
┌─ [아바타] 닉네임  N분 전  [삭제]
│   댓글 내용
│   [답글 달기]
│
│  ml-8 border-l border-[var(--border)] pl-3
│  ├─ [아바타] 닉네임  N분 전  [삭제]
│  │   대댓글 내용
│  └─ [아바타] 닉네임  N분 전  [삭제]
│      대댓글 내용
│
│  [ReplyForm — activeReplyId === comment.id일 때 표시]
└─ ...
```

---

## 7. i18n Keys

### ko.json `comment` 객체에 추가

```json
"reply": "답글",
"replyPlaceholder": "답글을 작성하세요 (최대 500자)",
"replyCancel": "취소",
"replySubmit": "등록",
"replyLoginRequired": "로그인 후 답글을 작성할 수 있습니다"
```

### en.json `comment` 객체에 추가

```json
"reply": "Reply",
"replyPlaceholder": "Write a reply (max 500 chars)",
"replyCancel": "Cancel",
"replySubmit": "Submit",
"replyLoginRequired": "Please log in to reply"
```

---

## 8. Test Plan

| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| T-01 | 로그인 후 댓글에 "답글 달기" 클릭 | ReplyForm 인라인 노출 |
| T-02 | 대댓글 작성 후 등록 | 즉시 해당 댓글 아래 렌더링 |
| T-03 | 대댓글에 "답글 달기" 버튼 | 미노출 확인 |
| T-04 | 비로그인 "답글 달기" 클릭 | LoginModal 노출 |
| T-05 | 대댓글 삭제 (본인) | 해당 대댓글 제거, 나머지 유지 |
| T-06 | notifications 테이블 확인 | 'reply' 타입 알림 생성 확인 |
| T-07 | 자기 자신 대댓글 | 알림 미생성 확인 |

---

## 9. RLS 확인 사항

기존 `comments` 테이블 INSERT 정책이 `parent_id` 포함 INSERT를 허용하는지 확인:

```sql
-- 기존 정책 확인 (Supabase Dashboard → Authentication → Policies)
-- comments: INSERT 정책에 parent_id 컬럼 제한 없으면 그대로 동작
```

Supabase nested select(replies 포함)는 동일 RLS 정책 적용 → 별도 정책 불필요.

---

## 10. Risk Mitigation

| 위험 | 대응 |
|------|------|
| `!comments_parent_id_fkey` FK alias 오류 | migration에서 FK 이름 확인 후 정확한 alias 사용 |
| notify_on_reply 자기 자신 알림 | `IS DISTINCT FROM` 조건으로 방어 |
| nested select replies 정렬 | `replies` 하위에 `.order()` 적용 불가 → client-side sort by created_at |

---

## 11. Implementation Guide

### 11.1 구현 순서

1. **Module-1** — DB: `017_reply_notification.sql` 작성 및 적용
2. **Module-2** — Types + Hook: `Comment` 타입 업데이트, `useComments` nested 쿼리 + `addReply`
3. **Module-3** — UI: `ReplyForm.tsx` 신규, `CommentList.tsx` 업데이트
4. **Module-4** — i18n: `ko.json`, `en.json` reply 키 추가

### 11.2 의존성

- 추가 패키지 없음 (Supabase, TanStack Query 기존 그대로)

### 11.3 Session Guide

| Module | 파일 | 예상 작업량 |
|--------|------|-----------|
| module-1 | `017_reply_notification.sql` | ~25줄 |
| module-2 | `types/index.ts`, `useComments.ts` | ~30줄 |
| module-3 | `ReplyForm.tsx` (신규), `CommentList.tsx` | ~80줄 |
| module-4 | `ko.json`, `en.json` | ~10줄 |

전체 1세션 구현 가능 (약 145줄). `--scope module-1,module-2` 또는 전체 한번에.
