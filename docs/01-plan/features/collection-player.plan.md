# Plan: collection-player

> Feature: collection-player
> Phase: Plan
> Date: 2026-04-12
> Status: active

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 큐레이션 상세 페이지에서 플리를 감상하려면 개별 플리 상세 페이지로 이동해야 함. 큐레이션 맥락(편집 의도, 플리 흐름)을 유지하면서 연속 재생 불가. |
| **Solution** | 큐레이션 상세 페이지에 Spotify 스타일 하단 플레이어 바 추가. 플리 카드 재생 버튼 → 하단 바에서 전체 재생, 이전/다음 플리 이동, 트랙리스트 확인 가능. |
| **Function UX Effect** | 페이지를 떠나지 않고 큐레이션 전체를 순서대로 감상. 트랙리스트 🔼 로 현재 재생 중인 플리의 트랙 확인 및 이동 가능. |
| **Core Value** | 큐레이터의 선곡 의도를 흐름대로 경험 — "앨범 단위로 듣는" 큐레이션 감상 방식 제공. |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 큐레이션은 플리들의 편집된 흐름. 개별 이동 없이 연속 재생해야 그 의도가 살아남. |
| **WHO** | 큐레이션을 "앨범처럼" 처음부터 끝까지 듣고 싶은 사용자 |
| **RISK** | YouTube IFrame은 페이지에 존재해야 함 (ToS). 하단 바 높이만큼 콘텐츠 가리지 않도록 padding 필요. |
| **SUCCESS** | 재생 버튼 → 하단 바 등장 / 이전·다음 플리 이동 / 트랙리스트 슬라이드업 / X 종료 |
| **SCOPE** | 큐레이션 상세 페이지(`/collection/[id]`)에만 적용. 크로스 페이지 없음. |

---

## 1. 요구사항

### 1.1 기능 요구사항

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| FR-01 | 플리 카드 우측에 재생 버튼 표시 (Spotify 스타일, 호버/탭 시 등장) | P0 |
| FR-02 | 재생 버튼 클릭 → 하단 플레이어 바 등장, 해당 플리부터 재생 시작 | P0 |
| FR-03 | 하단 바 구성: [썸네일] [제목·채널] [◀◀] [▶/⏸] [▶▶] [🔼] [✕] | P0 |
| FR-04 | ◀◀ = 이전 플리로 이동 (첫 번째일 때 비활성) | P0 |
| FR-05 | ▶▶ = 다음 플리로 이동 (마지막일 때 비활성) | P0 |
| FR-06 | 현재 재생 중인 플리 카드 강조 표시 (테두리 또는 playing 인디케이터) | P0 |
| FR-07 | 🔼 버튼 클릭 → 트랙리스트 패널 슬라이드업 | P1 |
| FR-08 | 트랙리스트 패널: 현재 플리의 트랙 목록 + 클릭 시 해당 타임스탬프로 seek | P1 |
| FR-09 | ✕ 버튼 → 하단 바 종료, YouTube 재생 중단 | P0 |
| FR-10 | 하단 바 표시 중 페이지 하단 콘텐츠에 padding-bottom 추가 (겹침 방지) | P0 |

### 1.2 비기능 요구사항

| ID | 요구사항 |
|----|---------|
| NFR-01 | 큐레이션 상세 페이지(`/collection/[id]`) 내에서만 동작 |
| NFR-02 | YouTube IFrame은 페이지에 존재해야 함 (ToS) — 하단 바 또는 숨겨진 div |
| NFR-03 | 모바일 대응 (하단 바 높이 64px, 트랙리스트 패널 최대 화면 60%) |

---

## 2. UI 스펙

### 2.1 플리 카드 재생 버튼

```
[기본 상태]          [호버/탭]
┌──────────┐        ┌──────────┐
│ [썸네일] │        │ [썸네일] │
│          │  →     │    ▶     │  ← 중앙 오버레이
└──────────┘        └──────────┘
제목                 제목      ▶  ← 제목 우측 작은 버튼
```

