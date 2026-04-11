# Banner Autoplay Design Document

> **Feature**: banner-autoplay
> **Date**: 2026-04-11
> **Architecture**: Option A — Minimal (단일 파일 수정)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 배너 화살표 버튼 제거(전체 클릭 가능) + 자동 슬라이드로 콘텐츠 노출 향상 |
| **WHO** | 홈 방문자 — 수동 조작 없이 큐레이션 컬렉션 자동 탐색 |
| **RISK** | scrollToNext가 activeRealIndex에 의존 → deps 배열 관리 주의 |
| **SUCCESS** | 화살표 제거 확인 + 5초마다 자동 넘김 + 재생/정지 버튼 정상 동작 |
| **SCOPE** | CuratedCollectionSection.tsx 1파일 수정만 |

---

## 1. 변경 사항

### 1.1 제거
- 화살표 `<div>` 블록 (현재 lines 192-203 `/* 화살표 */` 주석 포함)

### 1.2 추가
| 항목 | 상세 |
|------|------|
| `isPlaying` state | `useState(true)` — 기본 재생 |
| `scrollToNext` callback | `activeRealIndex + 1` 카드로 smooth scroll, 루프 처리 |
| autoplay `useEffect` | `isPlaying && n > 0` 조건에서 `setInterval(scrollToNext, 5000)` |
| 재생/정지 버튼 | 도트 인디케이터 우측에 배치, 아이콘: ▶ / ⏸ |

---

## 2. 핵심 로직

```ts
// scrollToNext: 다음 실제 카드로 smooth scroll
const scrollToNext = useCallback(() => {
  const nextReal = (activeRealIndex + 1) % n;
  const nextCard = cardRefs.current[nextReal + 1]; // displayItems offset +1
  const container = scrollRef.current;
  if (nextCard && container) {
    container.scrollTo({
      left: nextCard.offsetLeft - (container.clientWidth - nextCard.offsetWidth) / 2,
      behavior: 'smooth',
    });
  }
}, [activeRealIndex, n]);

// autoplay: activeRealIndex가 바뀔 때마다 타이머 리셋 (5초 후 다음)
useEffect(() => {
  if (!isPlaying || n === 0) return;
  const id = setInterval(scrollToNext, 5000);
  return () => clearInterval(id);
}, [isPlaying, scrollToNext, n]);
```

---

## 3. 재생/정지 버튼 UI

- 위치: `/* 도트 인디케이터 */` 섹션 우측 (flex justify-between)
- 아이콘: SVG ▶ / ⏸ (4×4, white/50)
- hover: text-[var(--foreground)]
- 별도 컨테이너 없음 — 기존 `flex justify-center gap-1.5 mt-4` 를 `flex items-center justify-center gap-1.5 mt-4` 유지 후 버튼을 끝에 추가

---

## 4. 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/features/playlist/components/CuratedCollectionSection.tsx` | 화살표 제거, autoplay 추가, 재생/정지 버튼 추가 |
