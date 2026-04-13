# notifications Planning Document

> **Summary**: 팔로우·좋아요·댓글 알림 시스템, 상대 시간 표기, 헤더 벨 아이콘 (웹 드롭다운 / 모바일 페이지)
>
> **Project**: ClipClef (youchoose)
> **Version**: —
> **Author**: —
> **Date**: 2026-04-13
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 팔로우·좋아요·댓글 등 사용자 간 상호작용이 발생해도 수신자가 알 방법이 없어 재방문 동기가 낮음 |
| **Solution** | `notifications` 테이블 + Supabase DB 트리거로 알림 생성, Realtime 구독으로 헤더 벨 아이콘 실시간 갱신 |
| **Function/UX Effect** | 팔로우·좋아요·댓글 발생 시 즉각 알림 → 헤더 빨간 점 표시 → 웹 드롭다운 or 모바일 페이지로 확인 |
| **Core Value** | 사용자 간 연결감 강화, 플랫폼 재방문율 향상 |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 상호작용 알림 부재로 재방문 동기 및 커뮤니티 활성도 저하 |
| **WHO** | 로그인한 모든 회원 (알림 수신자) |
| **RISK** | DB 트리거 과다 발생 시 알림 테이블 성적 저하, Realtime 연결 수 제한 |
| **SUCCESS** | 팔로우·좋아요·댓글 발생 → 1s 이내 헤더 빨간 점 표시, 알림 목록 정확 조회 |
| **SCOPE** | Phase 1: DB 테이블·트리거 / Phase 2: 상대 시간 표기 / Phase 3: 헤더 UI / Phase 4: 드롭다운·페이지 |

---

## 1. Overview

### 1.1 Purpose

ClipClef의 팔로우·좋아요·댓글 기능이 이미 구현되어 있지만, 수신자에게 알리는 수단이 없다. 알림 시스템을 추가해 사용자 간 상호작용을 가시화하고 플랫폼 재방문을 유도한다.

### 1.2 Background

- `follows`, `likes`, `comments` 테이블이 이미 존재 (migration 001, 009)
- 대댓글은 추후 추가 예정 → `comments.parent_id` 컬럼만 선제 준비
- 현재 댓글 날짜는 `YYYY년 M월 D일` 형식 → Instagram 스타일 상대 시간으로 전환
- 헤더는 로고 / 검색창 / 프로필 드롭다운 구조 → 프로필 좌측에 벨 아이콘 추가

### 1.3 Related Documents

- `src/features/interaction/components/CommentList.tsx` — 댓글 날짜 포맷
- `src/components/layout/Header.tsx` — 헤더 구조
- `supabase/migrations/009_user_upload_follows.sql` — follows 테이블
- `supabase/migrations/001_initial_schema.sql` — likes, comments 테이블

---

## 2. Scope

### 2.1 In Scope

- [x] `notifications` 테이블 신규 생성 (type: follow | like | comment | reply)
- [x] DB 트리거: follows INSERT → 알림 생성
- [x] DB 트리거: likes INSERT → 알림 생성
- [x] DB 트리거: comments INSERT (parent_id IS NULL) → 알림 생성
- [x] `comments` 테이블에 `parent_id` 컬럼 추가 (대댓글 선제 준비)
- [x] 댓글 날짜 표기: `YYYY.MM.DD` → 상대 시간 (`방금 전`, `N분 전`, `N시간 전`, `N일 전`, `N주 전`, `YYYY.MM.DD`)
- [x] 헤더 프로필 아이콘 좌측에 벨 아이콘 추가 (white, 로그인 시만 표시)
- [x] 안 읽은 알림 있을 때 벨 아이콘에 빨간 점 표시
- [x] 데스크톱: 벨 클릭 시 알림 드롭다운 (검색창 스타일)
- [x] 모바일: 벨 클릭 시 `/me/notifications` 페이지 이동
- [x] 알림 읽음 처리 (`is_read` 갱신)
- [x] Supabase Realtime 구독으로 실시간 카운터 갱신

### 2.2 Out of Scope

- 대댓글(reply) 알림 트리거 — `parent_id` 컬럼만 준비, 트리거는 대댓글 구현 시 추가
- 이메일·푸시 알림
- 알림 설정 (on/off 토글)
- 알림 일괄 삭제

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | `notifications` 테이블 생성 (id, recipient_id, actor_id, type, entity_id, entity_type, is_read, created_at) | High | Pending |
| FR-02 | `follows` INSERT 트리거 → recipient=following_id, actor=follower_id, type=follow | High | Pending |
| FR-03 | `likes` INSERT 트리거 → recipient=playlist 업로더, actor=user_id, type=like | High | Pending |
| FR-04 | `comments` INSERT 트리거 (parent_id IS NULL) → recipient=playlist 업로더, type=comment | High | Pending |
| FR-05 | `comments` 테이블에 `parent_id UUID REFERENCES comments(id)` 컬럼 추가 | Medium | Pending |
| FR-06 | 댓글 `formatDate` → `formatRelativeTime` 변환 (Instagram 스타일) | High | Pending |
| FR-07 | 헤더에 벨 아이콘 추가 (로그인 시만), 빨간 점(안 읽은 수 > 0) | High | Pending |
| FR-08 | 데스크톱 벨 클릭: 알림 드롭다운 (최신 20개, 읽음 처리) | High | Pending |
| FR-09 | 모바일 벨 클릭: `/me/notifications` 페이지 이동 | High | Pending |
| FR-10 | `/me/notifications` 페이지: 전체 알림 목록, 무한 스크롤 or 페이지네이션 | Medium | Pending |
| FR-11 | Supabase Realtime 구독: 새 알림 수신 시 카운터 즉시 갱신 | High | Pending |
| FR-12 | 알림 클릭 시 `is_read=true` 갱신 + 관련 페이지로 이동 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 알림 드롭다운 렌더 < 300ms | Network 탭 |
| Realtime | 팔로우 발생 → 헤더 카운터 갱신 < 1s | 수동 2탭 테스트 |
| DB 부하 | 트리거 실행 시간 < 10ms | Supabase 대시보드 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] FR-01~FR-12 구현 완료
- [ ] 팔로우 → 알림 수신 확인 (Realtime)
- [ ] 좋아요 → 알림 수신 확인
- [ ] 댓글 → 알림 수신 확인
- [ ] 댓글 날짜가 상대 시간으로 표시
- [ ] 모바일에서 벨 클릭 시 알림 페이지 이동
- [ ] 데스크톱에서 벨 클릭 시 드롭다운 표시

