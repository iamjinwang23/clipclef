# Feature Plan: mobile-touch-fixes ✅ 완료 (2026-04-12)

## Executive Summary

| 관점 | 내용 |
|------|------|
| Problem | iOS Safari에서 필터 칩이 터치되지 않음 + 인앱 브라우저(네이버앱 등)에서 Google OAuth 403 에러 |
| Solution | (1) 필터 스크롤 컨테이너의 `scroll-snap-type` 제거 (2) 인앱 브라우저 감지 후 외부 브라우저 안내 |
| UX Effect | iOS 사용자 필터 정상 사용 + 인앱 브라우저 사용자에게 명확한 안내 메시지 |
| Core Value | 모바일 주 사용자 환경(iPhone Safari, 네이버앱)에서의 핵심 기능 접근성 확보 |

## Context Anchor

| | |
|--|--|
| WHY | iOS Safari tap 인식 불가로 필터 기능 사용 불가 → 핵심 UX 차단 |
| WHO | iPhone Safari 사용자 / 네이버앱·카카오톡 등 인앱 브라우저 사용자 |
| RISK | scroll-snap 제거 → 필터 row는 스냅이 불필요하므로 부작용 없음. 인앱 감지 false positive 가능성 낮음 |
| SUCCESS | iOS Safari에서 필터 칩 터치 정상 동작. 인앱 브라우저에서 로그인 시 안내 메시지 표시 |
| SCOPE | FilterBar.tsx (scroll-snap 제거), browser.ts (인앱 감지 유틸), LoginModal.tsx, Header.tsx |

## 근본 원인

### iOS 필터 터치 불응
- `scroll-snap-type: x mandatory`를 필터 칩 스크롤 컨테이너에 적용
- iOS Safari는 snap scrolling 영역의 touch를 scroll 판별 목적으로 가로채므로 내부 tap 이벤트 억제
- 해결: `scrollSnapType` 제거. 필터 row는 자유 스크롤이 적합 (snap은 캐러셀용)

### 인앱 브라우저 OAuth 차단
- Google OAuth는 서드파티 앱 WebView에서 `disallowed_useragent` (403)로 차단
- Google 정책 레벨 제한으로 코드 우회 불가
- 해결: UA 기반 인앱 브라우저 감지 후 "Safari/Chrome에서 접속" 안내

## 구현 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/features/filter/components/FilterBar.tsx` | 스크롤 컨테이너 `scrollSnapType: 'x mandatory'` 제거 |
| `src/features/filter/components/FilterChip.tsx` | `touch-action: manipulation` 추가 (보조) |
| `src/lib/browser.ts` | `isInAppBrowser()` 유틸 신규 |
| `src/features/interaction/components/LoginModal.tsx` | 인앱 시 안내 메시지 분기 |
| `src/components/layout/Header.tsx` | `handleLogin`에 인앱 guard 추가 |

## 알려진 제한

- 인앱 브라우저에서 Google 로그인 자체는 Google 정책상 허용 불가
- UA 기반 감지이므로 UA를 커스텀한 일부 브라우저는 인앱 판별 누락 가능 (edge case)
