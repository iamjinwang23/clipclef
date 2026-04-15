# Design: 사용자 플리 수정/삭제 (user-playlist-edit)

**작성일**: 2026-04-12  
**상태**: Design 완료  
**선택 아키텍처**: Option C — Pragmatic Balance

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 업로더가 직접 콘텐츠를 관리할 수 없어 관리자 병목 발생 |
| **WHO** | `uploaded_by = auth.uid()` 인 로그인 사용자 |
| **RISK** | 타인 플리 무단 수정·삭제 — API 레벨 소유자 검증 필수 |
| **SUCCESS** | 소유자만 버튼 보임 / 수정 저장 / 삭제 후 홈 이동 |
| **SCOPE** | 플리 상세 페이지만. 목록·어드민 UI 변경 없음 |

---

## 1. Overview

플리 상세 페이지 제목 라인 우측에 소유자 전용 수정(✏️)/삭제(🗑️) 버튼을 추가한다.
수정은 오버레이 모달, 삭제는 확인 다이얼로그 후 하드 삭제.

### 아키텍처 결정 근거 (Option C)

- 기존 `features/playlist/components/` 패턴과 일관성 유지
- `PlaylistOwnerMenu.tsx` 단일 파일로 버튼 + 모달 + 삭제 다이얼로그 통합
- 별도 hooks 불필요 — `useState` + `fetch` 인라인으로 충분
- 신규 파일 최소화 (2개 신규, 1개 수정)

---

## 2. 파일 변경 목록

| 파일 | 작업 | 비고 |
|------|------|------|
| `src/app/api/playlists/[id]/route.ts` | 신규 | PATCH/DELETE handler |
| `src/features/playlist/components/PlaylistOwnerMenu.tsx` | 신규 | 버튼 + 모달 + 삭제 다이얼로그 |
| `src/app/[locale]/playlist/[id]/page.tsx` | 수정 | isOwner 체크 + PlaylistOwnerMenu 삽입 |

---

## 3. 컴포넌트 설계

### 3.1 PlaylistOwnerMenu

```
PlaylistOwnerMenu (Client Component)
  ├─ 수정 버튼 (✏️ icon)
  │    └─ 모달 오버레이
  │         ├─ 에디터노트 textarea
  │         ├─ 장르 태그 멀티셀렉트
  │         ├─ 분위기 태그 멀티셀렉트
  │         ├─ 장소 태그 멀티셀렉트
  │         ├─ 시대 태그 멀티셀렉트
  │         ├─ 트랙 편집 리스트
  │         │    └─ 각 트랙: title / start_sec / duration_sec 수정 + 삭제
  │         ├─ 저장 버튼
  │         └─ 취소 버튼
  └─ 삭제 버튼 (🗑️ icon)
       └─ 확인 다이얼로그 (인라인 조건부 렌더)
```

### 3.2 Props 인터페이스

```tsx
interface PlaylistOwnerMenuProps {
  playlistId: string;
  locale: string;
  initialData: {
    editorNote: string | null;
    genre: string[];
    mood: string[];
    place: string[];
    era: string[];
  };
  tracks: Track[];
}
```

### 3.3 State 구조

```tsx
// 모달 상태
const [editOpen, setEditOpen] = useState(false);
const [deleteOpen, setDeleteOpen] = useState(false);
const [saving, setSaving] = useState(false);
const [deleting, setDeleting] = useState(false);

// 수정 폼 상태 (모달 열 때 initialData로 초기화)
const [editorNote, setEditorNote] = useState(initialData.editorNote ?? '');
const [genre, setGenre] = useState<string[]>(initialData.genre);
const [mood, setMood] = useState<string[]>(initialData.mood);
const [place, setPlace] = useState<string[]>(initialData.place);
const [era, setEra] = useState<string[]>(initialData.era);
const [editTracks, setEditTracks] = useState<Track[]>(tracks);
```

---

## 4. API 설계

### 4.1 엔드포인트: `/api/playlists/[id]`

#### PATCH — 플리 수정

**Request Body**:
```json
{
  "editor_note": "string | null",
  "genre": ["string"],
  "mood": ["string"],
  "place": ["string"],
  "era": ["string"],
  "tracks": [
    {
      "id": "uuid",
      "title": "string",
      "start_sec": 0,
      "duration_sec": 180
    }
  ]
}
```

**Response**:
```json
{ "ok": true }
```

**에러**:
- `401` — 비로그인
- `403` — 소유자 불일치
- `400` — 입력 검증 실패
- `500` — DB 오류

#### DELETE — 플리 삭제

**Response**:
```json
{ "ok": true }
```

**에러**:
- `401` — 비로그인
- `403` — 소유자 불일치

