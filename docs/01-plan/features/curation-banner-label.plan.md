# Feature Plan: curation-banner-label

## Executive Summary

| 관점 | 내용 |
|------|------|
| Problem | 홈 큐레이션 배너 상단에 "큐레이션 콜렉션"으로 표기되어 최근 정리한 용어 체계("큐레이션"으로 통일)와 어긋남 |
| Solution | 배너 내 라벨 텍스트 한 줄을 "큐레이션"으로 변경 |
| UX Effect | 홈 배너 → 큐레이션 상세까지 같은 단어로 이어지는 일관된 톤 |
| Core Value | 브랜드 핵심어("큐레이션") 반복 노출로 정체성 강화 |

## Context Anchor

| | |
|--|--|
| WHY | 홈 배너 라벨만 "큐레이션 콜렉션" 이중 수식이 남아 있어 용어 정리 원칙 위반 |
| WHO | 모든 홈 방문자 |
| RISK | 없음 (단일 텍스트 치환, DB/API 불변) |
| SUCCESS | 홈 배너 상단 라벨이 **"큐레이션"** 으로만 표시됨 |
| SCOPE | `CuratedCollectionSection.tsx:172` 한 줄 |

## 1. 요구사항

### 1.1 라벨 텍스트 변경

| 위치 | 이전 | 이후 |
|------|------|------|
| `src/features/playlist/components/CuratedCollectionSection.tsx:172` | `큐레이션 콜렉션` | **`큐레이션`** |

### 1.2 비활성 큐레이션 숨김 — 별도 조치 불필요

- `/api/collections` 는 이미 `.eq('is_active', true)` 필터가 적용되어 있음 (`src/app/api/collections/route.ts:13`)
- 비활성 토글 직후 배너가 유지되는 현상은 **캐시 이슈**로, 사용자 확인상 시간 지나면 반영됨 → 정상 동작
- 즉각 반영이 필요하면 `fetch('/api/collections', { cache: 'no-store' })` 옵션을 고려할 수 있으나 **이번 스코프 아님**

## 2. 파일 목록

| 파일 | 변경 유형 | 내용 |
|------|-----------|------|
| `src/features/playlist/components/CuratedCollectionSection.tsx` | 수정 | 라벨 1줄 텍스트 교체 |

## 3. Success Criteria

1. 홈 첫 화면의 큐레이션 배너에 **"큐레이션"** 만 노출.
2. "큐레이션 콜렉션" 문자열이 프로젝트 내 UI에서 사라짐.
3. 상세 페이지 카운트 라벨("큐레이션 · 플레이리스트 N개")과 자연스럽게 호응.

## 4. Out of Scope

- `/api/collections` 캐시 정책 변경
- `collections` 테이블/컬럼명
- 약관·개인정보처리방침의 "컬렉션" (법적 관행 유지)
- 관리자 패널 내부 컴포넌트 식별자 (`CollectionManager` 등)
