# profile-settings Design Document

> **Summary**: 닉네임 중복 불가·최대 30자, 프로필 사진 변경 (Storage), 기본정보 UI 개선
>
> **Project**: ClipClef (youchoose)
> **Author**: —
> **Date**: 2026-04-13
> **Status**: Draft
> **Planning Doc**: [profile-settings.plan.md](../../01-plan/features/profile-settings.plan.md)
> **Architecture**: Option C — Pragmatic Balance

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 닉네임 중복 허용, 프로필 사진 변경 수단 없음, 기본정보 UI 불완전 |
| **WHO** | 로그인한 일반 회원 (프로필 설정 접근 유저) |
| **RISK** | 기존 DB 중복 display_name 존재 시 제약 추가 실패 / Header avatarUrl 소스 불일치 |
| **SUCCESS** | 중복 닉네임 저장 차단, 사진 업로드 성공 + DB 반영, UI 변경 완료 |
| **SCOPE** | Module-1: DB 마이그레이션 → Module-2: 사진 업로드 → Module-3: 닉네임 중복 체크 → Module-4: UI 개선 |

---

## 1. Overview

### 1.1 Design Goals

- `ProfileForm.tsx`를 슬림하게 유지하면서, 사진 업로드 로직을 독립 컴포넌트로 분리
- 닉네임 중복 체크를 서버 API로 처리해 race condition 방지
- Supabase Storage와 DB 변경이 UI와 명확히 분리되도록 설계

### 1.2 Design Principles

- **단일 책임**: `AvatarUploadButton`은 업로드 전담, `ProfileForm`은 폼 조율 전담
- **서버 검증 우선**: 닉네임 유니크 체크는 API route에서 처리 (클라이언트 체크는 UX 보조용)
- **점진적 반영**: 업로드 완료 후 미리보기 URL을 즉시 state로 업데이트 (DB 응답 대기 불필요)

---

## 2. Architecture

### 2.1 Option C — Pragmatic Balance 선택 이유

| 기준 | Option A | Option C (선택) | Option B |
|------|----------|-----------------|----------|
| 파일 수 | 최소 (2~3) | 적당 (5) | 많음 (7+) |
| 유지보수 | ProfileForm 비대화 | 적절한 분리 | 최고 |
| 재사용 | 없음 | AvatarUploadButton 재사용 가능 | Hook 재사용 가능 |
| 속도 | 가장 빠름 | 빠름 | 느림 |

### 2.2 파일 구조

```
src/
  app/
    [locale]/me/
      settings/page.tsx             ← [수정] ← 프로필로 링크 제거
      profile/
        ProfileForm.tsx             ← [수정] 사진 업로드 + 중복 체크 연결
    api/profiles/
      check-name/route.ts           ← [신규] 닉네임 중복 체크 API
  components/ui/
    AvatarUploadButton.tsx          ← [신규] 사진 업로드 서브컴포넌트
supabase/migrations/
  012_profile_display_name_unique.sql  ← [신규] UNIQUE 제약
```

---

## 3. Data Model

### 3.1 DB 변경

**Migration 012: `profiles.display_name` UNIQUE 제약 추가**

```sql
-- 기존 중복 데이터 확인 (마이그레이션 전 반드시 실행)
-- SELECT display_name, COUNT(*) FROM profiles
--   GROUP BY display_name HAVING COUNT(*) > 1;

-- NULL은 UNIQUE 제약에서 복수 허용됨 (NULL은 서로 다름으로 처리)
-- 따라서 NULL 값은 그대로 두어도 제약 위반 없음

ALTER TABLE profiles
  ADD CONSTRAINT profiles_display_name_unique UNIQUE (display_name);
```

> **주의**: 마이그레이션 전 Supabase 대시보드에서 중복 닉네임 유저를 수동 정리해야 함

### 3.2 Supabase Storage

| 항목 | 값 |
|------|----|
| 버킷 이름 | `avatars` |
| 가시성 | Public |
| 파일 경로 | `avatars/{userId}/avatar` (확장자는 원본 MIME에서 추출) |
| 최대 크기 | 2MB (클라이언트 검증) |
| 허용 MIME | `image/jpeg`, `image/png`, `image/webp`, `image/gif` |

**파일 덮어쓰기 전략**: 매번 동일 경로에 upsert → 버킷 용량 낭비 없음

---

## 4. API Design

### 4.1 닉네임 중복 체크 API

```
GET /api/profiles/check-name?name={displayName}&userId={currentUserId}
```

**요청 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `name` | string | Y | 확인할 닉네임 (trim 후 검사) |
| `userId` | string | Y | 현재 로그인 유저 ID (자기 자신 제외) |

**응답:**

```typescript
// 200 — 사용 가능
{ available: true }

// 200 — 중복
{ available: false, message: "이미 사용 중인 닉네임입니다" }

// 400 — 파라미터 없음
{ error: "name and userId are required" }
```

