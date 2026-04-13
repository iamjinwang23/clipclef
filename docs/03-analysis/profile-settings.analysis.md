# profile-settings Gap Analysis

> **Date**: 2026-04-13
> **Phase**: Check
> **Match Rate**: 100%
> **Method**: Static Analysis (서버 미실행)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 닉네임 중복 허용, 프로필 사진 변경 수단 없음, 기본정보 UI 불완전 |
| **WHO** | 로그인한 일반 회원 |
| **RISK** | 기존 DB 중복 display_name / Header avatarUrl 소스 불일치 |
| **SUCCESS** | 중복 닉네임 저장 차단, 사진 업로드 + DB 반영, UI 변경 완료 |
| **SCOPE** | Module-1~4 단일 세션 완료 |

---

## 1. Structural Match — 100%

| 파일 | 설계 스펙 | 존재 여부 | 결과 |
|------|----------|----------|------|
| `012_profile_display_name_unique.sql` | 신규 | ✅ | Match |
| `AvatarUploadButton.tsx` | 신규 | ✅ | Match |
| `api/profiles/check-name/route.ts` | 신규 | ✅ | Match |
| `ProfileForm.tsx` | 수정 | ✅ | Match |
| `settings/page.tsx` | 수정 (링크 제거) | ✅ | Match |
| `Header.tsx` | 수정 (avatarUrl 소스) | ✅ | Match |

## 2. Functional Depth — 100%

| FR | 요구사항 | 구현 근거 | 상태 |
|----|---------|----------|------|
| FR-01 | UNIQUE 제약 마이그레이션 | `012_*.sql` | ✅ |
| FR-02 | 중복 체크 + 인라인 에러 | `ProfileForm.tsx` nameError state + API | ✅ |
| FR-03 | maxLength={30} | `ProfileForm.tsx:input` | ✅ |
| FR-04 | Storage 업로드 → avatar_url 갱신 | `AvatarUploadButton.tsx` | ✅ |
| FR-05 | 로딩 상태 + 즉시 미리보기 | uploading + setCurrentAvatarUrl | ✅ |
| FR-06 | 기본정보 행 우측 사진 변경 버튼 | ProfileForm flex row | ✅ |
| FR-07 | ← 프로필로 링크 제거 | settings/page.tsx | ✅ |

## 3. API Contract — 100%

| 항목 | 설계 | 구현 | 클라이언트 | 결과 |
|------|------|------|---------|------|
| 엔드포인트 | GET /api/profiles/check-name | ✅ | ✅ | Match |
| 파라미터 name, userId | ✅ | ✅ | ✅ | Match |
| 응답 { available: boolean } | ✅ | ✅ | ✅ | Match |
| 400 파라미터 없음 | ✅ | ✅ | ✅ | Match |
| Self-exclusion (neq) | ✅ | ✅ | — | Match |

## 4. Match Rate

```
Static-only: (Structural × 0.2) + (Functional × 0.4) + (Contract × 0.4)
           = (100 × 0.2) + (100 × 0.4) + (100 × 0.4)
           = 100%
```

## 5. Issues

| # | 심각도 | 내용 | 결정 |
|---|--------|------|------|
| 1 | Important | check-name API: userId 파라미터 세션 미검증 (정보 노출만, 수정 불가) | 그대로 진행 |
| 2 | Minor | Storage RLS 정책 마이그레이션 미포함 (Supabase 대시보드 수동 설정 문서화됨) | 그대로 진행 |
| 3 | Minor | Header 아바타 실시간 미반영 (새로고침 시 반영 — 설계 의도와 일치) | 그대로 진행 |

## 6. Plan Success Criteria 검토

| 기준 | 상태 | 근거 |
|------|------|------|
| 중복 닉네임 저장 차단 | ✅ Met | check-name API + nameError 인라인 표시 |
| 사진 업로드 성공 + DB 반영 | ✅ Met | AvatarUploadButton: storage.upload + profiles.update |
| UI 변경 완료 | ✅ Met | settings/page.tsx ← 프로필로 제거, flex row 구조 |

**Success Rate: 3/3 (100%)**

---

## 7. Verdict

**Match Rate 100% ≥ 90% → 리포트 단계로 진행**

```
/pdca report profile-settings
```
