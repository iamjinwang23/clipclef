# playlist-comment-count Planning Document

> **Summary**: 플레이리스트 카드에 댓글 수 표시 — 좋아요 수 우측에 💬 N 추가
>
> **Project**: ClipClef (youchoose)
> **Author**: —
> **Date**: 2026-04-13
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | PlaylistCard에 좋아요 수만 표시되어 댓글 활성도를 한눈에 확인할 수 없음 |
| **Solution** | `playlists.comment_count` 비정규화 컬럼 추가 + 트리거 자동 갱신, PlaylistCard에 💬 N 표시 |
| **Function/UX Effect** | 카드 하단 `♥ N  💬 N` — 모든 플리 리스트 페이지에서 댓글 활성도 즉시 인지 |
| **Core Value** | 커뮤니티 활성도 가시화 → 댓글이 많은 플리 클릭 유도 |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 댓글 활성도가 카드에 미표시 → 사용자가 커뮤니티 활성 플리를 발견하기 어려움 |
| **WHO** | 메인/좋아요/컬렉션 등 리스트 페이지 방문자 |
| **RISK** | 기존 `comments` INSERT/DELETE 트리거 추가 → 기존 트리거(notify_on_comment)와 충돌 없어야 함 |
| **SUCCESS** | PlaylistCard에 댓글 수 표시, 실제 댓글 수와 일치, 기존 기능 무영향 |
| **SCOPE** | DB 컬럼 + 트리거 + 타입 + PlaylistCard UI — 단일 세션 완료 |

---

## 1. Overview

### 1.1 Purpose

PlaylistCard 하단에 이미 `♥ like_count`가 표시되고 있다. 동일한 패턴으로 `💬 comment_count`를 우측에 추가하여 댓글이 활발한 플리를 리스트에서 바로 인지할 수 있게 한다.

### 1.2 Background

- `playlists.like_count`는 이미 비정규화 컬럼으로 존재 (migration 001)
- `comments` 테이블은 `playlist_id` FK를 가짐 (migration 001)
- `comments`에 이미 `notify_on_comment` AFTER INSERT 트리거 존재 (migration 013)
- `comment_count` 컬럼 없음 → 새 컬럼 + 트리거 추가 필요
- PlaylistCard는 메인/좋아요/컬렉션/프로필 등 모든 리스트에서 사용 → 한 번에 모두 반영

### 1.3 Related Files

- `supabase/migrations/001_initial_schema.sql` — playlists, comments 스키마
- `supabase/migrations/013_notifications.sql` — 기존 comments 트리거
- `src/types/index.ts` — Playlist 타입
- `src/features/playlist/components/PlaylistCard.tsx` — UI
- `src/features/playlist/hooks/usePlaylists.ts` — 홈 목록 쿼리 (select('*') → 컬럼 추가 시 자동 포함)

---

## 2. Scope

### 2.1 In Scope

- [x] `playlists.comment_count INT NOT NULL DEFAULT 0` 컬럼 추가
- [x] 기존 댓글 수 백필 (UPDATE 한 번)
- [x] `comments` INSERT 트리거 → `comment_count` +1
- [x] `comments` DELETE 트리거 → `comment_count` -1 (0 미만 방지)
- [x] `Playlist` 타입에 `comment_count: number` 추가
- [x] PlaylistCard UI: `♥ N  💬 N` 레이아웃

### 2.2 Out of Scope

- comment_count 기준 정렬 옵션 추가
- 실시간 업데이트 (Realtime) — 정적 카운트로 충분
- 플리 상세 페이지 카운트 표시 (별도 태스크)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | `playlists.comment_count` 컬럼 추가 (INT NOT NULL DEFAULT 0) | High |
| FR-02 | 기존 댓글 수 백필 | High |
| FR-03 | comments INSERT 시 `comment_count` +1 트리거 | High |
| FR-04 | comments DELETE 시 `comment_count` -1 트리거 (GREATEST(0, ...) 방어) | High |
| FR-05 | `Playlist` 타입에 `comment_count: number` 추가 | High |
| FR-06 | PlaylistCard: `♥ N` 우측에 `💬 N` 표시 (동일 스타일) | High |

### 3.2 Non-Functional Requirements

| Category | Criteria |
|----------|----------|
| 성능 | select('*')에 컬럼 자동 포함 — 추가 쿼리 없음 |
| 정확성 | 트리거로 INSERT/DELETE 즉시 반영 |
| 안전성 | 기존 notify_on_comment 트리거와 독립적으로 동작 |

---

## 4. Success Criteria

- [ ] PlaylistCard에 `💬 N` 표시 (N = 실제 댓글 수)
- [ ] 댓글 작성 후 DB의 `comment_count` 증가 확인
- [ ] 기존 like_count 표시 및 기타 기능 무영향
- [ ] TypeScript 빌드 오류 없음

---

## 5. Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| 기존 comments 트리거(notify_on_comment)와 동일 테이블 트리거 충돌 | Low | PostgreSQL은 복수 트리거 허용, 실행 순서 무관 |
| 백필 중 대량 UPDATE로 잠금 발생 | Low | 플리 수 소규모, 단순 UPDATE |
| DELETE 시 comment_count 음수 | Low | `GREATEST(0, comment_count - 1)` 방어 |

---

## 6. Impact Analysis

| Resource | Type | Change |
|----------|------|--------|
| `playlists` | DB Column | `comment_count` 추가 |
| `comments` | DB Trigger | INSERT/DELETE 각 1개 추가 |
| `src/types/index.ts` | Type | `comment_count: number` 추가 |
| `PlaylistCard.tsx` | Component | 하단 UI 수정 |

---

## 7. Architecture Decision

`like_count`와 동일한 **비정규화 컬럼** 패턴 사용.
- 쿼리 변경 불필요 (`select('*')`에 자동 포함)
- 트리거로 정합성 보장
- PostgREST 집계 방식보다 단순하고 일관성 있음

---

## 8. Next Steps

1. `/pdca design playlist-comment-count`
2. Migration 014 작성 (컬럼 + 백필 + 트리거)
3. 타입 수정 + PlaylistCard UI 수정
