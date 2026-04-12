# Design: collection-player

> Feature: collection-player
> Architecture: Option C — Pragmatic Balance
> Date: 2026-04-12
> Status: active

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 큐레이션을 "앨범처럼" 흐름대로 감상 — 페이지 이동 없이 연속 재생 |
| **WHO** | 큐레이터의 선곡 의도를 순서대로 경험하고 싶은 사용자 |
| **RISK** | page.tsx Server→Client 분리 필요. YouTube IFrame ToS 준수. |
| **SUCCESS** | 재생 버튼 → 하단 바 / 이전·다음 / 트랙리스트 슬라이드업 / X 종료 |
| **SCOPE** | `/collection/[id]` 페이지 전용. Zustand 불필요. |

---

## 1. 컴포넌트 구조

```
page.tsx (Server Component)
├── 배너 이미지 (server rendered)
├── 타이틀 / 설명 (server rendered)
└── CollectionPageClient (Client Component)   ← 상태 소유자
    ├── CollectionGrid                          ← 카드 목록 + 재생 버튼
    └── CollectionPlayer                        ← 하단 바 + 트랙리스트 + IFrame
```

### 1.1 상태 흐름

```
CollectionPageClient (useState)
  currentIndex: number | null     → CollectionGrid(강조), CollectionPlayer(제목/썸네일)
  isPlaying: boolean              → CollectionPlayer(▶/⏸)
  isTracklistOpen: boolean        → CollectionPlayer(패널 열림)
  tracks: Track[]                 → CollectionPlayer(트랙리스트)
  tracksLoading: boolean          → CollectionPlayer(로딩 표시)

  onPlay(index) → currentIndex 설정, tracks fetch, YouTube loadVideoById
  onPrev()      → currentIndex--
  onNext()      → currentIndex++
  onStop()      → currentIndex=null, isPlaying=false
  onToggleTracklist() → isTracklistOpen 토글
  onSeek(sec)   → YouTube seekTo(sec)
```

---

## 2. 파일 구조

```
src/
├── app/[locale]/collection/[id]/
│   └── page.tsx                              수정 (CollectionPageClient 삽입)
└── features/collection/
    └── components/
        ├── CollectionPageClient.tsx           신규 (상태 소유자, Client)
        ├── CollectionGrid.tsx                 신규 (카드 그리드 + 재생 버튼)
        └── CollectionPlayer.tsx              신규 (하단 바 + 트랙리스트 + IFrame)
```

---

## 3. 각 컴포넌트 상세

### 3.1 page.tsx (수정)

```tsx
// Design Ref: §1 — 서버에서 데이터 fetch, CollectionPageClient에 전달
// 변경:
//   1. 카드 그리드 → <CollectionPageClient playlists={...} />
//   2. 배너/타이틀은 그대로 서버 렌더

export default async function CollectionDetailPage({ params }) {
  const collection = await getCollection(id);
  
  return (
    <div>
      {/* 배너, 타이틀 — 서버 렌더 유지 */}
      <CollectionPageClient playlists={collection.items} />
    </div>
  );
}
```

### 3.2 CollectionPageClient.tsx

```tsx
'use client';
// Design Ref: §3.2 — 상태 소유자. CollectionGrid + CollectionPlayer 조율

interface Props {
  playlists: Playlist[];
}

// 내부 상태:
//   currentIndex, isPlaying, isTracklistOpen, tracks, tracksLoading
// YouTube player ref (useRef): seekTo, loadVideoById, stopVideo

// onPlay(index):
//   1. currentIndex 업데이트
//   2. isPlaying = true
//   3. tracks fetch (GET /api/playlists/[id]/tracks 또는 기존 tracks 재사용)
//   4. player.loadVideoById(playlists[index].youtube_id)

// onPrev/onNext: index 변경 + loadVideoById

// player ref는 CollectionPlayer에서 registerPlayer(ref) 콜백으로 주입
```

### 3.3 CollectionGrid.tsx

