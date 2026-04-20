# Design: public-profile-parity

> 작성일: 2026-04-20 · Phase: Design · Architecture: **C — Pragmatic** · Plan: `docs/01-plan/features/public-profile-parity.plan.md`

## Context Anchor

| | |
|--|--|
| WHY | 공개 프로필이 `user_playlists`만 보여주고 라벨까지 어긋나서, 검색에서 본 유저를 클릭해도 그 사람이 실제로 올린 플리를 확인할 방법이 없음. 내 프로필과 타인 프로필의 구조가 달라 일관성 부재 |
| WHO | ① 검색·리스트에서 유저를 발견한 방문자(팔로우 전환 대상) ② 자신의 프로필을 공유·확인하려는 업로더 ③ 큐레이터의 맥락을 탐색하는 발견자 |
| RISK | (1) `UserFollowChip`은 client component → 서버에서 `initialFollowing` 값을 전달해야 함 (2) 자기 프로필을 `/profile/[내아이디]`로 열 때 follow 칩 자동 숨김(칩 내부 가드) (3) `user_playlist_items` nested select의 타입 단언 패턴 유지 |
| SUCCESS | 헤더(팔로워/팔로잉/Follow 칩) + "플레이리스트" 업로드 grid + "큐레이션" user_playlists preview grid 3개 섹션 모두 렌더, 본인 셀프-뷰 시 칩 숨김, `/me/profile`과 동일 데이터 정합 |
| SCOPE | `src/app/[locale]/profile/[userId]/page.tsx` 재작성 · (선택) 쿼리 helper 1개 분리 · DB 스키마 변경 無 |

## 1. Overview

Plan Checkpoint 답변 그대로 반영:
- `/me/profile`의 **정보 아키텍처**(팔로워 카운트 + 업로드 plays + 큐레이션)를 공개 프로필에 이식
- 단 설정 메뉴는 제외, 팔로우 칩은 `UserFollowChip` 재사용
- 큐레이션은 현재의 4개 preview grid 스타일 유지, 라벨만 "큐레이션"으로 변경
- 업로드 플리 필터 `is_active=true`, 큐레이션 필터 `is_public=true` (기존 유지)

Selected Architecture: **C — Pragmatic**. `/profile/[userId]/page.tsx` 한 파일만 재작성, `/me/profile`은 손대지 않음. 공용 컴포넌트 추출 리팩토링은 Out-of-Scope(Plan §7).

## 2. 파일 변경 범위

| 파일 | 작업 | LOC 추정 |
|------|:----:|:-------:|
| `src/app/[locale]/profile/[userId]/page.tsx` | **재작성** | ~160 (기존 104 → +56) |
| `src/features/search/components/UserFollowChip.tsx` | 재사용 (수정 無) | — |
| `src/components/ui/UserAvatar.tsx` | 재사용 | — |
| `src/components/ui/VerifiedBadge.tsx` | 재사용 | — |

**신규 파일: 없음**. Helper가 필요하면 같은 파일 안에 내부 async 함수로 둔다(작은 fix에 모듈 쪼개기 지양).

## 3. 컴포넌트 트리

```
ProfilePage (server component)
├─ <div> Header
│   ├─ UserAvatar (size=64)
│   ├─ displayName + VerifiedBadge
│   ├─ 팔로워 N · 팔로잉 M
│   └─ UserFollowChip (client, self-view시 null)
├─ <section> 플레이리스트 (업로드)
│   ├─ SectionTitle "플레이리스트 N개"
│   ├─ (N=0) 빈 상태 텍스트
│   └─ grid-cols-2 sm:grid-cols-3 · Link → /[locale]/playlist/[id]
│       └─ <img> thumbnail · title · channel_name
└─ <section> 큐레이션 (user_playlists, N>0 일 때만)
    ├─ SectionTitle "큐레이션 N개"
    └─ 각 user_playlist
        ├─ up.name (h2)
        └─ grid-cols-2 sm:grid-cols-4 · 최대 4개 preview
            └─ Link → /[locale]/playlist/[p.id] (Image · title · channel_name)
```

## 4. 데이터 흐름 / 쿼리

서버 컴포넌트 진입 시 `Promise.all` 병렬 호출:

```ts
const { data: { user: me } } = await supabase.auth.getUser();

const [
  { data: profile },
  { data: uploadedPlaylists },
  { data: userPlaylists },
  { count: followerCount },
  { count: followingCount },
  isFollowing, // boolean | null
] = await Promise.all([
  // 1) 프로필 기본
  supabase.from('profiles')
    .select('display_name, avatar_url, is_verified')
    .eq('id', userId).single(),

  // 2) 업로드 플레이리스트 — /me/profile과 동일 쿼리
  supabase.from('playlists')
    .select('id, title, thumbnail_url, channel_name, track_count')
    .eq('uploaded_by', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false }),

  // 3) 큐레이션 (user_playlists) — 기존 쿼리 유지
  supabase.from('user_playlists')
    .select('id, name, created_at')
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false }),

  // 4) 팔로워 수
  supabase.from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId),

  // 5) 팔로잉 수
  supabase.from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', userId),

  // 6) 현재 로그인 유저 → userId follow 여부 (비로그인·본인이면 null)
  (me && me.id !== userId)
    ? supabase.from('follows')
        .select('follower_id', { head: false })
        .eq('follower_id', me.id)
        .eq('following_id', userId)
        .maybeSingle()
        .then(({ data }) => !!data)
    : Promise.resolve(null),
]);
```