**서버 로직:**
```typescript
// 자기 자신 제외, display_name 일치 여부 확인
const { data } = await supabase
  .from('profiles')
  .select('id')
  .eq('display_name', name.trim())
  .neq('id', userId)
  .maybeSingle();

return { available: data === null };
```

### 4.2 프로필 사진 업로드 플로우

```
클라이언트                     Supabase
    │                             │
    │  1. 파일 선택 (input)         │
    │  2. MIME + 크기 검증          │
    │  3. storage.upload()  ──────►│ avatars/{userId}/avatar
    │  4. getPublicUrl()    ◄──────│ CDN URL 반환
    │  5. profiles.update() ──────►│ avatar_url 갱신
    │  6. 로컬 state URL 갱신       │
    │  7. UserAvatar 즉시 반영     │
```

---

## 5. Component Design

### 5.1 AvatarUploadButton

```typescript
// src/components/ui/AvatarUploadButton.tsx
interface AvatarUploadButtonProps {
  userId: string;
  currentAvatarUrl: string;
  onUploadComplete: (newUrl: string) => void;  // 부모에게 새 URL 전달
}
```

**내부 상태:**
- `uploading: boolean` — 업로드 중 로딩 표시
- `error: string | null` — 에러 메시지

**렌더링:**
```
[현재 아바타 (56px)] [사진 변경 버튼]
                      ↑
                 hidden <input type="file" accept="image/*">
                 버튼 클릭 시 input.click() 트리거
```

**업로드 핸들러:**
```typescript
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // 검증
  if (file.size > 2 * 1024 * 1024) { setError('2MB 이하 이미지만 업로드 가능합니다'); return; }
  if (!file.type.startsWith('image/')) { setError('이미지 파일만 업로드 가능합니다'); return; }

  setUploading(true);
  const ext = file.type.split('/')[1];
  const path = `${userId}/avatar.${ext}`;

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true });

  if (uploadError) { setError('업로드 실패'); setUploading(false); return; }

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);

  await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
  onUploadComplete(publicUrl);
  setUploading(false);
};
```

### 5.2 ProfileForm (수정 후)

**변경 포인트:**
1. `avatarUrl` state 추가 (`initialAvatarUrl` prop으로 초기화)
2. 아바타 행에 `AvatarUploadButton` 배치 (우측)
3. `handleSave` 에 닉네임 중복 체크 API 호출 추가
4. 에러 상태 (`nameError: string | null`) 추가

**레이아웃 (기본정보 섹션):**
```
┌─────────────────────────────────────────────────────────────┐
│  [아바타 56px]  닉네임                         [사진 변경]  │
│                 email@example.com                           │
└─────────────────────────────────────────────────────────────┘
```
→ `flex items-center gap-4` + 우측 끝에 `AvatarUploadButton`

**handleSave 흐름:**
```
1. e.preventDefault()
2. 닉네임 trim, 빈 값 체크
3. GET /api/profiles/check-name?name=X&userId=Y
4. available === false → nameError 표시, return
5. supabase.profiles.update({ display_name }) 
6. setSaved(true)
```

### 5.3 Settings Page (수정)

**제거:** `← 프로필로` Link 컴포넌트 (line 28~33)

```typescript
// 제거 전:
<Link href={`/${locale}/me/profile`} className="...">← 프로필로</Link>

// 제거 후: 해당 블록 삭제
```

### 5.4 Header avatarUrl 소스 변경

현재: `user?.user_metadata?.avatar_url` (OAuth 메타데이터)  
변경: `profiles.avatar_url` 우선, 없으면 `user_metadata.avatar_url` fallback

**Header에 profile fetch 추가:**
```typescript
const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | undefined>(undefined);

useEffect(() => {
  if (!user) return;
  supabase.from('profiles').select('avatar_url').eq('id', user.id).single()
    .then(({ data }) => setProfileAvatarUrl(data?.avatar_url ?? undefined));
}, [user]);

// 사용:
const avatarUrl = profileAvatarUrl ?? (user?.user_metadata?.avatar_url as string | undefined);
```

---

## 6. Error Handling

| 상황 | 처리 방식 | 사용자 피드백 |
|------|----------|-------------|
| 중복 닉네임 | `nameError` state → 인풋 하단에 에러 텍스트 | "이미 사용 중인 닉네임입니다" |
| 이미지 2MB 초과 | 업로드 차단 | "2MB 이하 이미지만 업로드 가능합니다" |
| 이미지 MIME 오류 | 업로드 차단 | "이미지 파일만 업로드 가능합니다" |
| Storage 업로드 실패 | `error` state | "업로드 실패. 다시 시도해 주세요" |
| API 응답 없음 | 저장 차단 | "닉네임 확인에 실패했습니다" |

---