```tsx
'use client';
// Design Ref: §3.3 — 플리 카드 그리드 + 재생 버튼

interface Props {
  playlists: Playlist[];
  currentIndex: number | null;
  locale: string;
  onPlay: (index: number) => void;
}

// 카드 레이아웃:
//   - 기존 Link 감싸기 유지 (클릭 → 상세 이동)
//   - 썸네일 우하단 또는 카드 hover 시 재생 버튼 오버레이
//   - currentIndex === index ? 테두리 강조(border-2 border-[var(--accent)])
//   - 재생 버튼: e.preventDefault() → onPlay(index) (Link 이동 차단)

// 재생 버튼 스타일:
//   - 썸네일 위 오버레이: opacity-0 group-hover:opacity-100 transition
//   - 원형 버튼 w-10 h-10, bg-white/20 backdrop-blur
//   - 모바일: 항상 표시 (hover 불가)
```

### 3.4 CollectionPlayer.tsx

```tsx
'use client';
// Design Ref: §3.4 — 하단 고정 플레이어 바 + 트랙리스트 패널 + YouTube IFrame

interface Props {
  playlists: Playlist[];
  currentIndex: number | null;
  isPlaying: boolean;
  isTracklistOpen: boolean;
  tracks: Track[];
  tracksLoading: boolean;
  onPlay: () => void;      // play/pause 토글
  onPrev: () => void;
  onNext: () => void;
  onStop: () => void;
  onToggleTracklist: () => void;
  onSeek: (sec: number) => void;
  registerPlayer: (ref: any) => void;  // YouTube player ref 주입
}

// YouTube IFrame:
//   - containerRef로 YT.Player 초기화
//   - position: absolute, width: 1px, height: 1px, opacity: 0 (ToS: 존재하되 최소화)
//   - 실제로는 하단 바 내에 숨겨진 div로 존재

// 하단 바 (currentIndex !== null 일 때만 표시):
//   position: fixed, bottom: 0, left: 0, right: 0, height: 64px
//   z-index: 40, bg: var(--card), border-top: 1px solid var(--border)
//   padding-bottom: env(safe-area-inset-bottom)

// 트랙리스트 패널:
//   position: fixed, bottom: 64px, left: 0, right: 0, max-height: 60vh
//   z-index: 40, bg: var(--card), border-top: var(--border)
//   transform: translateY(100%) → translateY(0) transition 300ms ease
//   isTracklistOpen으로 제어
```

---

## 4. API

### 4.1 트랙 조회 (기존 활용)

```
트랙 데이터 조회 방법:
  기존: supabase.from('tracks').select('*').eq('playlist_id', id).order('position')
  → CollectionPageClient 내에서 직접 supabase-js client로 조회
  → 재생 시작 시(onPlay) fetch, 이전/다음 이동 시도 fetch

  대안: page.tsx에서 모든 트랙 미리 fetch
  → 큐레이션 플리가 10개+ 일 때 초기 로딩 부담
  → X. 지연 로딩 방식 채택
```

### 4.2 Supabase Client-side 조회

```ts
// CollectionPageClient 내부
import { createBrowserClient } from '@supabase/ssr';

const fetchTracks = async (playlistId: string): Promise<Track[]> => {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase
    .from('tracks')
    .select('*')
    .eq('playlist_id', playlistId)
    .order('position');
  return data ?? [];
};
```

---

## 5. UI 상세

### 5.1 하단 바 레이아웃

```
┌────────────────────────────────────────────────────────────────┐
│  [썸48x48] [제목 line-clamp-1 / 채널명 text-xs]  [◀◀][▶][▶▶][🔼][✕]  │
└────────────────────────────────────────────────────────────────┘

모바일 (< 375px):
  제목만, 채널명 숨김
  버튼 간격 축소

◀◀ / ▶▶ 비활성:
  opacity-30, pointer-events-none
  (첫 번째: ◀◀ 비활성 / 마지막: ▶▶ 비활성)
```

### 5.2 트랙리스트 패널