### 4.2 보안 흐름

```
1. createClient() → getUser() → user 없으면 401
2. supabase.from('playlists').select('uploaded_by').eq('id', id).single()
3. playlist.uploaded_by !== user.id → 403
4. PATCH: playlists 업데이트 + tracks 업데이트 (id별)
   DELETE: tracks → user_playlist_items → likes → comments → playlists 순 삭제
```

### 4.3 Cascade 삭제 순서

FK 제약 고려 순서:
```
1. DELETE tracks WHERE playlist_id = id
2. DELETE user_playlist_items WHERE playlist_id = id
3. DELETE likes WHERE playlist_id = id
4. DELETE comments WHERE playlist_id = id
5. DELETE playlists WHERE id = id
```

> `ON DELETE CASCADE` 가 이미 설정된 테이블은 건너뛰어도 되나,
> 설정 여부 불확실하므로 API에서 명시적 순서 삭제로 처리.

---

## 5. page.tsx 수정 포인트

```tsx
// 기존 (page.tsx)
const [{ data: playlist }, { data: tracks }, { data: { user } }] = await Promise.all([...]);

// 추가할 코드
const isOwner = !!user && user.id === p.uploaded_by;

// 제목 라인 수정 (h1 flex row에 버튼 삽입)
<div className="flex items-start justify-between gap-2 mb-1">
  <div className="flex items-start gap-2">
    {p.is_ai && <span>AI</span>}
    <h1 className="text-xl font-semibold leading-snug">{p.title}</h1>
  </div>
  {isOwner && (
    <PlaylistOwnerMenu
      playlistId={p.id}
      locale={locale}
      initialData={{
        editorNote: p.editor_note,
        genre: p.genre,
        mood: p.mood,
        place: p.place,
        era: p.era,
      }}
      tracks={t}
    />
  )}
</div>
```

---

## 6. UI 상세 설계

### 6.1 버튼 위치 및 스타일

```
[제목 텍스트 .............. ] [✏️] [🗑️]
```

- 버튼 크기: `w-8 h-8` 아이콘 버튼, `rounded-lg`
- 색상: `text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]`
- 두 버튼 간격: `gap-1`

### 6.2 수정 모달

```
┌─────────────────────────────────────┐
│  플리 수정                        ✕  │
├─────────────────────────────────────┤
│  에디터 노트                         │
│  ┌─────────────────────────────────┐│
│  │ textarea (4줄, maxLength=200)  ││
│  └─────────────────────────────────┘│
│                                     │
│  태그                                │
│  장르: [Pop] [Jazz] [+]             │
│  분위기: [Chill] [+]                │
│  장소: [카페] [+]                   │
│  시대: [1990s] [+]                  │
│                                     │
│  트랙 목록                           │
│  1. [제목______] [시작__] [길이__] 🗑️│
│  2. [제목______] [시작__] [길이__] 🗑️│
│                                     │
│  [취소]           [저장 중...]       │
└─────────────────────────────────────┘
```

- 모달 배경: `fixed inset-0 z-50 bg-black/60`
- 모달 카드: `bg-[var(--card)] rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto`
- 태그 선택: 토글 버튼 (`pill` 스타일, 선택시 `bg-[var(--foreground)] text-[var(--background)]`)
- `GENRE_OPTIONS`, `MOOD_OPTIONS`, `PLACE_OPTIONS`, `ERA_OPTIONS` 상수 재사용 (`@/types`)

### 6.3 삭제 확인 다이얼로그

모달 외부의 인라인 조건부 렌더 (별도 컴포넌트 아님):

```
[deleteOpen && (
  <div> fixed overlay
    "정말 삭제하시겠습니까? 되돌릴 수 없습니다."
    [취소] [삭제하기]
  </div>
)]
```

---

## 7. 트랙 편집 상세

### 7.1 수정 가능 필드

| 필드 | 타입 | UI |
|------|------|-----|
| `title` | string | `<input>` |
| `start_sec` | number \| null | `<input type="number">` (초 단위) |
| `duration_sec` | number \| null | `<input type="number">` (초 단위) |

`artist`, `position`, `youtube_video_id`는 수정 불가 (업로드 시 고정값).

### 7.2 트랙 삭제

모달 내 각 트랙 행 우측 🗑️ 클릭 → `editTracks.filter(t => t.id !== id)` 로 로컬 상태에서 제거.
저장 시 서버에 반영 (PATCH body의 `tracks` 배열에서 빠진 ID는 삭제).

### 7.3 PATCH에서 트랙 처리 로직

