# ClipClef Playlist Archive Planning Document

> **Summary**: 유튜브 인기 플레이리스트를 관리자가 직접 큐레이션하여 아카이빙하는 미니멀 서비스
>
> **Project**: clipclef
> **Version**: 0.1.0
> **Author**: jinwang
> **Date**: 2026-04-06
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 유튜브 플레이리스트는 분산되어 있어 분위기·장르·장소별로 한눈에 탐색하기 어렵다 |
| **Solution** | 관리자가 URL만 입력하면 YouTube API로 자동 파싱하여 필터·정렬 가능한 아카이브로 구성 |
| **Function/UX Effect** | 채널/장르/분위기/장소 4종 필터 + 3종 정렬로 원하는 플리를 즉시 발견, 썸네일 클릭 시 트랙리스트 확인 및 Google 소셜 로그인 후 내 컬렉션 담기, 좋아요, 댓글 가능 |
| **Core Value** | 잘 고른 플레이리스트를 쉽게 발견하고, 음악 취향을 기반으로 커뮤니티가 반응하는 큐레이션 아카이브 |

---

## Context Anchor

> Auto-generated from Executive Summary. Propagated to Design/Do documents for context continuity.

| Key | Value |
|-----|-------|
| **WHY** | 유튜브 플리는 분산되어 있어 분위기·장르별 탐색이 불가능하고, 좋은 플리를 발견하기 어렵다 |
| **WHO** | 음악 취향이 있는 일반 사용자 (탐색·반응) + 큐레이터 역할의 관리자 (등록·관리) |
| **RISK** | YouTube Data API quota 제한 (일 10,000 유닛), 관리자 인증 보안, 익명 스팸 댓글 |
| **SUCCESS** | 플리 탐색 → 트랙리스트 확인 → 댓글/좋아요 전체 플로우 동작, 4종 필터 + 3종 정렬 정상 작동 |
| **SCOPE** | Phase 1: 플리 아카이브 + 필터/정렬 / Phase 2: 소셜 로그인 + 좋아요, 댓글, 내 컬렉션 기능 / Phase 3: 관리자 페이지 |

---

## 1. Overview

### 1.1 Purpose

유튜브에 흩어져 있는 인기 플레이리스트를 채널·장르·분위기·장소 기준으로 필터링하고, 트랙리스트를 확인하며 영상을 컬렉팅하거나 좋아요/댓글로 소통할 수 있는 큐레이션 아카이브 서비스를 제공한다.

### 1.2 Background

- 유튜브 플레이리스트는 플랫폼 내 검색으로만 탐색 가능하며, 분위기·장소 등 감성적 기준으로 필터링하는 수단이 없음
- 개인 큐레이터가 선별한 플리를 한 곳에 모아두고, 방문자가 쉽게 발견하고 반응할 수 있는 공간에 대한 수요 존재
- 관리자(개인)가 YouTube URL을 등록하면 API가 자동으로 메타데이터와 트랙리스트를 가져와 관리 부담 최소화

### 1.3 Related Documents

- YouTube Data API v3: https://developers.google.com/youtube/v3
- Supabase Docs: https://supabase.com/docs

---

## 2. Scope

### 2.1 In Scope

- [x] 플레이리스트 아카이브 목록 페이지 (그리드 카드 레이아웃)
- [x] 장르별 / 분위기별 / 장소별 / 시대별 필터링 (4종, 복수 선택 가능)
- [x] 최신순 / 조회순 / 좋아요순 정렬 (3종)
- [x] 플레이리스트 상세 페이지 (썸네일, 트랙리스트, 설명, 좋아요, 댓글, 컬렉션 담기, 해당 유튜브 딥링크)
- [x] 댓글 작성/조회 (Google 소셜 로그인 필요)
- [x] 좋아요 토글 (Google 소셜 로그인 필요)
- [x] Google OAuth 소셜 로그인 (Supabase Auth)
- [x] 관리자 페이지 (`/admin`) — 플리 등록/수정/삭제
- [x] YouTube URL 입력 → API 자동 파싱 (제목, 썸네일, 트랙리스트, 채널명, 조회수)
- [x] 관리자 등록 시 태그 입력 (장르, 분위기, 장소)
- [x] 한글, 영어 지원

### 2.2 Out of Scope

