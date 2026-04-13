# profile-settings Planning Document

> **Summary**: 닉네임 중복 불가 + 최대 30자, 프로필 사진 변경, 기본정보 UI 개선
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
| **Problem** | 닉네임 중복이 허용되어 사용자 식별이 불명확하고, 프로필 사진 변경 수단이 없으며, 기본정보 UI가 불완전함 |
| **Solution** | Supabase DB 유니크 제약 + 클라이언트 중복 체크, Storage `avatars` 버킷에 사진 업로드, 기본정보 UI 개선 |
| **Function/UX Effect** | 닉네임 유일성 보장으로 검색·멘션 신뢰도 상승, 사진 변경으로 프로필 개성 부여, UI 정리로 탐색 흐름 단순화 |
| **Core Value** | 사용자 정체성의 고유성과 시각적 표현 수단 제공 |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 닉네임 중복 및 사진 미변경 제약이 사용자 경험을 훼손 |
| **WHO** | 로그인한 일반 회원 (프로필 설정 접근 유저) |
| **RISK** | 기존 닉네임 중복 데이터 존재 시 DB 제약 추가 실패 가능 |
| **SUCCESS** | 중복 닉네임 저장 차단, 사진 업로드 성공, UI 변경 완료 |
| **SCOPE** | Phase 1: DB 제약 마이그레이션 / Phase 2: 사진 업로드 / Phase 3: UI 개선 |

---

## 1. Overview

### 1.1 Purpose

현재 `ProfileForm`은 닉네임 `maxLength={30}` 입력 제한만 있고 서버·DB 측 중복 검사가 없다. 또한 프로필 사진은 Google OAuth 메타데이터 URL만 표시되고 변경 수단이 없다. 기본정보 페이지에는 불필요한 `← 프로필로` 링크가 있어 탐색 흐름이 복잡하다.

### 1.2 Background

- `profiles.display_name`에 UNIQUE 제약이 없어 동명이인 계정이 생성 가능
- Supabase Storage `avatars` 버킷을 활용한 커스텀 사진 업로드 미구현
- `/me/settings` 페이지 상단에 `← 프로필로` 링크 중복 탐색 유발

### 1.3 Related Documents

- `src/app/[locale]/me/settings/page.tsx` — 기본정보 페이지
- `src/app/[locale]/me/profile/ProfileForm.tsx` — 닉네임 수정 폼
- `supabase/migrations/001_initial_schema.sql` — profiles 테이블 정의

---

## 2. Scope

### 2.1 In Scope

- [x] `profiles.display_name` UNIQUE 제약 마이그레이션 (기존 중복 데이터 정리 후)
- [x] 닉네임 저장 전 클라이언트 중복 체크 (Supabase query)
- [x] 닉네임 최대 30자 서버 측 검증
- [x] Supabase Storage `avatars` 버킷에 프로필 사진 업로드
- [x] `profiles.avatar_url` 갱신 후 헤더 UserAvatar 즉시 반영
- [x] 기본정보 헤더: `flex items-center gap-4` 우측에 사진 변경 버튼 배치
- [x] `← 프로필로` 링크 제거 (`/me/settings/page.tsx`)

### 2.2 Out of Scope

- 사진 크롭·리사이즈 UI (추후)
- 닉네임 변경 이력 추적
- 이메일 변경

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | `profiles.display_name` UNIQUE 제약 추가 (마이그레이션) | High | Pending |
| FR-02 | 닉네임 저장 시 중복 체크: 이미 사용 중이면 인라인 에러 표시 | High | Pending |
| FR-03 | 닉네임 최대 30자 (input `maxLength` + 서버 검증) | Medium | Pending |
| FR-04 | 프로필 사진 파일 선택 → Supabase Storage 업로드 → `avatar_url` 갱신 | High | Pending |
| FR-05 | 업로드 중 로딩 상태 표시, 완료 후 미리보기 즉시 갱신 | Medium | Pending |
| FR-06 | 기본정보 아바타 행 우측에 "사진 변경" 버튼 배치 | Medium | Pending |
| FR-07 | `← 프로필로` 링크 제거 | Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 이미지 업로드 완료 후 미리보기 < 1s | 브라우저 Network 탭 |
| Security | 업로드 파일 MIME 타입 검증 (image/\*), 최대 2MB | 클라이언트 + Supabase Storage policy |
| UX | 중복 닉네임 에러는 submit 후 인라인으로 표시 | 수동 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] FR-01~FR-07 모두 구현
- [ ] 중복 닉네임 입력 시 에러 메시지 표시
- [ ] 사진 업로드 후 `profiles.avatar_url` DB 반영 확인
- [ ] `← 프로필로` 링크 페이지에서 제거 확인