```
┌────────────────────────────────────────────────────────────────┐
│ 트랙리스트 · {플리 제목}                              [🔽 닫기] │
├────────────────────────────────────────────────────────────────┤
│  ▶  1  트랙 제목                     아티스트    0:00         │  ← 재생 중 강조
│     2  트랙 제목                     아티스트    1:23         │
│     3  ...                                                    │
└────────────────────────────────────────────────────────────────┘
  max-height: 60vh, overflow-y: auto, scrollbar-hide
  트랙 클릭 → onSeek(track.start_sec)
```

### 5.3 재생 중인 카드 강조

```
[재생 중인 카드]
┌──────────────────┐
│    [썸네일]       │  ← ring-2 ring-[var(--accent)] rounded-2xl
│  ▶ 재생 중       │  ← 좌하단 뱃지 (text-xs, bg-black/60, text-white)
└──────────────────┘
제목                   ← text-[var(--accent)] (강조)
```

---

## 6. YouTube IFrame 처리

```
// ToS 준수: IFrame은 페이지에 존재해야 하며 사용자가 볼 수 있어야 함
// 하단 바 내에 1x1px으로 존재 (실질적으로 숨겨진 상태)
// 이는 백그라운드 재생(오디오)이 아닌, 영상이 하단 바 내에 있는 구조
// 사용자가 원하면 YouTube 링크로 풀스크린 시청 가능

<div style={{ width: 1, height: 1, overflow: 'hidden', position: 'absolute' }}>
  <div ref={iframeContainerRef} />
</div>
```

---

## 7. 페이지 레이아웃 조정

```css
/* 하단 바 표시 중 콘텐츠 가리지 않도록 */
/* CollectionPageClient: isPlaying 시 pb-20 추가 */
<div className={currentIndex !== null ? 'pb-20' : ''}>
  <CollectionGrid ... />
</div>
```

---

## 8. 테스트 시나리오

| 시나리오 | 기대 결과 |
|---------|---------|
| 카드 재생 버튼 클릭 | 하단 바 등장, YouTube 재생 시작, 카드 강조 |
| ▶▶ 클릭 | 다음 플리 재생, 하단 바 제목/썸네일 교체 |
| ◀◀ 클릭 | 이전 플리 재생 |
| 첫 번째 플리 재생 중 ◀◀ | 버튼 비활성 |
| 🔼 클릭 | 트랙리스트 패널 슬라이드업, 현재 플리 트랙 표시 |
| 트랙 클릭 | 해당 타임스탬프로 seek |
| 🔽 클릭 | 패널 닫힘 |
| ✕ 클릭 | 하단 바 사라짐, 재생 중단, 카드 강조 해제 |

---

## 9. 구현 순서

### Module Map

| 모듈 | 파일 | 의존성 |
|------|------|--------|
| M1 | `CollectionPlayer.tsx` | 없음 (YouTube API) |
| M2 | `CollectionGrid.tsx` | 없음 |
| M3 | `CollectionPageClient.tsx` | M1, M2 |
| M4 | `page.tsx` 수정 | M3 |

### 11. Implementation Guide

#### 11.1 구현 순서
1. **M1** `CollectionPlayer.tsx` — YouTube IFrame + 하단 바 UI + 트랙리스트 패널
2. **M2** `CollectionGrid.tsx` — 카드 그리드 + 재생 버튼 + 강조 표시
3. **M3** `CollectionPageClient.tsx` — 상태 관리 + M1/M2 조합 + tracks fetch
4. **M4** `page.tsx` — 배너/타이틀 서버 렌더 유지, CollectionPageClient 삽입

#### 11.2 핵심 검증 포인트
- YouTube player ref가 CollectionPageClient까지 정상 전달되는지
- 이전/다음 이동 시 `loadVideoById` 정상 작동
- 트랙리스트 패널 슬라이드 애니메이션
- 모바일 safe-area 하단 여백

#### 11.3 Session Guide

| 세션 | 스코프 | 내용 |
|------|--------|------|
| Session 1 (전체) | M1~M4 | 1세션 구현 가능 (크로스 페이지 없음, 단순 구조) |
