# Feature Plan: terminology-cleanup

## Executive Summary

| 관점 | 내용 |
|------|------|
| Problem | UI 카피가 "플리/플레이리스트/재생목록/내 목록" 등 여러 용어로 혼용돼 서비스 톤이 흐리고, 브랜드 가치("알고리즘 없는 인간적인 큐레이션")가 일관되게 전달되지 않음 |
| Solution | 기획자 주도로 용어 사전을 확정하고 UI 카피만 일괄 치환 (DB/코드 식별자는 유지) |
| UX Effect | 동일 개념은 동일 단어로만 노출 → 메시지 명료도 상승, 큐레이션 브랜드 톤 강화 |
| Core Value | 제품 정체성("ClipClef = 사람이 고른 플레이리스트 아카이브")이 한 화면 안에서도 흔들림 없이 전달됨 |

## Context Anchor

| | |
|--|--|
| WHY | 용어 혼용이 브랜드 톤을 흐림 — "플리/플레이리스트", "컬렉션/큐레이션", "내 목록/재생목록" 등 |
| WHO | 모든 사용자 (모든 UI 카피 해당) |
| RISK | DB 컬럼명·코드 식별자에 손대면 기능 리스크 큼 → UI 카피로만 범위 제한. i18n 키는 유지, 값만 갱신 |
| SUCCESS | 사전 4개 축(플레이리스트·큐레이션·담기·노트 입력)이 프로젝트 전역에 일관 적용 |
| SCOPE | UI 문자열만. 파일: 확인된 31개. 타입/DB 스키마 불변 |

## 1. 용어 사전 (확정)

### 1.1 축 1 — 플레이리스트 관련

| 이전 | 이후 |
|------|------|
| 플리 | **플레이리스트** |
| 재생목록 | **플레이리스트** (내 재생목록 → **내 플레이리스트**) |
| 내 목록(에 담기) | **담기** (또는 **내 플레이리스트에 담기**) |
| 검색 섹션 "영상" | **플레이리스트** |
| 플리 목록관리 | **플레이리스트 관리** |
| 올린 플리가 없어요 | **올린 플레이리스트가 없어요** |
| 담긴 플리가 없어요 | **담긴 플레이리스트가 없어요** |
| 아직 만든 재생목록이 없어요 | **아직 만든 플레이리스트가 없어요** |
| 공개된 재생목록이 없어요 | **공개된 플레이리스트가 없어요** |

### 1.2 축 2 — 큐레이션 (관리자 테마 묶음)

| 이전 | 이후 |
|------|------|
| 컬렉션 (홈 큐레이션 섹션) | **큐레이션** |
| 큐레이션 컬렉션 · 플리 N개 | **큐레이션 · 플레이리스트 N개** |
| 큐레이션 관리 (admin 탭) | 유지 (이미 "큐레이션") |
| `컬렉션을 삭제할까요?` 등 admin 모달 | **큐레이션을 삭제할까요?** |

> **범위 주의**: UI 카피만 교체. DB 테이블 `collections`, 컴포넌트 `CollectionManager`, 훅 `useCollection` 등 코드 식별자는 그대로 유지.

### 1.3 축 3 — "담기" (저장/담기 CTA)

| 이전 | 이후 |
|------|------|
| 내 목록에 담기 | **담기** |
| 저장 (북마크 계열 버튼) | 유지 (좋아요와는 다른 북마크 의미로 이미 정착) |

> 현재 `SaveButton`은 "저장 = 북마크" 의미로 이미 일관. `AddToPlaylistButton`의 "내 목록에 담기" 문구만 정리.

### 1.4 축 4 — 노트 입력 (에디터 노트)

| 이전 | 이후 |
|------|------|
| 에디터 노트 (라벨) | **노트 입력** |
| 에디터 원문 | **노트 원문** 또는 삭제 (맥락에 따라) |
| 플레이스홀더 `플리에 대한 짧은 설명을 남겨보세요` | **플레이리스트에 대한 짧은 설명을 남겨보세요** |

### 1.5 기타 — 어투 통일 (선택 적용)

- `없습니다` → `없어요` 톤 통일 (기존 empty state와 맞춤)
  - 예: `좋아요한 플레이리스트가 없습니다` → `좋아요한 플레이리스트가 없어요`
  - 예: `작성한 댓글이 없습니다` → `작성한 댓글이 없어요`
  - **예외 유지**: `검색 결과가 없습니다`, `트랙 정보가 없습니다` (시스템 피드백 톤)

> ⚠️ 이 축은 **옵션**. 범위 확대 우려가 있으니 일단 축 1~4만 확정하고, 어투 통일은 별도 이슈로 둘지 이번에 포함할지 컨펌 필요.

## 2. 적용 대상 파일 (31개)

**pages (15)**
- `src/app/[locale]/artist/[slug]/page.tsx`
- `src/app/[locale]/me/playlists/page.tsx`
- `src/app/[locale]/me/profile/page.tsx`
- `src/app/[locale]/me/profile/ProfileForm.tsx`
- `src/app/[locale]/me/profile/ProfileSettingsMenu.tsx`
- `src/app/[locale]/playlist/[id]/page.tsx`
- `src/app/[locale]/privacy/page.tsx`
- `src/app/[locale]/profile/[userId]/page.tsx`
- `src/app/[locale]/terms/page.tsx`

