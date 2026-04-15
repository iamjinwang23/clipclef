# Plan: 사용자 플리 수정/삭제 (user-playlist-edit)

**작성일**: 2026-04-12  
**상태**: Plan 완료

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 사용자가 자신이 업로드한 플리를 직접 수정·삭제할 수 없어, 오탈자·잘못된 태그를 고치려면 관리자에게 요청해야 함 |
| **Solution** | 플리 상세 페이지 제목 라인 우측에 소유자 전용 수정(✏️)/삭제(🗑️) 버튼 노출. 수정은 모달, 삭제는 확인 후 하드 삭제 |
| **Function UX Effect** | 로그인한 사용자가 본인 플리 상세 페이지에서 즉시 수정·삭제 가능. 비소유자에게는 버튼 미노출 |
| **Core Value** | 콘텐츠 자율성 확보 — 관리자 의존 없이 업로더가 직접 콘텐츠 품질 유지 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 업로더가 직접 콘텐츠를 관리할 수 없어 관리자 병목 발생 |
| **WHO** | 플리를 업로드한 로그인 사용자 (`uploaded_by = auth.uid()`) |
| **RISK** | 타인 플리 무단 수정·삭제 — API 레벨 소유자 검증 필수 |
| **SUCCESS** | 소유자만 버튼 보임 / 수정 저장 / 삭제 후 홈 이동 정상 동작 |
| **SCOPE** | 플리 상세 페이지만. 목록 페이지, 어드민 UI 변경 없음 |

---

## 1. 요구사항

### 수정 (✏️ 버튼)
- 수정 가능 필드:
  - 에디터 노트 (`editor_note`)
  - 장르 / 분위기 / 장소 / 시대 태그 (`genre`, `mood`, `place`, `era`)
  - 트랙 목록 — 추가/삭제/타임스탬프 수정 (`tracks` 테이블)
- 수정 UI: 오버레이 모달 (제목 라인의 ✏️ 클릭 → 모달 오픈)
- 저장 시 플리 상세 페이지 실시간 반영 (페이지 reload or optimistic update)

### 삭제 (🗑️ 버튼)
- 확인 다이얼로그 표시 ("정말 삭제하시겠습니까? 되돌릴 수 없습니다.")
- 하드 삭제: `playlists` 레코드 + 연관 `tracks`, `comments`, `likes`, `user_playlist_items` cascade 삭제
- 삭제 완료 후 `/[locale]` 홈으로 리다이렉트

### 소유자 판별
- 서버: `playlist.uploaded_by === auth.uid()` — 버튼 노출 여부 결정
- API: `uploaded_by` 재검증 — 비소유자 403 반환

---

## 2. 기술 설계

### 2.1 API 엔드포인트 (신규)

**`/api/playlists/[id]`**

| Method | 동작 | 권한 |
|--------|------|------|
| `PATCH` | 에디터노트·태그 업데이트 | 소유자 본인 |
| `DELETE` | 플리 + 연관 데이터 하드 삭제 | 소유자 본인 |

보안 흐름:
```
1. supabase.auth.getUser() → user 없으면 401
2. playlists.eq('id', id).select('uploaded_by').single()
3. playlist.uploaded_by !== user.id → 403
4. 실제 수정/삭제 처리
```

트랙 수정은 별도 `/api/playlists/[id]/tracks` 또는 PATCH body에 `tracks` 배열 포함.

### 2.2 컴포넌트 구조

```
PlaylistDetailPage (Server Component)
  └─ PlaylistOwnerMenu (Client Component) — 소유자일 때만 렌더
       ├─ 수정 버튼 (✏️)
       │    └─ PlaylistEditModal
       │         ├─ 에디터노트 textarea
       │         ├─ 태그 멀티셀렉트 (장르/분위기/장소/시대)
       │         └─ 트랙 편집 리스트
       └─ 삭제 버튼 (🗑️)
            └─ 확인 다이얼로그
```

### 2.3 Page → Component 데이터 흐름

```tsx
// page.tsx (Server)
const isOwner = user?.id === p.uploaded_by;

// 조건부 렌더
{isOwner && (
  <PlaylistOwnerMenu
    playlistId={p.id}
    initialData={{ editorNote, genre, mood, place, era }}
    tracks={t}
  />
)}
```

### 2.4 DB 고려사항

트랙 cascade 삭제: `tracks` 테이블 `playlist_id` FK에 `ON DELETE CASCADE` 설정 여부 확인 필요.  
미설정 시 → API에서 순서대로 삭제: tracks → user_playlist_items → likes → comments → playlists

---

## 3. 파일 변경 목록

| 파일 | 작업 |
|------|------|
| `src/app/api/playlists/[id]/route.ts` | 신규 — PATCH/DELETE handler |
| `src/features/playlist/components/PlaylistOwnerMenu.tsx` | 신규 — 버튼 + 모달 |
| `src/app/[locale]/playlist/[id]/page.tsx` | 수정 — isOwner 체크 + PlaylistOwnerMenu 삽입 |

---

## 4. 성공 기준

- [ ] 비로그인/비소유자: 버튼 미노출
- [ ] 소유자: ✏️ 버튼 클릭 시 모달 열림
- [ ] 수정 저장 시 에디터노트·태그 DB 반영 + 화면 업데이트
- [ ] 트랙 타임스탬프 수정 저장 동작
- [ ] 🗑️ 버튼 → 확인 → 하드 삭제 → 홈 리다이렉트
- [ ] 다른 사용자가 직접 API 호출 시 403 반환

---

## 5. 리스크

| 리스크 | 대응 |
|--------|------|
| 비소유자 API 직접 호출 | API에서 `uploaded_by` 재검증, 403 반환 |
| 트랙 cascade 미설정 | API에서 수동 순서 삭제로 보완 |
| 삭제 실수 | 확인 다이얼로그 + 취소 버튼 |
| 모달 중 페이지 이탈 | 변경사항 있을 시 `beforeunload` 경고 (선택) |
