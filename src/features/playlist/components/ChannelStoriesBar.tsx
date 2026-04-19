'use client';
// Home channel rail — 인기 채널 Top N (useChannelStories)
// 각 아이템은 /channel/{id} 전용 페이지로 이동

import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useChannelStories } from '../hooks/useChannelStories';
import { useAllPlaylists } from '../hooks/useAllPlaylists';
import ScrollRail from '@/components/ui/ScrollRail';

function ChannelItem({
  channelId,
  channelName,
  thumbnailUrl,
  locale,
  size,
}: {
  channelId: string;
  channelName: string;
  thumbnailUrl: string | null;
  locale: string;
  size: number;
}) {
  const initial = channelName.charAt(0).toUpperCase();

  return (
    <Link
      href={`/${locale}/channel/${encodeURIComponent(channelId)}`}
      className="flex flex-col items-center gap-2 group flex-shrink-0"
      style={{ width: size }}
    >
      <div
        className="relative rounded-full overflow-hidden bg-[var(--muted)] ring-[0.5px] ring-white/20"
        style={{ width: size, height: size }}
      >
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={channelName}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            sizes={`${size}px`}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center font-bold text-[var(--text-secondary)]"
            style={{ fontSize: Math.round(size * 0.3) }}
          >
            {initial}
          </div>
        )}
      </div>
      <p className="text-sm font-medium text-center line-clamp-2 leading-snug group-hover:text-[var(--accent)] transition-colors">
        {channelName}
      </p>
    </Link>
  );
}

interface ChannelStoriesBarProps {
  /** 최대 노출 개수 */
  limit?: number;
  /** 아이템 원형 썸네일 지름 (px). 기본 80. */
  size?: number;
}

export default function ChannelStoriesBar({ limit, size = 80 }: ChannelStoriesBarProps = {}) {
  const locale = useLocale();
  const { data: allPlaylists } = useAllPlaylists();
  const channels = useChannelStories(allPlaylists, limit);

  if (!channels.length) return null;

  return (
    <ScrollRail snap>
      {channels.map((ch) => (
        <ChannelItem
          key={ch.channelId}
          channelId={ch.channelId}
          channelName={ch.channelName}
          thumbnailUrl={ch.thumbnailUrl}
          locale={locale}
          size={size}
        />
      ))}
    </ScrollRail>
  );
}
