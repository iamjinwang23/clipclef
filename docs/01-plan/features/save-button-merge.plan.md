# Feature Plan: save-button-merge ✅ 완료 (2026-04-12)

## Executive Summary

| 관점 | 내용 |
|------|------|
| Problem | 플리 상세 액션바에 "저장(★)"과 "내 목록에 담기(+)" 버튼이 분리돼 있어 UX가 복잡하고, 두 기능이 동일한 DB 테이블(`user_playlists`)을 사용해 중복 |
| Solution | 하나의 `SaveButton`으로 통합 — 클릭 시 드롭다운에서 기본 "저장한 플리"(is_default) + 커스텀 목록 + 새 목록 만들기 제공 |
| UX Effect | 액션바 버튼 4개 → 3개로 축소, YouTube 방식의 직관적 저장 경험 제공 |
| Core Value | 저장 행동의 마찰 감소 + 목록 관리 통합 |

## Context Anchor

| | |
|--|--|
| WHY | 동일 DB를 건드리는 두 버튼이 사용자에게 혼란을 유발, 액션바 공간 낭비 |
| WHO | 플리를 저장/정리하려는 로그인 유저 |
| RISK | 기존 CollectionButton 사용처(카드 등)는 그대로 유지 — 플리 상세 페이지만 교체 |
| SUCCESS | 상세 페이지에서 버튼 1개로 저장·목록 관리 동작 완료 |
| SCOPE | `SaveButton` 신규 컴포넌트 + 플리 상세 페이지 교체. CollectionButton 파일 유지(다른 곳 사용 가능성) |

## 요구사항

1. 클릭 → 드롭다운 (기본목록 상단 고정 → 커스텀 목록 → 새 목록 만들기)
2. 하나라도 저장됐으면 버튼 filled 상태 (bookmark icon 채워짐)
3. 비로그인 → 구글 로그인 redirect
4. 모바일: 아이콘만, 데스크톱: 아이콘 + "저장" 텍스트 (responsive)
5. DB 변경 없음 — 기존 `user_playlists` / `user_playlist_items` 그대로 사용

## 구현 범위

- **신규**: `src/features/interaction/components/SaveButton.tsx`
- **수정**: `src/app/[locale]/playlist/[id]/page.tsx` — CollectionButton, AddToPlaylistButton → SaveButton
- **유지**: CollectionButton, AddToPlaylistButton 파일 (다른 사용처 대비)
