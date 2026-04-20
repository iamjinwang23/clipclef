# Feature Plan: public-profile-parity

> 작성일: 2026-04-20 · Phase: Plan · Related bug: 검색 → 사용자 프로필의 플리 정보가 /me/profile과 달라 혼란

## Executive Summary

| 관점 | 내용 |
|------|------|
| Problem | `/profile/[userId]` 공개 프로필이 `user_playlists`(큐레이션)를 **"플레이리스트"로 잘못 라벨링**하고, **업로드한 플레이리스트 섹션이 통째로 누락**되어 있으며 팔로워·팔로잉·팔로우 버튼도 없음 → `/me/profile`에서 보이는 나와 검색으로 본 내가 "다른 사람"처럼 느껴짐 |
| Solution | `/profile/[userId]`를 `/me/profile`과 같은 정보 아키텍처(**헤더(팔로우 칩·팔로워/팔로잉) + 플레이리스트 grid + 큐레이션 목록**)로 재구성. 라벨 용어 통일, 업로드 쿼리 조건(`is_active=true`) 일치 |
| UX Effect | 검색·리스트·공개 프로필 어디서 들어와도 동일한 유저 정체성(identity)을 경험 — "이 사람이 올린 플리"와 "이 사람이 모은 큐레이션"이 같은 개념으로 노출 |
| Core Value | ClipClef의 핵심 자산인 **업로더/큐레이터 프로필의 신뢰성**을 회복해 팔로우·유입 전환을 개선 |

## Context Anchor

| | |
|--|--|
| WHY | 공개 프로필이 `user_playlists`만 보여주고 라벨까지 어긋나서, 검색에서 본 유저를 클릭해도 그 사람이 실제로 올린 플리를 확인할 방법이 없음. 내 프로필과 타인 프로필의 구조가 달라 일관성 부재 |
| WHO | ① 검색·리스트에서 유저를 발견한 방문자(팔로우 전환 대상) ② 자신의 프로필을 공유·확인하려는 업로더 ③ 큐레이터의 맥락을 탐색하는 발견자 |
| RISK | (1) `/me/profile` 쿼리/구조를 서버 컴포넌트로 재사용할 때 `user.id` vs `userId` 파라미터 분기 누락 위험 (2) `UserFollowChip`은 `'use client'`인데 `/profile/[userId]`는 서버 컴포넌트 — props 전달 방식 주의 (3) 자신의 프로필을 `/profile/[내아이디]`로 열었을 때 follow 칩이 노출되지 않아야 함 (칩 내부 `currentUserId === userId` 가드 신뢰) |
| SUCCESS | (1) `/profile/[userId]` 헤더에 팔로워/팔로잉 수 + Follow 칩 노출 (2) "플레이리스트 N개" 섹션이 업로드 `playlists`(is_active=true) grid로 표시 (3) "큐레이션 N개" 섹션이 기존 4개 미리보기 grid 유지하되 라벨만 변경 (4) 본인이 자기 프로필을 열면 Follow 칩 자동 숨김 (5) 큐레이션 아이템 클릭 시 `/[locale]/playlist/[id]`로 이동 동작 유지 |
| SCOPE | `src/app/[locale]/profile/[userId]/page.tsx` 재작성, `UserFollowChip` 재사용(이동 아닌 그대로 import), 추가 파일 없음. DB 스키마/마이그레이션 없음 |

## 1. 요구사항

### 1.1 헤더 (`/profile/[userId]`)

**현재**:
```
[아바타 64] displayName ✓
플레이리스트 N개  ← user_playlists 개수
```

**변경 후** (`/me/profile` 헤더와 구조 동일, 단 설정 메뉴는 노출하지 않음):
```
[아바타 64] displayName ✓
팔로워 N · 팔로잉 M                    [팔로우] ← UserFollowChip
```

- 팔로워/팔로잉 카운트: `follows` 테이블 `count(*, head:true)` 2쿼리, `/me/profile`과 동일
- Follow 칩: `UserFollowChip` 재사용. `initialFollowing`은 서버에서 `follows` 체크 후 전달 or `useBatchFollow`와 유사한 단일 쿼리로 해결
  - 자기 자신 프로필 진입 시 `currentUserId === userId`로 내부 가드 발동 → 자동 숨김 (별도 if 불필요)
- `ProfileSettingsMenu`는 노출하지 않음 (내 프로필 전용)

### 1.2 업로드 플레이리스트 섹션 (신규)

`/me/profile` §플레이리스트와 동일 쿼리·동일 grid:

```ts
supabase
  .from('playlists')
  .select('id, title, thumbnail_url, channel_name, track_count')
  .eq('uploaded_by', userId)
  .eq('is_active', true)
  .order('created_at', { ascending: false });
```

- 헤더: `플레이리스트 {playlists.length}개` (uppercase 소제목, `/me/profile`과 동일)
- Grid: `grid-cols-2 sm:grid-cols-3 gap-3`, 각 카드 16:9 썸네일 + title + channel_name
- 빈 상태: `"공개된 플레이리스트가 없어요"` (방문자 시점 문구 — `/me/profile`의 CTA는 제외)

### 1.3 큐레이션 섹션 (기존 로직 유지, 라벨만 변경)

현재 코드에 이미 있는 미리보기 4개 grid는 그대로 두고 **섹션 라벨만 "플레이리스트" → "큐레이션"** 으로 교체:

```
큐레이션 {userPlaylists.length}개    ← uppercase subtitle
  ├─ up.name
  │   └─ [4개 미리보기 grid]   ← grid-cols-2 sm:grid-cols-4
  └─ ...
```

- 쿼리: 기존 `user_playlists` + `user_playlist_items` → `playlists` join 그대로
- 미리보기 아이템 클릭 시 `/[locale]/playlist/[id]` 직행 (현재 동작 유지)
- 큐레이션이 0개면 섹션 자체를 렌더링 안 함 (현재는 "공개된 플레이리스트이 없어요" 문구가 업로드 빈 상태와 혼용되는 오타까지 있음 — §3 참고)

### 1.4 본인 프로필 자기 접근 케이스

`/profile/[내아이디]`로 접속 → `/me/profile`로 리다이렉트하지 **않음**. 공개 프로필을 그대로 렌더링하되 `UserFollowChip`이 내부 가드(`currentUserId === userId`)로 숨김.

## 2. 스코프

| 항목 | 포함 | 제외 |
|------|:---:|:---:|
| `/profile/[userId]/page.tsx` 전면 재작성 | ✅ | |
| `UserFollowChip` 재사용 (import 경로 그대로) | ✅ | |
| `/me/profile` 수정 | | ✅ (구조 참고만) |
| 팔로워/팔로잉 **목록** 페이지 | | ✅ (카운트만) |
| 새 DB 테이블/마이그레이션 | | ✅ |
| i18n 문자열 추가 | | ✅ (한글 하드코딩 기존 패턴 따름) |
| 공개 `user_playlist` 상세 라우트 신설 | | ✅ (아이템이 플레이리스트 상세로 직행) |

## 3. 비-기능 요구 / 품질 체크

- **쿼리 수**: 서버 컴포넌트에서 `Promise.all([profile, uploaded, curations, followerCount, followingCount, isFollowing(optional)])` 로 한 번에 처리. 현재 3쿼리 → 5~6쿼리로 증가하나 모두 `count: head` 또는 인덱스 조회라 비용 무시 가능
- **빈 상태 문구 정리**: 현재 코드에 `"공개된 플레이리스트이 없어요"` 오타(조사 `-이` 중복) + 라벨 오사용이 있음 → 업로드/큐레이션 각각 명확히 분리
- **not-found**: 현재 `if (!profile) notFound();` 유지
- **접근성**: 팔로우 칩은 기존 `UserFollowChip` 접근성(버튼) 그대로

## 4. Success Criteria

| # | 기준 | 검증 방법 |
|---|------|-----------|
| SC-1 | `/profile/[userId]` 헤더에 팔로워/팔로잉 카운트 표시 | DOM에 `팔로워 N` `팔로잉 M` 텍스트 존재 |
| SC-2 | 헤더 우측에 Follow 칩 노출 (타인 접속 시) | `UserFollowChip` 렌더, 로그인 여부에 따라 가드 |
| SC-3 | 본인이 자기 프로필 열면 Follow 칩 숨김 | `currentUserId === userId` 시 칩 null |
| SC-4 | "플레이리스트 N개" 섹션이 `playlists.uploaded_by=userId AND is_active=true` 결과 | 업로드한 플리만, 생성 역순 |
| SC-5 | "큐레이션 N개" 섹션이 기존 `user_playlists` 미리보기 grid 유지 | 라벨만 "큐레이션"으로 변경 |
| SC-6 | 큐레이션 미리보기 아이템 클릭 시 `/{locale}/playlist/{id}` 이동 | 기존 Link 유지 |
| SC-7 | 업로드 플리 0개면 "공개된 플레이리스트가 없어요" 문구, 큐레이션 0개면 해당 섹션 자체 비렌더 | 빈 상태 로직 분리 |
| SC-8 | `/me/profile`과 `/profile/[내아이디]`가 같은 유저 데이터를 일관되게 보여줌 (업로드 플리 개수 일치) | 수동 비교 |

## 5. 리스크 & 완화

| 리스크 | 영향 | 완화 |
|--------|:---:|------|
| Follow 상태 초기값을 서버에서 가져올 때 N+1 회피 | Low | 단일 row 쿼리 1회 (`follows.select().eq(follower_id=me).eq(following_id=userId).maybeSingle()`) — 배열이 아니니 N+1 없음 |
| Self-view 시 follow 칩 플리커 | Low | 칩이 client component라 초기 렌더 시점 한 번 null 리턴 — 플리커 無 |
| `user_playlist_items.playlists` nested select 타입 단언 제거 필요성 | Low | 기존 코드와 동일 패턴 유지 |
| `/me/profile` 또는 `/profile/[userId]` 둘 중 하나만 수정되어 다시 divergence | Med | 이번 수정은 `/profile/[userId]`만 건드리고 `/me/profile` 구조를 ground truth로 채택. 후속: 공통 `ProfilePlaylistsGrid` 컴포넌트 추출은 차후 리팩토링 |

## 6. 의존성 / 선행 작업

- 없음. `UserFollowChip`, `UserAvatar`, `VerifiedBadge`는 이미 존재.
- DB 스키마 변경 없음.

## 7. Out of Scope (후속 후보)

- 팔로워/팔로잉 **목록** 페이지 (`/profile/[userId]/followers`)
- 공개 큐레이션 상세 라우트 (`/profile/[userId]/playlists/[upId]`)
- `/me/profile`과 `/profile/[userId]` 공통 컴포넌트 추출 리팩토링
- 본인 셀프-뷰일 때 "내 프로필 편집하기" CTA