### 4.2 Quality Criteria

- [ ] 자기 자신 팔로우·좋아요·댓글에 알림 생성되지 않음 (트리거 guard)
- [ ] 이미 읽은 알림에 빨간 점 미표시
- [ ] TypeScript 빌드 오류 없음

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 자기 자신 행동 알림 생성 | Medium | High | 트리거에 `IF NEW.actor_id != recipient_id THEN` 조건 추가 |
| likes 테이블에 playlist 업로더 정보 없음 (JOIN 필요) | Medium | High | 트리거에서 playlists JOIN으로 uploaded_by 조회 |
| Supabase Realtime 연결 수 요금제 제한 | Low | Low | 모니터링, 필요 시 폴링 폴백 |
| `comments.parent_id` 추가로 기존 쿼리 영향 | Low | Low | nullable 컬럼이므로 기존 쿼리 무영향 |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| `notifications` | DB Table | 신규 생성 |
| `comments.parent_id` | DB Column | nullable 추가 |
| `CommentList.tsx` | Component | `formatDate` → `formatRelativeTime` |
| `Header.tsx` | Component | 벨 아이콘 + Realtime 구독 추가 |
| `follows` / `likes` / `comments` | DB Triggers | INSERT 시 notifications 생성 |

### 6.2 Current Consumers

| Resource | Operation | Code Path | Impact |
|----------|-----------|-----------|--------|
| `comments` | READ | `CommentList.tsx` — `useComments` hook | 날짜 포맷 변경 (비파괴) |
| `comments` | INSERT | `CommentForm.tsx` | parent_id nullable, 기존 코드 무영향 |
| `Header.tsx` | RENDER | `app/[locale]/layout.tsx` | 벨 아이콘 추가, 기존 레이아웃 유지 |

### 6.3 Verification

- [ ] 기존 댓글 목록 정상 렌더 확인
- [ ] 헤더 레이아웃 데스크톱/모바일 깨짐 없음 확인

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Selected |
|-------|:--------:|
| **Starter** | ☐ |
| **Dynamic** | ☑ |
| **Enterprise** | ☐ |

### 7.2 Key Architectural Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| 알림 생성 방식 | DB 트리거 | 클라이언트 독립적, 서버 코드 불필요 |
| 실시간 업데이트 | Supabase Realtime | 기존 인프라 활용 |
| 데스크톱 UI | 드롭다운 | 검색창 드롭다운과 동일 패턴으로 일관성 |
| 모바일 UI | 전용 페이지 | 작은 화면에서 드롭다운 UX 불량 |
| 알림 보관 | 무제한 (soft delete 없음) | MVP 단계, 추후 30일 TTL 고려 |

### 7.3 Folder Structure

```
src/
  features/notification/
    components/
      NotificationBell.tsx        ← 헤더 벨 아이콘 + 카운터
      NotificationDropdown.tsx    ← 데스크톱 드롭다운
      NotificationItem.tsx        ← 알림 아이템 (아바타 + 텍스트 + 시간)
    hooks/
      useNotifications.ts         ← Realtime 구독 + 목록 조회
    lib/
      formatRelativeTime.ts       ← 상대 시간 유틸
  app/[locale]/me/notifications/
    page.tsx                      ← 모바일 전용 알림 페이지
supabase/migrations/
  012_notifications.sql           ← 테이블 + 트리거 + RLS
```

### 7.4 DB Schema

```sql
-- notifications 테이블
CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('follow', 'like', 'comment', 'reply')),
  entity_id    UUID,          -- playlist_id or comment_id
  entity_type  TEXT,          -- 'playlist' | 'comment'
  is_read      BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- comments.parent_id 추가
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES comments(id);
```

### 7.5 Relative Time Rules (`formatRelativeTime`)

| 경과 시간 | 표시 |
|-----------|------|
| < 1분 | 방금 전 |
| 1분 ~ 59분 | N분 전 |
| 1시간 ~ 23시간 | N시간 전 |
| 1일 ~ 6일 | N일 전 |
| 7일 ~ 29일 | N주 전 |
| 30일 이상 | YYYY.MM.DD |

---

## 8. Convention Prerequisites

### 8.1 Environment Variables Needed

| Variable | Purpose | 현재 상태 |
|----------|---------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Realtime 연결 | 이미 존재 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Realtime 구독 | 이미 존재 |

---

## 9. Next Steps

1. [ ] `/pdca design notifications` — 설계 문서 작성
2. [ ] Supabase 마이그레이션 실행 (notifications 테이블 + 트리거)
3. [ ] `formatRelativeTime` 유틸 구현
4. [ ] 헤더 UI + 드롭다운 + 모바일 페이지 구현
