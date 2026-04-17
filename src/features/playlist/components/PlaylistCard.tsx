'use client';
// Design Ref: §5.3 — PlaylistCard: CollectionGrid 디자인 통일
// 썸네일 + 호버 재생 오버레이 + 텍스트 스택 (카드 배경 없음)

import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import type { Playlist } from '@/types';
import ChannelAvatar from './ChannelAvatar';

interface PlaylistCardProps {
  playlist: Playlist;
}

export default function PlaylistCard({ playlist }: PlaylistCardProps) {
  const locale = useLocale();

  return (
    <div className="group relative">
      <Link href={`/${locale}/playlist/${playlist.id}`}>
        {/* 썸네일 */}
        <div className="relative w-full aspect-video rounded-md sm:rounded-xl overflow-hidden bg-[var(--muted)] mb-2">
          <Image
            src={playlist.thumbnail_url}
            alt={playlist.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />

          {/* AI 뱃지 */}
          {playlist.is_ai && (
            <div className="absolute top-2 left-2 bg-violet-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              AI
            </div>
          )}

          {/* 호버 재생 아이콘 오버레이 (데스크톱) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>

          {/* 모바일: 항상 표시되는 작은 재생 버튼 (우하단) */}
          <div className="absolute bottom-2 right-2 sm:hidden w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* 제목 */}
        <p className="text-sm font-medium line-clamp-2 leading-snug">
          {playlist.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <ChannelAvatar channelId={playlist.channel_id} channelName={playlist.channel_name} size={14} />
          <p className="text-xs text-[var(--text-secondary)] truncate">{playlist.channel_name}</p>
        </div>
        {playlist.editor_note && (
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2 italic leading-relaxed">
            "{playlist.editor_note}"
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] mt-1">
          <span className="flex items-center gap-0.5">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            {playlist.like_count.toLocaleString()}
          </span>
          <span className="flex items-center gap-0.5">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M13.5 3a8.5 8.5 0 0 1 0 17H13v.99A1.01 1.01 0 0 1 11.989 22c-2.46-.002-4.952-.823-6.843-2.504C3.238 17.798 2.002 15.275 2 12.009V11.5A8.5 8.5 0 0 1 10.5 3zm-5 7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m7 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3"/></svg>
            {playlist.comment_count.toLocaleString()}
          </span>
        </div>
      </Link>
    </div>
  );
}
