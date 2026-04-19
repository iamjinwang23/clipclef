# Feature Plan: home-channel-rail

## Executive Summary

| 관점 | 내용 |
|------|------|
| Problem | 홈의 채널 바가 '필터' 용도로만 쓰여 채널 탐색의 재미가 없고, '전체 채널' 같은 불필요한 컨트롤이 있으며 정렬이 최신순이라 인기 있는 큐레이터가 묻힘 |
| Solution | 채널 바를 **인기 채널 위젯**으로 전환 — 신규+좋아요+조회수+댓글 로그 정규화 점수로 Top 20 정렬, 탭 시 `/channel/{id}` 상세로 이동 |
| UX Effect | 채널 중심 탐색 동선이 열림 — 메인에서 인기 큐레이터를 한눈에 보고 바로 그 채널 아카이브로 진입 |
| Core Value | "알고리즘 없는 큐레이션"의 실체는 사람(채널)임 — 메인 1-뎁스에서 사람을 보여주는 UX |

## Context Anchor

| | |
|--|--|
| WHY | 채널 바가 필터에만 묶여 있어 채널 디스커버리에 기여를 못함. 홈 필터는 FilterBar 만으로 충분 |
| WHO | 주 1회 이상 들어오는 재방문 사용자 — 새 큐레이터 발견이 리텐션에 직결 |
| RISK | 기존 `channelId` 필터 의존 코드(PlaylistGrid 쿼리, filterStore) 잔존. 로직 제거 시 홈 그리드가 항상 전체 조회로 복귀해야 함. `hasActiveFilters` 에 channelId 포함돼 있어 초기화 로직 점검 필요 |
| SUCCESS | 메인 접속 시 Top 20 채널이 인기순 스트립으로 보이고, 탭 시 `/channel/{id}` 로 네비게이션. 홈 그리드는 채널 필터 없이 전체 노출 |
| SCOPE | `useChannelStories` 훅, `ChannelStoriesBar` 컴포넌트, (홈 페이지 filterStore.channelId 의존 확인) |

## 1. 요구사항

### 1.1 정렬 — 로그 정규화 인기 점수

채널별 집계 후 다음 공식으로 점수 산정:

```
likes  = sum(playlist.like_count)  across channel's active playlists
views  = sum(playlist.view_count)
comms  = sum(playlist.comment_count)
new30  = count of playlists with created_at >= now - 30 days

score  = log(1 + likes)           × 1.0     // W_LIKE
       + log(1 + views / 1000)    × 0.8     // W_VIEW  (views는 1000분의 1로 스케일)
       + log(1 + comms)           × 2.0     // W_COMMENT (댓글은 희소 + 강한 참여)
       + new30                    × 1.5     // W_NEW (단위 자체가 작음)
```

가중치 근거:
- 로그 적용으로 3개 지표가 비슷한 스케일로 수렴
- 댓글은 상대적으로 희소하므로 가장 높은 가중(×2.0)
- 조회수는 쉽게 부풀려지는 경향 → 로그 + 추가 스케일(÷1000) + 낮은 가중
- 신규는 로그 없이 선형 — 최근 활동에 직접 보상

### 1.2 노출 — Top 20

정렬 후 상위 20개만 렌더. 나머지는 수평 스크롤 없이 컷.

### 1.3 크기·레이아웃 — 플리 상세 `ArtistStrip` 과 동일

- 원형 썸네일 80px
- 아래 텍스트: `text-xs font-medium text-[var(--foreground)] line-clamp-2 leading-tight`
- 호버 시 `ring-2 ring-[var(--accent)]`
- 아이템 너비 `w-20` (또는 w-22)
- 컨테이너 `flex gap-4 overflow-x-auto scrollbar-hide`

### 1.4 "전체 채널" 제거

현재 `AllItem` 컴포넌트와 좌측 고정 레이아웃을 삭제. 단순 수평 스크롤로.

### 1.5 탭 동작

각 채널 아이템은 `<Link href="/{locale}/channel/{channel_id}">`. filterStore.setChannelId 호출하지 않음.

### 1.6 홈 그리드 — 채널 필터 제거

