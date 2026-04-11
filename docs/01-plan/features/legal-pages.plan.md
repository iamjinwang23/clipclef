# Legal Pages Planning Document

> **Summary**: ClipClef 서비스에 적합한 이용약관·개인정보처리방침 페이지 추가 및 푸터 좌측 정렬 배치
>
> **Project**: clipclef
> **Version**: 0.1.0
> **Author**: jinwang
> **Date**: 2026-04-11
> **Status**: Approved

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 서비스 운영에 필수적인 이용약관·개인정보처리방침이 없어 법적 공백 상태 |
| **Solution** | ClipClef 서비스 특성(Google OAuth, 유튜브 콘텐츠, Supabase)에 맞는 약관 페이지 2종 작성 및 푸터 배치 |
| **Function/UX Effect** | 푸터 좌측 정렬: 로고 → 이용약관 → 개인정보처리방침 링크. 각 페이지는 다크테마 일관성 유지 |
| **Core Value** | 서비스 신뢰도 확보 및 개인정보보호법 준수 |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 서비스 공개 운영을 위한 법적 최소 요건 충족 |
| **WHO** | 서비스 이용자 전체 (약관 열람), 관리자 (법적 보호) |
| **RISK** | 약관 내용이 실제 데이터 수집 범위와 불일치할 경우 법적 리스크 |
| **SUCCESS** | 두 페이지 정상 접근 + 푸터에 좌측 정렬로 세 항목(로고·이용약관·개인정보처리방침) 노출 |
| **SCOPE** | 약관 2종 페이지 생성 + layout.tsx 푸터 개편 (3파일) |

---

## 1. 요구사항

### 1.1 이용약관 (Terms of Service)
- 서비스명: ClipClef
- 서비스 성격: 유튜브 플레이리스트 큐레이션 아카이브 (비상업적)
- 주요 내용: 서비스 개요, 이용 조건, 금지 행위(스팸·욕설 댓글), 저작권 안내, 서비스 변경·종료, 면책 조항

### 1.2 개인정보처리방침 (Privacy Policy)
- 수집 항목: 이름, 이메일, 프로필 이미지 (Google OAuth 소셜 로그인)
- 수집 목적: 회원 식별, 댓글·좋아요·컬렉션 기능 제공
- 처리 위탁: Supabase (인증·DB)
- 보관 기간: 회원 탈퇴 시까지
- 제3자 미제공

### 1.3 푸터 레이아웃 개편
- 정렬: 좌측 (`text-left`)
- 순서: 로고 이미지 → 이용약관 → 개인정보처리방침
- 기존 copyright 문구 유지 (하단)
- 스타일: 기존 `var(--subtle)` 텍스트 톤 유지, hover 시 foreground 전환

---

## 2. 구현 파일

| 파일 | 작업 |
|------|------|
| `src/app/[locale]/terms/page.tsx` | 이용약관 페이지 신규 생성 |
| `src/app/[locale]/privacy/page.tsx` | 개인정보처리방침 페이지 신규 생성 |
| `src/app/[locale]/layout.tsx` | 푸터 좌측 정렬 + 링크 추가 |