그 뒤 기존 패턴대로 `user_playlist_items` nested select를 `Promise.all`로 각 user_playlist별 4개 preview 로드 (현 코드 재사용).

### 4.1 Follow chip에 전달하는 값

```tsx
<UserFollowChip
  userId={userId}
  initialFollowing={isFollowing ?? false}
  currentUserId={me?.id ?? null}
/>
```

- `currentUserId === userId` 이거나 `currentUserId === null`이면 chip이 내부에서 `return null` → **본인 셀프-뷰와 비로그인 모두 자동 숨김**.
- `isFollowing`이 `null`이어도 `?? false`로 기본값. 어차피 chip이 숨겨지므로 표시 안 됨.

## 5. 핵심 결정 사항

| # | 결정 | 근거 |
|---|------|------|
| D-1 | `/me/profile`로 리다이렉트하지 않음 | 본인도 공개 프로필 미리보기 용도로 보고 싶을 수 있음. chip만 숨기면 충분. |
| D-2 | Follow 초기 상태를 **서버에서** 한 번에 조회 | 클라이언트에서 useEffect로 재조회 시 깜빡임 + 추가 RTT. `useBatchFollow` 쓰기엔 단일 유저라 과함. |
| D-3 | 업로드 plays 썸네일을 `next/image` 말고 `<img>` 사용 | `/me/profile`이 `<img>` 사용 중(eslint-disable로 명시) → 동일 패턴 유지, 드리프트 방지. 대안: 둘 다 Image로 리팩토링은 별건. |
| D-4 | 큐레이션 빈 상태는 섹션 자체 비렌더 | /me/profile과 동일 동작(`{pubLists.length > 0 && (...)}`) |
| D-5 | `user_playlist_items`는 기존 N+1 패턴 유지 | 평균 user_playlist 개수가 많지 않음. 배치 쿼리 최적화는 별건. |
| D-6 | "플레이리스트가 없어요" 메시지 문구는 `/me/profile`과 거의 동일하게, 단 CTA(Link) 제외 | 방문자에겐 업로드 유도 링크가 무의미 |

## 6. UI 스펙 디테일

### 6.1 헤더 레이아웃

```
┌──────────────────────────────────────────────┐
│ [Avatar]  DisplayName ✓           [팔로우]  │
│           팔로워 123 · 팔로잉 45              │
└──────────────────────────────────────────────┘
```

Tailwind:
```tsx
<div className="flex items-center gap-4 mb-8">
  <UserAvatar src={avatarUrl} name={displayName} size={64} />
  <div className="flex-1 min-w-0">
    <h1 className="text-xl font-semibold flex items-center gap-1.5 truncate">
      {displayName}
      {isVerified && <VerifiedBadge size={18} />}
    </h1>
    <div className="flex gap-4 mt-1 text-xs text-[var(--text-secondary)]">
      <span>팔로워 <strong className="text-[var(--foreground)]">{followerCount ?? 0}</strong></span>
      <span>팔로잉 <strong className="text-[var(--foreground)]">{followingCount ?? 0}</strong></span>
    </div>
  </div>
  <UserFollowChip userId={userId} initialFollowing={isFollowing ?? false} currentUserId={me?.id ?? null} />
</div>
```

`/me/profile` 헤더에서 `ProfileSettingsMenu` → `UserFollowChip`으로 한 군데만 교체된 모습.

### 6.2 업로드 플레이리스트 섹션

`/me/profile` §플레이리스트를 그대로 복제하되 빈 상태 문구만 교체:

```tsx
<section className="mb-10">
  <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">
    플레이리스트 {uploadedPlaylists.length}개
  </h2>
  {uploadedPlaylists.length === 0 ? (
    <div className="py-10 text-center text-sm text-[var(--text-secondary)] border border-dashed border-[var(--border)] rounded-xl">
      공개된 플레이리스트가 없어요
    </div>
  ) : (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {uploadedPlaylists.map((p) => ( /* 카드 동일 */ ))}
    </div>
  )}
</section>
```

### 6.3 큐레이션 섹션

현재 코드 로직 유지, 라벨과 소제목 스타일만 `/me/profile` 톤으로 통일:

```tsx
{playlistsWithItems.length > 0 && (
  <section>
    <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">
      큐레이션 {playlistsWithItems.length}개
    </h2>
    <div className="space-y-6">
      {playlistsWithItems.map((up) => (
        <div key={up.id}>
          <h3 className="font-semibold text-base mb-3">{up.name}</h3>
          {up.items.length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)]">담긴 플레이리스트가 없어요</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {up.items.map((p) => ( /* Link 기존 유지 */ ))}
            </div>
          )}
        </div>
      ))}
    </div>
  </section>
)}
```

## 7. 엣지 케이스