### 2.2 하단 플레이어 바

```
┌─────────────────────────────────────────────────────────────┐
│ [썸네일 48x48] [제목 (truncate) / 채널명]   ◀◀  ▶  ▶▶  🔼  ✕ │
└─────────────────────────────────────────────────────────────┘
  position: fixed, bottom: 0, left: 0, right: 0
  height: 64px, bg: var(--card), border-top: var(--border)
  z-index: 40
```

### 2.3 트랙리스트 패널 (슬라이드업)

```
🔼 클릭 시:
┌─────────────────────────────────────────────────────────────┐
│ 트랙리스트                                              🔽   │  ← 헤더
├─────────────────────────────────────────────────────────────┤
│  1  트랙 제목 1          아티스트          0:00             │
│  2  트랙 제목 2          아티스트          1:23             │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
  position: fixed, bottom: 64px (하단 바 위)
  max-height: 60vh, overflow-y: auto
  slide-up animation: translateY(100%) → translateY(0)
```

---

## 3. 상태 관리

### 3.1 컴포넌트 상태 (useState, 페이지 레벨)

```ts
// CollectionPlayerState
currentIndex: number | null  // 현재 재생 중인 플리 인덱스 (null = 비재생)
isPlaying: boolean           // play/pause
isTracklistOpen: boolean     // 트랙리스트 패널 열림 여부
```

> Zustand 불필요 — 큐레이션 상세 페이지 내 상태이므로 useState로 충분

### 3.2 트랙 데이터 로딩

```ts
// 현재 재생 중인 플리의 트랙 데이터 필요
// collection API에서 tracks까지 join하거나, 별도 fetch
// 옵션 A: collection 조회 시 tracks까지 함께 fetch (간단, 데이터 큼)
// 옵션 B: 재생 시작 시 해당 플리 트랙만 별도 fetch (지연 로딩)
// → 옵션 B 권장 (큐레이션 플리 수가 많을 수 있음)
```

---

## 4. 파일 구조

### 신규 파일

| 파일 | 역할 |
|------|------|
| `src/features/collection/components/CollectionPlayer.tsx` | 하단 플레이어 바 + 트랙리스트 패널 + YouTube IFrame |
| `src/features/collection/hooks/useCollectionPlayer.ts` | 플레이어 상태 + YouTube API 제어 |

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/app/[locale]/collection/[id]/page.tsx` | Client Component로 전환, CollectionPlayer 통합, 카드 재생 버튼 추가 |

> **주의**: 현재 `page.tsx`는 Server Component. CollectionPlayer(Client)를 통합하려면 페이지를 Client Component로 전환하거나, 서버/클라이언트 영역 분리 필요.

---

## 5. 성공 기준

| ID | 기준 |
|----|------|
| SC-01 | 플리 카드 재생 버튼 클릭 → 하단 바 등장 + YouTube 재생 시작 |
| SC-02 | ▶▶ 클릭 → 다음 플리로 교체 재생 |
| SC-03 | ◀◀ 클릭 → 이전 플리로 교체 재생 |
| SC-04 | 🔼 클릭 → 트랙리스트 패널 슬라이드업 |
| SC-05 | 트랙 클릭 → 해당 타임스탬프로 seek |
| SC-06 | ✕ 클릭 → 바 사라짐, 재생 중단 |
| SC-07 | 현재 재생 중인 카드 강조 표시 |

---

## 6. 리스크

| 리스크 | 대응 |
|--------|------|
| page.tsx Server→Client 전환 시 성능 저하 | 데이터 fetch는 서버에서, 플레이어 UI만 Client로 분리 |
| 트랙 데이터가 없는 플리 | 🔼 버튼 비활성화 또는 "트랙 없음" 표시 |
| YouTube IFrame ToS | 하단 바 내 1px hidden div 대신, 투명 오버레이 처리 |
| 모바일 하단 Safe Area | `padding-bottom: env(safe-area-inset-bottom)` 적용 |