**API (4)**
- `src/app/api/admin/collections/route.ts`
- `src/app/api/playlists/[id]/route.ts`
- `src/app/api/youtube/export/route.ts`
- `src/app/api/youtube/route.ts`

**features (14)**
- `src/features/admin/components/AdminContent.tsx`
- `src/features/admin/components/CollectionManager.tsx`
- `src/features/admin/components/PlaylistForm.tsx`
- `src/features/artist/lib/artist.server.ts`
- `src/features/collection/components/CollectionGrid.tsx`
- `src/features/collection/components/CollectionPageClient.tsx`
- `src/features/collection/components/CollectionPlayer.tsx`
- `src/features/interaction/components/CollectionButton.tsx`
- `src/features/interaction/components/SaveButton.tsx`
- `src/features/interaction/components/UploaderCard.tsx`
- `src/features/interaction/hooks/useCollection.ts`
- `src/features/notification/components/NotificationItem.tsx`
- `src/features/playlist/components/PlaylistOwnerMenu.tsx`
- `src/features/playlist/hooks/useAllPlaylists.ts`
- `src/features/playlist/hooks/useChannelStories.ts`
- `src/features/search/components/SearchResults.tsx`
- `src/features/user-playlist/components/AddToPlaylistButton.tsx`

**i18n (1)**
- `src/i18n/ko.json`

**알림 문구 (DB 트리거)**
- `supabase/migrations/*_notifications.sql` — 알림 템플릿 내부 한글 문구 (예: `님이 플리에 댓글을 남겼습니다`) 있다면 함께 수정

## 3. Success Criteria

1. UI 어디에도 **"플리"** 단어가 노출되지 않는다 (grep 검증).
2. 홈 큐레이션 섹션 타이틀·카드 레이블이 **"큐레이션"** 으로 통일됨.
3. `내 목록에 담기` 문구가 사라지고 **"담기"** 로 통일됨.
4. 업로드 폼의 `에디터 노트` 라벨이 **"노트 입력"** 으로 변경됨.
5. `내 재생목록` 탭 레이블이 **"내 플레이리스트"** 로 변경됨.
6. 알림 메시지(`플리에 댓글…`)가 **"플레이리스트에 댓글…"** 로 변경됨 (DB 트리거 포함).
7. DB 스키마·코드 식별자는 변경 없음 (회귀 없음, 타입 체크 통과).

## 4. 범위에서 제외 (Out of Scope)

- 영문 UI (현재 프로젝트는 한국어 단일, 추후 i18n 확장 시 별도 사전)
- DB 테이블명/컬럼명 (`collections`, `user_playlists` 등)
- 코드 식별자/함수명/파일명 (`CollectionManager`, `useCollection`, `SaveButton` 등)
- 약관·개인정보처리방침의 **법적 용어** (`이용자` 등은 법 관행 유지)
- PDCA 문서 내부의 "플리" 표기 (프로젝트 메모라 자유)

## 5. Risks & Mitigation

| 위험 | 완화 |
|------|------|
| 텍스트 치환 과정에서 의도치 않은 단어 포함 (예: "스플리트")  | 반드시 복합어/단독어 구분. "플리" 는 `플리$` (줄바꿈/구두점 경계) 또는 단독 토큰만 치환 |
| 알림 DB 트리거 문구 놓침 | `supabase/migrations/*.sql`에서 grep 후 마이그레이션으로 텍스트 업데이트 |
| i18n 키 변경이 런타임 누락 유발 | 값만 수정, 키는 유지. i18n 파일 수정 후 `useTranslations` 호출부 전체 grep으로 확인 |
| 어투 통일(`없습니다`→`없어요`) 과잉 적용 | 이번 스코프에 포함할지 **미결 — 컨펌 필요** |

## 6. Implementation Approach

1. **Phase 1 — Mechanical 치환 (가장 안전)**
   - `플리` → `플레이리스트` (단어 경계 주의)
   - `컬렉션` → `큐레이션` (홈/관리자 UI 맥락만)
   - `에디터 노트` → `노트 입력`
   - `내 목록에 담기` → `담기`
   - `내 재생목록` → `내 플레이리스트`

2. **Phase 2 — 복합 문구 정돈**
   - 알림 템플릿, empty state 문구, 모달 확인 문구
   - DB 마이그레이션 (알림 트리거 문구) 필요 여부 확인

3. **Phase 3 — 검증**
   - `tsc --noEmit` 타입 체크
   - `grep -rn '플리\|내 목록에 담\|에디터 노트'` 실행해 누락 없음 확인
   - 로컬 실행 시 주요 페이지 문구 육안 확인

## 7. Open Questions

1. **어투 통일 (`없습니다`→`없어요`)** 를 이번에 함께 할지 별도 피처로 분리할지?
2. **"저장"(북마크)** 문구는 유지하기로 했는데, 앞으로 "좋아요 ≒ 즐겨찾기"로 통합할 계획이 있다면 이번에 카피 방향성 맞춰두는 게 좋을지?
3. DB 트리거의 한글 알림 문구 수정 시 **새 마이그레이션 파일**로 처리할지, 기존 파일 수정할지? (신규 마이그레이션 권장)
