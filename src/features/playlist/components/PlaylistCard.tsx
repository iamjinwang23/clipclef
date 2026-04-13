'use client';
// Design Ref: §5.3 — PlaylistCard: 썸네일, 제목, 채널명, 좋아요수

import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { Playlist } from '@/types';
import ChannelAvatar from './ChannelAvatar';

interface PlaylistCardProps {
  playlist: Playlist;
}

export default function PlaylistCard({ playlist }: PlaylistCardProps) {
  const locale = useLocale();
  const t = useTranslations('playlist');

  return (
    <Link
      href={`/${locale}/playlist/${playlist.id}`}
      className="group block bg-[var(--card)] hover:bg-[var(--card-hover)] rounded-xl overflow-hidden transition-colors duration-200"
    >
      {/* 썸네일 */}
      <div className="relative aspect-video bg-[var(--muted)] overflow-hidden">
        <Image
          src={playlist.thumbnail_url}
          alt={playlist.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {/* AI 뱃지 */}
        {playlist.is_ai && (
          <div className="absolute top-2 left-2 bg-violet-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            AI
          </div>
        )}
        {/* 트랙 수 뱃지 */}
        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-1.5 py-0.5 rounded">
          {t('tracks', { count: Math.max(1, playlist.track_count) })}
        </div>
      </div>

      {/* 카드 내용 */}
      <div className="p-4">
        <h3 className="font-semibold text-base leading-snug line-clamp-2 mb-2 text-[var(--foreground)]">
          {playlist.title}
        </h3>
        <div className="flex items-center gap-1.5 mb-2">
          <ChannelAvatar channelId={playlist.channel_id} channelName={playlist.channel_name} size={16} />
          <p className="text-sm text-[var(--text-secondary)] truncate">{playlist.channel_name}</p>
        </div>

        {/* 에디터 노트 */}
        {playlist.editor_note && (
          <p className="text-sm text-[var(--text-secondary)] italic line-clamp-2 mb-2 leading-relaxed">
            "{playlist.editor_note}"
          </p>
        )}

        {/* 태그 */}
        {!playlist.editor_note && (playlist.genre.length > 0 || playlist.mood.length > 0) && (
          <div className="flex flex-wrap gap-1 mb-2">
            {[...playlist.genre, ...playlist.mood].slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-sm px-2 py-0.5 bg-[var(--muted)] text-[var(--text-secondary)] rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 좋아요 수 + 댓글 수 */}
        <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
          <span className="flex items-center gap-1">
            <span>♥</span>
            <span>{playlist.like_count.toLocaleString()}</span>
          </span>
          <span className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.5 3a8.5 8.5 0 0 1 0 17H13v.99A1.01 1.01 0 0 1 11.989 22c-2.46-.002-4.952-.823-6.843-2.504C3.238 17.798 2.002 15.275 2 12.009V11.5A8.5 8.5 0 0 1 10.5 3zm-5 7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m7 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3" />
            </svg>
            <span>{playlist.comment_count.toLocaleString()}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