현재 `filterStore.channelId` 상태가 `usePlaylists` 쿼리에 영향을 준다면, 채널 바가 이를 세팅하지 않으므로 자연스럽게 전체 노출. 단 이미 설정된 값이 남아 있지 않도록 초기화 또는 관련 UI(활성 표시, 리셋 버튼) 제거 점검.

## 2. 파일 목록

| 파일 | 변경 유형 | 내용 |
|------|-----------|------|
| `src/features/playlist/hooks/useChannelStories.ts` | 수정 | `popularity score` 계산 + 정렬 + Top 20 slice. `isNew` 속성은 점수 계산 후 제거 가능 |
| `src/features/playlist/components/ChannelStoriesBar.tsx` | 수정 | AllItem 제거, 선택/필터 로직 제거, Link 도입, 80px 원형+텍스트(ArtistStrip 스타일) |
| `src/features/filter/store.ts` | 확인 | `setChannelId` API는 유지(다른 곳에서 사용 가능) — 홈 초기 렌더에 `channelId: null` 로 리셋되는지 확인 |
| `src/app/[locale]/page.tsx` | 확인 | ChannelStoriesBar 그대로 렌더 — 로직 변경 없이 UI만 바뀜 |

## 3. Success Criteria

1. 홈 접속 시 채널 바에 Top 20 채널이 **인기 점수 내림차순**으로 정렬되어 노출됨.
2. 각 아이템은 80px 원형 썸네일 + 2줄 클램프 텍스트 (ArtistStrip과 동일 스타일).
3. 아이템 탭 시 `/{locale}/channel/{channel_id}` 로 이동.
4. "전체 채널" 아이템이 화면에 없음.
5. 채널 바 탭이 홈 그리드의 플리 목록에 **영향을 주지 않음** — 항상 전체(활성) 플리 노출.
6. 점수 계산은 `likes/views/comments` 집계 + `new30` 보너스에 로그 정규화 적용.
7. 데이터가 없는 경우(0개 채널)엔 바 자체 숨김.

## 4. Non-Goals (Out of Scope)

- 점수의 어드민 튜닝 UI (가중치는 상수로 시작)
- 실시간(Realtime) 업데이트 — 쿼리 캐시(staleTime) 범위 내 정적
- 채널 상세 페이지 자체 변경 — 이번 스코프 아님
- FilterBar 내부 변경 — 이번 스코프 아님

## 5. Risks & Mitigations

| 위험 | 완화 |
|------|------|
| `filterStore.channelId` 가 이전 세션 잔류 | 홈 첫 렌더 시 `setChannelId(null)` 강제, 또는 쿼리에서 channelId 제거 |
| 데이터 많아질 때 클라이언트 계산 부하 | Top 20만 남기는 slice로 관리. 추후 필요시 RPC로 이관 |
| 점수 왜곡 (단일 플리가 대박나서 채널 전체 점수 지배) | 로그 정규화로 어느 정도 완화. 필요 시 `+ log(active_playlist_count)` 가중 추가 |
| YouTube 썸네일 API 호출 실패 | 이미 initial letter 폴백 구현됨 |

## 6. Implementation Plan

1. `useChannelStories.ts`
   - `deriveChannels` 확장: 채널별 likes/views/comments/new30 집계
   - `score` 계산 후 내림차순 정렬
   - `.slice(0, 20)` 적용
2. `ChannelStoriesBar.tsx`
   - `AllItem` + `channelId/setChannelId` 의존 제거
   - 각 아이템을 `<Link>` 로 전환
   - 크기·스타일 ArtistCard에 맞춤 (80px)
   - 좌측 그라데이션·선택 상태·ALL 여백 제거
3. 점검
   - 홈 첫 렌더 시 `filterStore.channelId` 가 null 이어야 함 — 만약 SessionStorage 잔류가 있다면 홈 mount 시 reset
   - `usePlaylists` 가 channelId를 읽고 있다면 동작 확인
4. `tsc --noEmit` + 홈 실환경 확인

## 7. Open Questions

- 가중치 튜닝: 실제 데이터 보고 조정 필요할 수 있음. 우선 상기 값으로 시작.
- 썸네일이 없는 채널 처리: 이미 initial 폴백 있음. 유지.
