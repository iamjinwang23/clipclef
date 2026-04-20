# Feature Plan: tracklist-title-artist-swap

> 작성일: 2026-04-21 · Phase: Plan · Scope: 관리자 플리 업로드·편집 폼의 TrackEditor 한 곳

## Executive Summary

| 관점 | 내용 |
|------|------|
| Problem | YouTube 플리를 업로드할 때 트랙 제목과 아티스트를 줄줄이 입력하다 보면 두 컬럼을 **뒤바꿔 입력**하는 실수가 잦음. 지금은 행마다 수동으로 두 셀을 옮겨야 해 수십 트랙짜리 플리에서 교정 비용이 큼 |
| Solution | TrackEditor 헤더 우측(기존 "+ 트랙 추가" 왼쪽)에 `제목 ⇄ 아티스트` 버튼 추가. 클릭 한 번으로 **모든 트랙의 title과 artist를 행별로 맞교환**. self-inverse라 재클릭하면 원복 |
| UX Effect | 수십 번의 셀 편집 → 1회 클릭으로 단축. 업로더의 편집 피로·저장 전 검수 시간 모두 절감 |
| Core Value | ClipClef 업로더의 "트랙 입력 친화성" 향상 → 큐레이션 생산 속도 UP |

## Context Anchor

| | |
|--|--|
| WHY | 트랙리스트를 대량 입력할 때 두 컬럼이 뒤바뀌는 실수가 반복적으로 발생, 행 단위 수동 교정은 비용이 큼 |
| WHO | 관리자·업로더 (플리 업로드·편집 폼 사용자). 일반 유저 조회용 TrackList는 해당 없음 |
| RISK | (1) 실수 클릭 시 손실감 — self-inverse라 복구 가능하지만 flash 피드백 필요 (2) null/undefined 혼재 시 저장 validation 위험 → 스왑 시 `''`로 정규화 (3) 다른 필드(start_sec, duration_sec, youtube_video_id, position)는 절대 건드리지 않아야 함 |
| SUCCESS | (1) 버튼 클릭 → 모든 트랙의 title ↔ artist 동시 맞교환 (2) 다른 필드 불변 (3) 재클릭으로 원복 (4) 트랙 0개면 버튼 자동 숨김 (5) 클릭 즉시 시각 피드백(flash) |
| SCOPE | `src/features/admin/components/PlaylistForm.tsx` — TrackEditor 내부만. DB/API 변경 無. 새 파일 無 |

## 1. 요구사항

### 1.1 버튼 스펙

**라벨**: `제목 ⇄ 아티스트` (텍스트 + U+21C4 양방향 화살표 아이콘 또는 SVG 커스텀)

**배치**: 현재 헤더 구조
```
[트랙리스트]                    [+ 트랙 추가]
```
→ 변경 후
```
[트랙리스트]   [제목 ⇄ 아티스트] [+ 트랙 추가]
```
우측 그룹으로 묶어 `flex gap-2` 형태. "+ 트랙 추가"와 동일한 타이포·색상 토큰 재사용 (`text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)]`).

**가시성**: `tracks.length > 0` 일 때만 렌더. 0개면 완전히 숨김(공간도 차지 안 함).

**피드백**: 클릭 즉시 버튼 배경색이 약 200ms 동안 `bg-[var(--muted)]`로 flash 후 원복. CSS transition + `useState` 플래그 방식. 별도 toast 없음.

**접근성**: `type="button"` (폼 submit 방지), `aria-label="제목과 아티스트 값 서로 바꾸기"`.

### 1.2 스왑 로직

```ts
const handleSwap = () => {
  onChange(
    tracks.map((t) => ({
      ...t,
      title: t.artist ?? '',     // 정규화 + 스왑
      artist: t.title ?? '',
    }))
  );
  triggerFlash();
};
```

- `t.artist`가 null이면 `''`로 정규화 후 title 위치로 이동
- `t.title`이 null/undefined여도 `''`로 정규화 후 artist 위치로 이동
- 다른 필드(`position`, `start_sec`, `duration_sec`, `youtube_video_id`)는 스프레드로 그대로 유지
- 새 배열 참조 반환 → React가 재렌더, 각 `<input value={track.title}>`이 스왑된 값으로 업데이트

### 1.3 UX 원칙

- **확인 다이얼로그 없음**: self-inverse 특성상 실수여도 재클릭 복구. 다이얼로그는 반복 작업의 마찰만 키움.
- **즉시 실행**: 디바운스/애니메이션 지연 없이 바로 state 업데이트.
- **Undo history 無**: 별도 이력 스택 불필요 (단순 토글).

