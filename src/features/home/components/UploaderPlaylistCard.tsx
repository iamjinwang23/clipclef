'use client';

// Design Ref: §5.1 — 팔로우 큐레이터 카드
// PlaylistCard와 달리 YouTube 채널 대신 ClipClef 업로더(유저)를 상단에 노출.
// 혼동 방지: YouTube 채널 정보는 카드 내부에 표기하지 않음.

import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import type { Playlist } from '@/types';
import UserAvatar from '@/components/ui/UserAvatar';
import VerifiedBadge from '@/components/ui/VerifiedBadge';

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
    <div className="group w-[220px] flex-shrink-0">
      {/* 상단 업로더 헤더 (Instagram 스타일) */}
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

      {/* 썸네일 + 제목 — 플리 상세로 */}
      <Link href={`/${locale}/playlist/${playlist.id}`} className="block">
        <div className="relative w-full aspect-video rounded-md sm:rounded-xl overflow-hidden bg-[var(--muted)] mb-2 ring-[0.5px] ring-white/20">
          <Image
            src={playlist.thumbnail_url}
            alt={playlist.title}
            fill
            sizes="220px"
            className="object-cover"
          />
          {playlist.is_ai && (
            <div className="absolute top-2 left-2 bg-violet-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              AI
            </div>
          )}
          {/* 호버 재생 오버레이 */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>

        <p className="text-sm font-medium line-clamp-2 leading-snug">
          {playlist.title}
        </p>
      </Link>
    </div>
  );
}