- 일반 사용자의 플레이리스트 직접 등록 (관리자 전용)
- 알림 기능 (이메일, 푸시)
- 플레이리스트 재생목록 만들기/저장 기능

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 플레이리스트 목록 페이지: 썸네일 카드 그리드, 제목/채널명/좋아요수 표시 | High | Pending |
| FR-02 | 채널별 필터 (드롭다운 or 칩 UI) | High | Pending |
| FR-03 | 장르별 필터 (Pop, Hip-hop, Jazz, Classical, Lo-fi, K-pop 등 태그) | High | Pending |
| FR-04 | 분위기별 필터 (Chill, Energetic, Sad, Happy, Focus, Romantic 등) | High | Pending |
| FR-05 | 장소별 필터 (카페, 드라이브, 운동, 공부, 파티, 수면 등) | High | Pending |
| FR-06 | 정렬: 최신순 / 좋아요순 / 조회수순 | High | Pending |
| FR-07 | 플레이리스트 상세 페이지: 트랙리스트 (번호, 제목, 아티스트, 길이) | High | Pending |
| FR-08 | 상세 페이지: 유튜브 원본 링크 버튼 | High | Pending |
| FR-09 | 상세 페이지: 좋아요 토글 (비로그인 시 로그인 유도) | High | Pending |
| FR-10 | 상세 페이지: 댓글 작성/목록 (비로그인 시 읽기 가능, 쓰기는 로그인 필요) | High | Pending |
| FR-11 | Google OAuth 소셜 로그인/로그아웃 (Supabase Auth) | High | Pending |
| FR-12 | 관리자 페이지 `/admin`: 플리 등록 (YouTube URL 입력) | High | Pending |
| FR-13 | 관리자 플리 등록 시 YouTube API로 자동 파싱 (제목, 썸네일, 트랙리스트, 채널, 조회수) | High | Pending |
| FR-14 | 관리자 수동 태그 입력 (장르, 분위기, 장소 — 복수 선택) | High | Pending |
| FR-15 | 관리자 플리 수정/삭제 | Medium | Pending |
| FR-16 | 관리자 인증: 환경변수로 지정된 이메일만 admin 역할 부여 | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 목록 페이지 LCP < 2.5s | Vercel Analytics / Lighthouse |
| API Quota | YouTube API 일 10,000 유닛 초과 방지 — 등록 시 1회만 호출, 이후 DB 캐시 | API 사용량 모니터링 |
| Security | Admin 접근 RLS + 서버 사이드 role 검증 | Supabase RLS 정책 |
| Accessibility | 키보드 탐색, 이미지 alt 텍스트 | Lighthouse Accessibility ≥ 90 |
| Responsiveness | 모바일/태블릿/데스크톱 반응형 | 브라우저 dev tools |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 홈(목록) → 상세 → 댓글/좋아요 전체 유저 플로우 동작
- [ ] 4종 필터 + 3종 정렬 정상 작동 (단독/복합 필터 모두)
- [ ] 관리자 YouTube URL 입력 → 트랙리스트 자동 파싱 동작
- [ ] Google 소셜 로그인 → 댓글 작성 → 좋아요 토글 동작
- [ ] 비관리자가 `/admin` 접근 시 차단
- [ ] Vercel 배포 후 실사용 가능 상태

### 4.2 Quality Criteria

- [ ] TypeScript 타입 에러 없음
- [ ] ESLint 에러 없음
- [ ] 모바일 반응형 확인 (375px 이상)
- [ ] YouTube API quota 낭비 없음 (등록 시 1회 호출, DB 저장)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| YouTube Data API quota 초과 (일 10,000 유닛) | High | Medium | 플리 등록 시에만 API 호출, 이후 Supabase DB에 캐시. 트랙리스트는 등록 시점에 전체 저장 |
| 관리자 권한 우회 | High | Low | Supabase RLS로 서버단 강제 검증 + Next.js middleware에서 role 체크 |
| Google OAuth 설정 오류 | Medium | Low | Supabase Dashboard에서 OAuth 설정 문서화, 로컬 callback URL 별도 등록 |
| 삭제된 YouTube 플리 처리 | Medium | Medium | 주기적 존재 여부 확인 or 관리자 수동 비활성화 처리 |
| 익명 스팸 댓글 | Low | Medium | 로그인 유저만 댓글 작성 가능 (Google 로그인 장벽) |

---

## 6. Impact Analysis

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| playlists | DB Table | 신규 생성 — 플리 메타데이터 저장 |
| tracks | DB Table | 신규 생성 — 트랙리스트 저장 |
| comments | DB Table | 신규 생성 — 댓글 저장 |
| likes | DB Table | 신규 생성 — 좋아요 저장 |
| users (Supabase Auth) | Auth | 기존 Supabase auth.users 활용 + profiles 테이블 확장 |