```typescript
// route.ts
// 1. 현재 DB의 tracks id 목록 조회
const { data: existing } = await supabase
  .from('tracks').select('id').eq('playlist_id', id);

// 2. 요청에서 빠진 ID → 삭제
const toDelete = existing
  .filter(e => !body.tracks.find(t => t.id === e.id))
  .map(e => e.id);
if (toDelete.length > 0) {
  await supabase.from('tracks').delete().in('id', toDelete);
}

// 3. 존재하는 ID → 업데이트
for (const track of body.tracks) {
  await supabase.from('tracks')
    .update({ title: track.title, start_sec: track.start_sec, duration_sec: track.duration_sec })
    .eq('id', track.id);
}
```

---

## 8. 저장 후 화면 업데이트

Server Component인 `page.tsx`를 새로고침하는 방식 사용:
- 저장 성공 시 `router.refresh()` (`next/navigation` useRouter)
- 삭제 성공 시 `router.push(`/${locale}`)` 홈으로 이동

> `router.refresh()`는 Next.js App Router에서 서버 컴포넌트를 재실행하고
> 현재 페이지의 RSC payload를 갱신. 전체 페이지 reload 없이 최신 DB 데이터 반영.

---

## 9. 테스트 시나리오

| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| T1 | 비로그인 상태로 상세 페이지 접근 | ✏️🗑️ 버튼 미노출 |
| T2 | 로그인 + 타인 플리 상세 접근 | ✏️🗑️ 버튼 미노출 |
| T3 | 로그인 + 본인 플리 상세 접근 | ✏️🗑️ 버튼 노출 |
| T4 | ✏️ 클릭 → 모달 열림, 기존 데이터 채워짐 | 에디터노트·태그·트랙 표시 |
| T5 | 에디터노트 수정 후 저장 | DB 반영 + 화면 업데이트 |
| T6 | 태그 토글 후 저장 | 선택 태그만 저장 |
| T7 | 트랙 삭제 후 저장 | 해당 트랙 DB에서 삭제 |
| T8 | 트랙 타임스탬프 수정 후 저장 | start_sec/duration_sec 업데이트 |
| T9 | 🗑️ 클릭 → 확인 → 삭제 | 플리+연관데이터 삭제 + 홈 이동 |
| T10 | 타인이 직접 PATCH API 호출 | 403 반환 |
| T11 | 비로그인으로 DELETE API 호출 | 401 반환 |

---

## 10. 성공 기준 (Plan 연동)

- [ ] 비로그인/비소유자: 버튼 미노출
- [ ] 소유자: ✏️ 버튼 클릭 시 모달 열림
- [ ] 수정 저장 시 에디터노트·태그 DB 반영 + 화면 업데이트
- [ ] 트랙 타임스탬프 수정 저장 동작
- [ ] 🗑️ 버튼 → 확인 → 하드 삭제 → 홈 리다이렉트
- [ ] 다른 사용자가 직접 API 호출 시 403 반환

---

## 11. 구현 가이드

### 11.1 구현 순서

```
Step 1: API route 구현
  - src/app/api/playlists/[id]/route.ts
  - PATCH: 소유자 검증 → playlists 업데이트 → tracks 업데이트
  - DELETE: 소유자 검증 → cascade 삭제 → { ok: true }

Step 2: PlaylistOwnerMenu 컴포넌트
  - src/features/playlist/components/PlaylistOwnerMenu.tsx
  - 버튼 2개 (✏️🗑️) + 수정 모달 + 삭제 확인 다이얼로그
  - 태그 멀티셀렉트 (GENRE_OPTIONS 등 상수 활용)
  - 트랙 편집 리스트

Step 3: page.tsx 수정
  - isOwner 계산
  - 제목 라인 flex 구조 변경
  - <PlaylistOwnerMenu> 조건부 삽입
```

### 11.2 주요 의존성

- `next/navigation`: `useRouter` (refresh/push)
- `@/types`: `Track`, `GENRE_OPTIONS`, `MOOD_OPTIONS`, `PLACE_OPTIONS`, `ERA_OPTIONS`
- `@/lib/supabase/server`: API route 인증
- `@/lib/supabase/client`: 불필요 (클라이언트 fetch 사용)

### 11.3 Session Guide

```
Module Map:
  module-1: API route (route.ts) — PATCH + DELETE + 보안 로직
  module-2: PlaylistOwnerMenu.tsx — 버튼 + 모달 UI
  module-3: page.tsx 수정 — isOwner + 컴포넌트 삽입

Recommended Session Plan:
  Single session: module-1 → module-2 → module-3 (전체 ~2시간)
  또는:
  Session A: module-1,module-2 (API + UI)
  Session B: module-3 (페이지 연결 + 테스트)
```
