# Plan: nested-comments

**Feature**: nested-comments  
**Phase**: Plan  
**Created**: 2026-04-17  
**Status**: In Progress

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 댓글에 직접 답하는 방법이 없어 맥락 없는 댓글 목록이 나열됨. 대화가 불가능해 커뮤니티 깊이가 낮음. |
| **Solution** | 댓글에 1단계 대댓글을 허용하고, 답글이 달리면 원 작성자에게 알림을 전송. |
| **Functional UX Effect** | 댓글마다 "답글 달기" 버튼 → 인라인 폼 → 대댓글 즉시 표시. 항상 펼쳐진 상태 유지. |
| **Core Value** | 플리/트랙에 대한 감상을 주고받는 교환이 가능해져 재방문율 및 체류시간 향상 기대. |

---

## Context Anchor

| | 내용 |
|--|------|
| **WHY** | 댓글 간 대화 불가 → 커뮤니티 depth 부족 |
| **WHO** | 플리에 댓글을 남기는 로그인 유저 |
| **RISK** | parent_id 이미 존재하나 RLS·인덱스 미검증; 알림 트리거 reply 케이스 미구현 |
| **SUCCESS** | 대댓글 작성·표시·삭제·알림이 E2E 동작 |
| **SCOPE** | 1단계 깊이, 항상 펼침, 알림 포함. 대대댓글·수정·신고 제외. |

---

## 1. 현황 분석

### 기존 댓글 시스템 (완성된 부분)
- `comments` 테이블: `parent_id UUID REFERENCES comments(id) ON DELETE SET NULL` 이미 존재 (migration 013)
- `notifications` 테이블: `type IN ('follow','like','comment','reply')` — `'reply'` 타입 준비됨
- DB 트리거: `notify_on_comment()` — `parent_id IS NULL` 조건으로 최상위 댓글 알림만 처리
- 프론트: `CommentList`, `CommentForm`, `useComments` — 모두 flat 구조 기준

### 미구현 부분
1. DB 트리거: 대댓글 삽입 시 원 댓글 작성자에게 `'reply'` 알림 전송
2. `useComments` 훅: 대댓글을 부모에 nested하여 반환
3. `CommentList`: 대댓글을 들여쓰기로 표시 + "답글 달기" 버튼
4. 인라인 `ReplyForm` 컴포넌트
5. `Comment` 타입: `parent_id`, `replies` 필드 추가

---

## 2. 요구사항

### Functional Requirements

| ID | 요구사항 |
|----|---------|
| FR-01 | 로그인 유저는 최상위 댓글에 대댓글을 작성할 수 있다 |
| FR-02 | 대댓글은 부모 댓글 바로 아래 들여쓰기 되어 항상 표시된다 |
| FR-03 | 대댓글 작성자 본인은 자신의 대댓글을 삭제할 수 있다 |
| FR-04 | 대댓글이 달리면 원 댓글 작성자에게 'reply' 알림이 전송된다 (자기 자신 제외) |
| FR-05 | 대댓글에는 다시 대댓글을 달 수 없다 (1단계 제한) |
| FR-06 | 비로그인 유저가 답글 버튼 클릭 시 로그인 모달 노출 |

### Non-Functional Requirements

- 기존 댓글 조회 쿼리 성능 유지 (N+1 방지 — 단일 쿼리로 replies 포함)
- 대댓글 삭제 시 알림 레코드는 유지 (ON DELETE SET NULL이 아닌 알림 보존)
- i18n 키 추가 (ko/en)

---

## 3. 기술 범위

### DB (Supabase)
- Migration 추가: `notify_on_reply()` 트리거 함수 + `trigger_notify_reply`
  - `parent_id IS NOT NULL`인 INSERT 시 부모 댓글의 `user_id`에게 `'reply'` 알림
  - 자기 자신 답글 제외 조건

### Backend / API (Supabase Direct)
- `useComments` 쿼리 변경:
  ```sql
  SELECT *, profiles(...), replies:comments(*, profiles(...))
  FROM comments
  WHERE playlist_id = $1 AND parent_id IS NULL
  ORDER BY created_at DESC
  ```
- `addReply` mutation 추가 (`parent_id` 포함 INSERT)

### Frontend
| 파일 | 변경 유형 |
|------|----------|
| `src/types/index.ts` | `Comment` 타입에 `parent_id`, `replies` 필드 추가 |
| `src/features/interaction/hooks/useComments.ts` | nested 쿼리 + `addReply` mutation |
| `src/features/interaction/components/CommentList.tsx` | 대댓글 렌더링 + "답글 달기" 버튼 |
| `src/features/interaction/components/ReplyForm.tsx` | 신규: 인라인 답글 입력 폼 |

---

## 4. 성공 기준 (Success Criteria)

| # | 기준 | 측정 방법 |
|---|------|----------|
| SC-01 | 대댓글 작성 후 즉시 UI에 표시됨 | 낙관적 업데이트 또는 쿼리 무효화 확인 |
| SC-02 | 대댓글에 "답글 달기" 버튼 미노출 | UI 검사 |
| SC-03 | 원 댓글 작성자에게 'reply' 알림 생성 | notifications 테이블 조회 |
| SC-04 | 자기 자신 대댓글 시 알림 미생성 | notifications 테이블 조회 |
| SC-05 | 비로그인 시 로그인 모달 노출 | UI 검사 |

---

## 5. 위험 요소

| 위험 | 대응 |
|------|------|
| `parent_id` 컬럼은 있으나 RLS 정책이 대댓글 INSERT를 막을 수 있음 | 기존 comments INSERT 정책 확인 후 parent_id 허용 범위 검증 |
| Supabase nested select로 replies 가져올 때 RLS 이중 적용 | 쿼리 실행 후 RLS 통과 여부 테스트 |
| notify_on_reply 트리거가 자기 자신 알림 생성 가능 | WHEN NEW.user_id != parent.user_id 조건 명시 |

---

## 6. 구현 순서

1. **Migration**: `notify_on_reply` 트리거 추가 (`017_reply_notification.sql`)
2. **Types**: `Comment` 인터페이스 업데이트
3. **Hook**: `useComments` nested 쿼리 + `addReply` mutation
4. **Component**: `ReplyForm` 신규 생성
5. **Component**: `CommentList` 업데이트 (대댓글 렌더링 + 답글 버튼)
6. **i18n**: `reply`, `replyPlaceholder` 등 키 추가

---

## 7. Out of Scope

- 대댓글의 대댓글 (2단계 이상 중첩)
- 댓글/대댓글 수정 기능
- 댓글/대댓글 신고 기능
- 접기/펼치기 토글
- 대댓글 수 카운트 칼럼 (comment_count처럼 별도 컬럼 캐싱)
