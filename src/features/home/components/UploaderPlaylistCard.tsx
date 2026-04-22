'use client';

// Design Ref: §5.1 — 팔로우 큐레이터 카드
// PlaylistCard의 일관성을 지키고, 상단에만 ClipClef 업로더 헤더 추가 (Instagram 스타일).
// PlaylistCard 본체(썸네일 + 제목 + YouTube 채널 + 지표)는 그대로 유지.

import Link from 'next/link';
import { useLocale } from 'next-intl';
import type { Playlist } from '@/types';
import UserAvatar from '@/components/ui/UserAvatar';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import PlaylistCard from '@/features/playlist/components/PlaylistCard';

export interface UploaderPlaylistCardProps {
  playlist: Playlist;
  uploader: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

export default function UploaderPlaylistCard({ playlist, uploader }: UploaderPlaylistCardProps) {
  const locale = useLocale();

  return (
    <div className="w-[220px] flex-shrink-0">
      {/* 상단 업로더 헤더 — 프로필로 이동 */}
      <Link
        href={`/${locale}/profile/${uploader.id}`}
        className="flex items-center gap-1.5 mb-2 hover:opacity-80 transition-opacity"
      >
        <UserAvatar src={uploader.avatar_url} name={uploader.display_name} size={20} />
        <span className="text-xs font-semibold truncate">
          {uploader.display_name ?? '익명'}
        </span>
        {uploader.is_verified && <VerifiedBadge size={12} />}
      </Link>

      {/* 카드 본체는 일반 PlaylistCard 그대로 — 일관성 유지 */}
      <PlaylistCard playlist={playlist} />
    </div>
  );
}