| 케이스 | 동작 |
|--------|------|
| `userId`가 존재하지 않음 | `notFound()` (현재 동작 유지) |
| 업로드 0 + 큐레이션 0 | 헤더만 + "공개된 플레이리스트가 없어요" dashed 박스만. 큐레이션 섹션은 렌더 안 함 |
| 비로그인 방문자 | Follow chip 내부 가드(`!currentUserId`)로 null. 헤더 우측에 공간만 남음 → 레이아웃 이슈 없음(flex-1 min-w-0 덕분) |
| 본인이 `/profile/[자기id]` 접속 | chip null (내부 가드). 나머지 섹션 정상 렌더 — 자기 공개 프로필 프리뷰 |
| `isFollowing` 조회 실패(에러) | chip 내부 default `false`로 시작. 토글 시 optimistic update가 실패하면 revert |
| 큐레이션이 있지만 items 0개(즐겨찾기 비어있는 컬렉션) | 해당 user_playlist는 이름만 표시, "담긴 플레이리스트가 없어요" 문구 (기존 유지) |
| 업로드 플리 썸네일 loading 실패 | `<img>` onError는 별도 처리 안 함 (기존 `/me/profile`과 동일) |

## 8. 테스트 / 검증 계획

수동 QA 시나리오 (Playwright 없음 — 단순 페이지 구조 변경):

| # | 시나리오 | 기대 결과 |
|---|---------|-----------|
| T1 | 검색 → 업로더 유저 클릭 | `/profile/[id]`에 업로드 플리 grid가 `/me/profile`의 그 유저 프로필과 동일 개수로 표시 |
| T2 | 다른 유저 프로필에서 Follow 칩 클릭 | 칩이 "팔로잉"으로 토글되고 새로고침 후 유지 |
| T3 | 자기 자신 프로필(`/profile/[내id]`) 접속 | Follow 칩 숨김, 나머지 섹션 정상 |
| T4 | 비로그인 상태로 프로필 접속 | Follow 칩 숨김, 섹션 정상 |
| T5 | 업로드 플리 0개 유저 | "공개된 플레이리스트가 없어요" 표시, 큐레이션 있으면 큐레이션만 표시 |
| T6 | 큐레이션 미리보기 아이템 클릭 | `/{locale}/playlist/[id]`로 이동 |
| T7 | 없는 userId | 404 |

## 9. 비-목표 / Out-of-Scope

- 공용 컴포넌트 추출(`ProfileHeader`, `UploadedPlaylistsGrid` 등) — Plan §7 후속 후보
- 팔로워/팔로잉 **목록** 페이지
- 공개 큐레이션 상세 라우트
- 본인 셀프-뷰에서 "내 프로필 편집" CTA

## 10. 롤백 전략

단일 파일 변경이라 git revert 한 번이면 원복. DB 변경·새 파일 없음.

## 11. Implementation Guide

### 11.1 구현 순서

1. **Auth + 병렬 쿼리 블록 작성** — `supabase.auth.getUser()` + 6개 쿼리 Promise.all
2. **nested user_playlist_items 로딩** — 기존 코드 그대로 이식 (map + Promise.all)
3. **Header JSX** — `/me/profile` 헤더 복제 → `ProfileSettingsMenu` 자리에 `UserFollowChip` 배치
4. **업로드 섹션 JSX** — `/me/profile` §플레이리스트 복제, 빈 상태 문구만 교체
5. **큐레이션 섹션 JSX** — 기존 로직 보존, `<h2>` 스타일 `/me/profile`에 맞추기 + 라벨 "큐레이션"
6. **Self-view 확인** — `UserFollowChip`의 currentUserId 가드 동작 확인 (코드 추가 불필요)
7. **Lint & typecheck** — `pnpm lint` 통과, `tsc --noEmit` 통과

### 11.2 Key Files

- `src/app/[locale]/profile/[userId]/page.tsx` — 유일한 변경 파일
- 참고: `src/app/[locale]/me/profile/page.tsx` (구조 ground truth)
- 참고: `src/features/search/components/UserFollowChip.tsx` (props 시그니처)

### 11.3 Session Guide

**단일 모듈**: 이 작업은 한 번의 세션으로 완결 가능한 규모 (단일 파일, ~160 LOC, 기존 코드 재사용 많음).

| Module | 내용 | 권장 분할 |
|:------:|------|:--------:|
| module-1 | `/profile/[userId]/page.tsx` 전면 재작성 (헤더·업로드·큐레이션·follow chip) | — (분할 불필요) |

`--scope` 파라미터는 이 feature에선 의미 없음. `/pdca do public-profile-parity`로 한 번에 진행.

## 12. Code Comment Convention

구현 시 다음 앵커 코멘트 추가:

```tsx
// Design Ref: §4 — server-side parallel fetch (profile + uploads + curations + counts + isFollowing)
// Design Ref: §6.1 — header parity with /me/profile (chip swap for settings menu)
// Plan SC-3 — self-view hides follow chip via UserFollowChip internal guard
// Plan SC-4 — uploaded playlists filtered by is_active=true (matches /me/profile)
```