### 6.2 Current Consumers

신규 프로젝트이므로 기존 소비자 없음.

### 6.3 Verification

- [ ] Supabase RLS 정책으로 각 테이블 접근 권한 검증
- [ ] Admin role은 환경변수 이메일 기반으로 서버에서만 검증

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites, portfolios | ☐ |
| **Dynamic** | Feature-based modules, BaaS integration | Web apps with backend, SaaS MVPs | ☑ |
| **Enterprise** | Strict layer separation, microservices | High-traffic systems | ☐ |

### 7.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Framework | Next.js / React / Vue | **Next.js 14 App Router** | SSR/SSG 지원, Vercel 배포 최적 |
| State Management | Context / Zustand / TanStack Query | **Zustand + TanStack Query** | 서버 상태는 TQ, 클라이언트 UI 상태는 Zustand |
| API Client | fetch / axios / react-query | **TanStack Query + fetch** | 캐싱, 필터 파라미터 관리 |
| Styling | Tailwind / CSS Modules / styled-components | **Tailwind CSS** | 미니멀 디자인에 최적, 빠른 구현 |
| Testing | Jest / Vitest / Playwright | **Playwright** | E2E 플로우 검증 중심 |
| Backend | BaaS (Supabase) / Custom Server | **Supabase** | PostgreSQL + Auth + RLS, MCP 연결 가능 |
| YouTube | YouTube Data API v3 | **YouTube Data API v3** | 플리 메타데이터 + 트랙리스트 자동 파싱 |

### 7.3 Clean Architecture Approach

```
Level: Dynamic

src/
├── app/                          # Next.js App Router
│   ├── (main)/
│   │   ├── page.tsx              # 목록 페이지 (필터/정렬)
│   │   └── playlist/[id]/
│   │       └── page.tsx          # 상세 페이지 (트랙리스트, 댓글)
│   ├── admin/
│   │   ├── layout.tsx            # Admin 인증 가드
│   │   └── page.tsx              # 플리 등록/관리
│   ├── api/
│   │   ├── youtube/route.ts      # YouTube API 파싱 엔드포인트
│   │   └── auth/callback/route.ts
│   └── layout.tsx
├── components/
│   ├── ui/                       # Button, Badge, Input, Card, Modal
│   └── features/
│       ├── playlist/             # PlaylistCard, PlaylistGrid, TrackList
│       ├── filter/               # FilterBar, FilterChip, SortSelect
│       ├── comment/              # CommentList, CommentForm
│       └── auth/                 # LoginButton, UserAvatar
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # 브라우저 클라이언트
│   │   └── server.ts             # 서버 클라이언트
│   ├── youtube.ts                # YouTube Data API 헬퍼
│   └── utils.ts
├── hooks/
│   ├── usePlaylists.ts           # 필터/정렬 포함 목록 쿼리
│   ├── usePlaylistDetail.ts
│   ├── useComments.ts
│   └── useLikes.ts
├── stores/
│   └── filter-store.ts           # 필터/정렬 상태 (Zustand)
└── types/
    └── index.ts
```

---

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions

- [ ] `CLAUDE.md` — 신규 생성 예정
- [ ] ESLint + Prettier — Next.js 기본 설정 사용
- [ ] TypeScript strict mode

### 8.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | 미정 | 컴포넌트 PascalCase, 훅 camelCase, DB 컬럼 snake_case | High |
| **Folder structure** | 미정 | features/ 하위 도메인별 분리 | High |
| **Server/Client 구분** | 미정 | 'use client' 최소화, 데이터 페칭은 Server Component | High |
| **Environment variables** | 미정 | NEXT_PUBLIC_ prefix 규칙 | Medium |

### 8.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Client | ☐ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Client | ☐ |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin 작업용 service role | Server | ☐ |
| `YOUTUBE_API_KEY` | YouTube Data API v3 키 | Server | ☐ |
| `ADMIN_EMAIL` | 관리자 이메일 (role 검증) | Server | ☐ |

---

## 9. Next Steps

1. [ ] `/pdca design clipclef-playlist-archive` — DB 스키마, API 스펙, 컴포넌트 구조 설계
2. [ ] Next.js 프로젝트 초기화 (`create-next-app`)
3. [ ] Supabase 프로젝트 생성 + 테이블 마이그레이션
4. [ ] YouTube API 키 발급 + quota 설정

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-06 | Initial draft | jinwang |