## 7. State Management

ProfileForm 내부 local state만 사용 (Zustand 불필요):

```typescript
const [displayName, setDisplayName] = useState(initialDisplayName);
const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);   // ← 신규
const [saving, setSaving] = useState(false);
const [saved, setSaved] = useState(false);
const [nameError, setNameError] = useState<string | null>(null); // ← 신규
const [deleting, setDeleting] = useState(false);
```

---

## 8. Test Plan

### 8.1 핵심 시나리오

| 시나리오 | 기대 결과 |
|---------|---------|
| 이미 사용 중인 닉네임으로 저장 | 인라인 에러 "이미 사용 중인 닉네임입니다" |
| 자기 자신의 현재 닉네임으로 저장 | 정상 저장 (self-exclusion 작동) |
| 2MB 초과 이미지 선택 | 업로드 차단, 에러 메시지 |
| 유효 이미지 업로드 | 아바타 즉시 갱신, DB avatar_url 업데이트 |
| settings 페이지 접속 | "← 프로필로" 링크 없음 |
| 헤더 아바타 | Storage 업로드 후 헤더 새로고침 시 반영 |

### 8.2 DB 마이그레이션 전 체크

```sql
-- 중복 닉네임 확인 쿼리 (Supabase SQL Editor에서 실행)
SELECT display_name, COUNT(*) as cnt
FROM profiles
WHERE display_name IS NOT NULL
GROUP BY display_name
HAVING COUNT(*) > 1;
```
→ 결과 없으면 마이그레이션 안전

---

## 9. Migration Strategy

### 9.1 배포 순서

```
1. Supabase Storage `avatars` 버킷 생성 (Public)
2. SQL Editor에서 중복 닉네임 확인
3. 중복 있으면 수동 정리
4. Migration 012 적용 (UNIQUE 제약)
5. 코드 배포
```

### 9.2 롤백

- UNIQUE 제약 제거: `ALTER TABLE profiles DROP CONSTRAINT profiles_display_name_unique;`
- Storage 버킷 삭제는 데이터 손실이므로 코드만 롤백

---

## 10. Security

| 항목 | 처리 |
|------|------|
| Storage 접근 | RLS: `auth.uid() = (path의 userId 파트)` 정책 → 자신의 디렉터리만 업로드 가능 |
| check-name API | `userId` 파라미터를 서버에서 세션으로 재검증 (spoofing 방지 고려) |
| 파일 크기 | Storage policy에서도 2MB 제한 설정 |

---

## 11. Implementation Guide

### 11.1 구현 순서

```
Module-1: DB 마이그레이션
  - 012_profile_display_name_unique.sql 작성
  - Supabase Storage avatars 버킷 생성
  - RLS policy 추가

Module-2: AvatarUploadButton 컴포넌트
  - src/components/ui/AvatarUploadButton.tsx 신규
  - 파일 선택 → 검증 → Storage 업로드 → avatar_url 갱신

Module-3: 닉네임 중복 체크
  - src/app/api/profiles/check-name/route.ts 신규
  - ProfileForm.tsx handleSave에 중복 체크 API 호출 추가
  - nameError 인라인 표시

Module-4: UI 개선
  - ProfileForm.tsx 레이아웃: 아바타 행 우측에 AvatarUploadButton 배치
  - /me/settings/page.tsx: ← 프로필로 링크 제거
  - Header.tsx: avatarUrl 소스를 profiles.avatar_url 우선으로 변경
```

### 11.2 파일별 변경 요약

| 파일 | 작업 | 예상 규모 |
|------|------|----------|
| `012_profile_display_name_unique.sql` | 신규 | ~5줄 |
| `AvatarUploadButton.tsx` | 신규 | ~80줄 |
| `api/profiles/check-name/route.ts` | 신규 | ~30줄 |
| `ProfileForm.tsx` | 수정 | +40줄 |
| `/me/settings/page.tsx` | 수정 | -6줄 |
| `Header.tsx` | 수정 | +10줄 |

### 11.3 Session Guide

#### Module Map

| Module | 내용 | 파일 |
|--------|------|------|
| module-1 | DB 마이그레이션 + Storage 설정 | `012_*.sql` |
| module-2 | AvatarUploadButton 컴포넌트 | `AvatarUploadButton.tsx` |
| module-3 | 닉네임 중복 체크 API + Form 연결 | `check-name/route.ts`, `ProfileForm.tsx` |
| module-4 | UI 개선 + 헤더 수정 | `settings/page.tsx`, `Header.tsx` |

#### Recommended Session Plan

```
Single Session: /pdca do profile-settings
  → module-1 → module-2 → module-3 → module-4 순서로 진행 (예상 1세션)

또는 분리:
  Session A: /pdca do profile-settings --scope module-1,module-2
  Session B: /pdca do profile-settings --scope module-3,module-4
```
