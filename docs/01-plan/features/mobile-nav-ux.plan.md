# Feature Plan: mobile-nav-ux

## Executive Summary

| 관점 | 내용 |
|------|------|
| Problem | 모바일 헤더가 데스크톱 헤더를 그대로 축소한 구조로, 검색·업로드·알림·로그인 아이콘이 중복되어 하단 탭바와 충돌 |
| Solution | 모바일 헤더를 로고+뒤로가기 전용으로 단순화, 하단 탭바를 앱 네비게이션 허브로 격상, 검색·프로필 전용 페이지 신설 |
| UX Effect | 앱 스토어 수준의 모바일 네비게이션 패턴으로 탐색 직관성 향상, depth-aware 뒤로가기로 맥락 유지 |
| Core Value | 주 사용자인 모바일 환경에서 앱과 동일한 자연스러운 탐색 경험 제공 |

## Context Anchor

| | |
|--|--|
| WHY | 하단 탭바 추가 후 모바일 헤더와 기능이 중복 → 사용자 혼란 + 헤더 공간 낭비 |
| WHO | 스마트폰으로 접속하는 모든 사용자 (전체 트래픽의 다수) |
| RISK | Header 리팩터링 범위가 넓음 → 데스크톱 레이아웃 영향 없도록 `sm:` 분기 철저히 유지 |
| SUCCESS | 모바일에서 헤더 아이콘 중복 제거, 탭 루트 탐색 0-tap, 탭 내 depth 이동 시 뒤로가기 노출 |
| SCOPE | Header.tsx, MobileBottomNav.tsx, 신규 /search 페이지, 신규 /me/profile 페이지, layout.tsx footer |

## 1. 요구사항

### 1.1 모바일 헤더 단순화
- 로고(좌측)만 유지, 데스크톱 전용 요소는 `hidden sm:flex`로 유지
- 모바일에서 검색 아이콘·업로드 아이콘·알림 아이콘·로그인/아바타 버튼 모두 제거
- 대신 depth-aware 뒤로가기 버튼을 헤더 좌측에 조건부 노출

### 1.2 뒤로가기 버튼 규칙
- **탭 루트 (depth 1)**: 뒤로가기 없음
  - `/[locale]` (홈)
  - `/[locale]/search`
  - `/[locale]/upload`
  - `/[locale]/me/notifications`
  - `/[locale]/me/profile`
- **그 외 모든 경로 (depth 2+)**: `←` 뒤로가기 버튼 표시 (`router.back()`)
- `usePathname()`으로 현재 경로 판별, `TAB_ROOTS` 상수로 관리

### 1.3 검색 전용 페이지 신설
- 경로: `/[locale]/search`
- 진입 즉시 검색 인풋 auto-focus
- 기존 SearchOverlay 로직 재활용 (query state, 결과 목록)
- 하단 탭 "검색" 탭 클릭 → 이 페이지로 router.push

### 1.4 프로필 탭 동작
- 로그인 상태: UserAvatar 아이콘 + `/me/profile`로 이동
- 미로그인 상태: 빈 원형 아바타(person SVG) + 탭 탭 시 로그인 팝업(기존 LoginModal 또는 OAuth 직접 호출)
- `/[locale]/me/profile` 페이지: 내 공개 프로필 표시 (향후 구현 예정 — 현재는 redirect 또는 placeholder)

### 1.5 푸터 모바일 숨김
- `layout.tsx`의 `<footer>`: `hidden sm:block` 처리

### 1.6 MobileBottomNav 고정 확인
- 이미 `fixed bottom-0` 적용됨 — 재확인 후 필요시 `z-index` 충돌 점검

## 2. 파일 목록

| 파일 | 변경 유형 | 내용 |
|------|-----------|------|
| `src/components/layout/Header.tsx` | 수정 | 모바일 헤더: 로고 + depth-aware 뒤로가기, 데스크톱 전용 아이콘 `hidden sm:flex` |
| `src/components/layout/MobileBottomNav.tsx` | 수정 | 검색 탭 → `/search` push, 프로필 탭 → 미로그인 시 로그인 팝업 |
| `src/app/[locale]/search/page.tsx` | 신규 | 검색 전용 페이지 (auto-focus input + 결과) |
| `src/app/[locale]/me/profile/page.tsx` | 신규 | 내 공개 프로필 페이지 (placeholder or redirect) |
| `src/app/[locale]/layout.tsx` | 수정 | footer `hidden sm:block` |
| `src/lib/nav.ts` | 신규 (선택) | `TAB_ROOTS` 상수 공유용 |

## 3. 엣지 케이스

| 케이스 | 처리 |
|--------|------|
| 로그인 후 프로필 탭 클릭 | `/me/profile` push |
| 미로그인 프로필 탭 클릭 | LoginModal 또는 OAuth 팝업 |
| `/me/profile` 직접 URL 진입 (미로그인) | 서버에서 redirect to `/[locale]` or 클라이언트 guard |
| 업로드 탭 (미로그인) | 기존 동작 유지 (handleLogin) |
| 검색 탭 → 뒤로가기 | `/search`는 탭 루트이므로 뒤로가기 없음 |
| 이전 history 없을 때 router.back() | `window.history.length <= 1` 체크 후 홈으로 fallback |

## 4. 성공 기준

- [ ] 모바일 헤더에 검색·업로드·알림·아바타 아이콘 미노출
- [ ] 탭 루트 5개 경로에서 뒤로가기 버튼 없음
- [ ] 탭 루트 아닌 경로에서 뒤로가기 버튼 노출 및 동작
- [ ] 검색 탭 클릭 → `/search` 페이지 진입 + 인풋 auto-focus
- [ ] 프로필 탭: 로그인 시 아바타, 미로그인 시 빈 원
- [ ] 모바일에서 푸터 미노출
- [ ] 데스크톱 (`sm:` 이상) 레이아웃 변화 없음