### 4.2 Quality Criteria

- [ ] TypeScript 빌드 오류 없음
- [ ] 이미지 2MB 초과 시 클라이언트 경고 표시
- [ ] 모바일에서 사진 선택 (갤러리) 정상 동작

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 기존 DB에 중복 `display_name` 존재 | High | Medium | 마이그레이션 전 중복 확인 쿼리 실행 후 정리 |
| Supabase Storage 버킷 미생성 | High | Low | 마이그레이션에 bucket 생성 포함 또는 대시보드 수동 생성 문서화 |
| 헤더 `UserAvatar`가 DB `avatar_url` 아닌 OAuth 메타데이터 사용 | Medium | High | `Header.tsx`의 avatarUrl 소스를 `profiles.avatar_url` 우선으로 변경 |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| `profiles.display_name` | DB Column | UNIQUE 제약 추가 |
| `profiles.avatar_url` | DB Column | Storage URL로 갱신 |
| `ProfileForm.tsx` | Component | 중복 체크 로직, 사진 업로드 UI 추가 |
| `/me/settings/page.tsx` | Page | `← 프로필로` 링크 제거 |
| `Header.tsx` | Component | avatarUrl 소스 변경 (profiles 우선) |

### 6.2 Current Consumers

| Resource | Operation | Code Path | Impact |
|----------|-----------|-----------|--------|
| `profiles.display_name` | READ | `Header.tsx` — `user_metadata.full_name` | 확인 필요 (DB 값 우선으로 변경) |
| `profiles.avatar_url` | READ | `UserAvatar` 전체 | 기존 URL null이면 fallback 유지 |
| `ProfileForm.tsx` | UPDATE | `/me/settings/page.tsx` | 직접 영향 |

### 6.3 Verification

- [ ] 중복 제약 추가 후 기존 저장 흐름 정상 동작 확인
- [ ] 헤더 아바타가 Storage URL 반영 확인

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Characteristics | Selected |
|-------|-----------------|:--------:|
| **Starter** | 단순 컴포넌트 수정 | ☐ |
| **Dynamic** | Supabase Storage + DB 마이그레이션 포함 | ☑ |
| **Enterprise** | — | ☐ |

### 7.2 Key Architectural Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| 이미지 저장소 | Supabase Storage `avatars` | 기존 인프라 활용, 추가 비용 없음 |
| 중복 체크 시점 | submit 시 (onChange 아님) | 과도한 API 호출 방지 |
| 파일 경로 | `avatars/{userId}/avatar.webp` | 유저별 디렉터리 격리 |
| MIME 검증 | 클라이언트 `accept="image/*"` + 2MB 제한 | UX 즉각 피드백 |

### 7.3 Folder Structure

```
src/
  app/[locale]/me/
    settings/page.tsx         ← ← 프로필로 제거
    profile/
      ProfileForm.tsx         ← 중복 체크 + 사진 업로드 추가
supabase/migrations/
  012_profile_display_name_unique.sql  ← 신규
```

---

## 8. Convention Prerequisites

### 8.1 Environment Variables Needed

| Variable | Purpose | 현재 상태 |
|----------|---------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Storage URL 구성 | 이미 존재 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Storage 접근 | 이미 존재 |

---

## 9. Next Steps

1. [ ] `/pdca design profile-settings` — 설계 문서 작성
2. [ ] Supabase Storage `avatars` 버킷 public 설정 확인
3. [ ] 구현 시작
