# Archive Index — 2026-04

| Feature | Archived | Match Rate | Iterations | Duration |
|---------|:--------:|:----------:|:----------:|:--------:|
| [public-profile-parity](./public-profile-parity/) | 2026-04-20 | 100% | 0 | same-day |
| [tracklist-title-artist-swap](./tracklist-title-artist-swap/) | 2026-04-21 | 100% | 0 | same-day |

## public-profile-parity

검색 경유 공개 프로필(`/profile/[userId]`)을 `/me/profile`과 동일 정보 아키텍처로 정비한 버그 fix.
업로드 플레이리스트 섹션 추가, 헤더에 팔로워/팔로잉 카운트 + UserFollowChip 배치, 라벨을 "플레이리스트" ↔ "큐레이션"으로 분리.

**변경 파일**: `src/app/[locale]/profile/[userId]/page.tsx` (1개) · DB 변경 0 · 신규 파일 0

## tracklist-title-artist-swap

관리자 플리 업로드 폼(TrackEditor)에 제목⇄아티스트 컬럼 일괄 스왑 버튼 추가.
1회 클릭으로 전 행 맞교환, self-inverse(재클릭 원복), null→`''` 정규화, 200ms flash 피드백.
확인 다이얼로그 無 — self-inverse 특성으로 실수 허용.

**변경 파일**: `src/features/admin/components/PlaylistForm.tsx` (1개) · DB 변경 0 · 신규 파일 0 · 신규 의존성 0
