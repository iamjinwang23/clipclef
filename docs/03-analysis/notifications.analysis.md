# notifications Gap Analysis

> **Date**: 2026-04-13
> **Phase**: Check
> **Match Rate**: 100%
> **Method**: Static Analysis (서버 미실행)

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

## 1. Structural Match — 100%

| 파일 | 설계 스펙 | 존재 여부 | 결과 |
|------|----------|----------|------|
| `013_notifications.sql` | 신규 | ✅ | Match |
| `formatRelativeTime.ts` | 신규 | ✅ | Match |
| `NotificationItem.tsx` | 신규 | ✅ | Match |
| `NotificationBell.tsx` | 신규 | ✅ | Match |
| `/me/notifications/page.tsx` | 신규 | ✅ | Match |
| `CommentList.tsx` | 수정 (formatRelativeTime) | ✅ | Match |
| `Header.tsx` | 수정 (NotificationBell) | ✅ | Match |

## 2. Functional Depth — 100%

| FR | 요구사항 | 구현 근거 | 상태 |
|----|---------|----------|------|
| FR-01 | notifications 테이블 생성 | `013_notifications.sql` | ✅ |
| FR-02 | follows INSERT 트리거 | `notify_on_follow()` SECURITY DEFINER | ✅ |
| FR-03 | likes INSERT 트리거 | `notify_on_like()` + playlists JOIN | ✅ |
| FR-04 | comments INSERT 트리거 (parent_id IS NULL) | `notify_on_comment()` | ✅ |
| FR-05 | comments.parent_id 컬럼 추가 | `013_notifications.sql` ALTER TABLE | ✅ |
| FR-06 | formatRelativeTime (Instagram 스타일) | `formatRelativeTime.ts` + `CommentList.tsx` | ✅ |
| FR-07 | 헤더 벨 아이콘 + 빨간 점 | `NotificationBell.tsx:110` unreadCount > 0 | ✅ |
| FR-08 | 데스크톱 드롭다운 (최신 20개, 읽음처리) | `fetchNotifications()` limit(20) + update is_read | ✅ |
| FR-09 | 모바일 벨 클릭 → /me/notifications | `handleBellClick` window.innerWidth < 640 | ✅ |
| FR-10 | 알림 페이지 (최신 50개) | `/me/notifications/page.tsx` limit(50) | ✅ |
| FR-11 | Realtime 구독 (INSERT 감지) | `postgres_changes` filter `recipient_id=eq.{userId}` | ✅ |
| FR-12 | 알림 클릭 → is_read + 페이지 이동 | `handleItemClick` + `fetchNotifications` 읽음 처리 | ✅ |

## 3. API Contract — 100%

| 항목 | 설계 | 구현 | 결과 |
|------|------|------|------|
| Supabase Realtime filter | `recipient_id=eq.{userId}` | ✅ | Match |
| actor join 쿼리 | `actor:profiles!actor_id(...)` | ✅ | Match |
| 드롭다운 limit | 20 | ✅ limit(20) | Match |
| 모바일 페이지 limit | 50 | ✅ limit(50) | Match |
| 자기 자신 방어 | IS DISTINCT FROM | ✅ | Match |
| RLS | read_own + update_own | ✅ | Match |
| window.innerWidth 분기 | < 640 | ✅ | Match |

## 4. Match Rate

```
Static-only: (Structural × 0.2) + (Functional × 0.4) + (Contract × 0.4)
           = (100 × 0.2) + (100 × 0.4) + (100 × 0.4)
           = 100%
```

## 5. Issues

| # | 심각도 | 내용 | 결정 |
|---|--------|------|------|
| 1 | Minor | Plan FR-10 "무한스크롤 or 페이지네이션" → Design에서 limit(50)으로 단순화됨 | MVP 허용, 추후 구현 |
| 2 | Minor | Supabase 마이그레이션(013), avatars Storage 버킷 수동 적용 필요 | 배포 후 Supabase 대시보드에서 수동 실행 |

## 6. Plan Success Criteria 검토

| 기준 | 상태 | 근거 |
|------|------|------|
| 팔로우·좋아요·댓글 → 헤더 빨간 점 | ✅ Met | Realtime INSERT → setUnreadCount(c+1) → red dot render |
| 알림 목록 정확 조회 | ✅ Met | notifications + actor join, RLS own-only |
| 댓글 날짜 상대 시간 | ✅ Met | formatRelativeTime in CommentList |
| 모바일 벨 → 알림 페이지 | ✅ Met | window.innerWidth < 640 → router.push |
| 데스크톱 벨 → 드롭다운 | ✅ Met | !open → fetchNotifications → setOpen(true) |
| TypeScript 빌드 오류 없음 | ✅ Met | tsc --noEmit 0 errors |

**Success Rate: 6/6 (100%)**

---

## 7. Verdict

**Match Rate 100% ≥ 90% → 리포트 단계로 진행**