## 2. 스코프

| 항목 | 포함 | 제외 |
|------|:---:|:---:|
| `PlaylistForm.tsx` TrackEditor 수정 | ✅ | |
| 버튼 클릭 핸들러 + flash 상태 | ✅ | |
| 일반 유저용 `/playlist/[id]` TrackList | | ✅ (조회 전용) |
| 내 큐레이션 편집 화면 (존재 시) | | ✅ (사용자가 Checkpoint 1에서 제외 선택) |
| DB 스키마·API·마이그레이션 | | ✅ |
| i18n 문자열 (한글 하드코딩 기존 패턴 유지) | | ✅ |
| 저장 시 validation 변경 | | ✅ (스왑 자체가 validation에 영향 주지 않음) |

## 3. 비-기능 / 품질 체크

- **성능**: tracks 배열 length N에 대해 O(N) map. 일반 플리는 10~50 트랙 수준 — 무시 가능.
- **키보드 접근**: 버튼은 기본 `<button>`이라 Tab/Enter 동작.
- **모바일**: 텍스트 + 아이콘 한 줄 폭 ≈ 90~110px — 모바일에서도 "+ 트랙 추가"와 나란히 수용 가능. 그래도 좁아지면 `flex-wrap` 허용.
- **TypeScript**: `TrackRow` 타입의 `title: string`, `artist: string | null` 시그니처 유지. 스왑 결과는 둘 다 `string`이 되므로 `null`이 할당될 위험 無 (정규화 덕분).

## 4. Success Criteria

| # | 기준 | 검증 방법 |
|---|------|-----------|
| SC-1 | TrackEditor 헤더 우측에 `제목 ⇄ 아티스트` 버튼 노출(tracks.length > 0일 때) | DOM 검사 + 시각 확인 |
| SC-2 | 클릭 시 모든 트랙의 title ↔ artist 값이 1회 연산으로 맞교환 | 5개 트랙에 각기 다른 값 입력 후 클릭 → 5행 모두 교환 확인 |
| SC-3 | start_sec, duration_sec, youtube_video_id, position 불변 | 스왑 전·후 값 비교 |
| SC-4 | 재클릭 시 원복 (self-inverse) | 클릭 2회 후 원본과 동일 |
| SC-5 | artist가 null이던 행도 안전하게 스왑 (title=''로) | artist 비운 채 스왑 → title이 ''로 변하고 input 표시도 '' |
| SC-6 | 트랙 0개 상태에선 버튼 비렌더 | tracks 전부 삭제 → 버튼 DOM에서 사라짐 |
| SC-7 | 버튼 클릭 후 ~200ms flash 피드백 | CSS transition 확인 |
| SC-8 | 제출/저장 로직과 간섭 없음 (버튼 type="button") | 폼 내부에서 클릭해도 submit 발생 안 함 |

## 5. 리스크 & 완화

| 리스크 | 영향 | 완화 |
|--------|:---:|------|
| 실수 클릭으로 대량 데이터 뒤섞임 | Low | self-inverse → 재클릭 즉시 복구. flash로 클릭 명시. |
| artist 컬럼을 `string \| null`로 유지하는 DB 저장 로직이 빈 문자열을 허용 안 할 경우 | Low | 정규화 시 빈 문자열만 생성. 저장 단계에서 빈 artist는 기존 처리와 동일(이미 빈 입력 허용). |
| 버튼이 "+ 트랙 추가"와 너무 가까워 오클릭 | Med | `gap-2` 간격 + hover 영역 분리. 필요 시 세로 구분선. |
| 모바일에서 헤더 한 줄에 3요소 배치 시 넘침 | Low | `flex-wrap` 또는 작은 화면에서 텍스트 생략(`제목⇄아티스트` 단축). |

## 6. 의존성 / 선행 작업

- 없음. `PlaylistForm.tsx`는 이미 존재, 단독 컴포넌트 수정.
- 스왑 아이콘: Unicode `⇄`(U+21C4) 또는 기존 `lucide-react` 류가 있으면 `ArrowLeftRight`. **먼저 프로젝트에 설치된 아이콘 라이브러리 확인 후 없으면 Unicode 문자로 대체**.

## 7. Out of Scope (후속 후보)

- 일반 유저용 플리 편집 화면에도 동일 기능 적용
- 선택된 행만 스왑하는 체크박스 모드
- Undo/Redo 히스토리 스택
- 자동 감지 — 입력 내용에 비추어 "이건 뒤바뀐 것 같아요" AI 제안 (추후 LLM 통합)
