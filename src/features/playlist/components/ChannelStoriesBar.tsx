'use client';
// Home channel rail — useHomeFeed 로 집계 결과를 받고, 썸네일만 useChannelThumbnails 로 비동기 보강.

import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useHomeFeed } from '@/features/home/hooks/useHomeFeed';
import { useChannelThumbnails } from '@/features/playlist/hooks/useChannelThumbnails';
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

export default function ChannelStoriesBar({ limit = 10, size = 80 }: ChannelStoriesBarProps = {}) {
  const locale = useLocale();
  const { data } = useHomeFeed({ channels: limit });
  const channels = data?.channels ?? [];
  const { data: thumbnails } = useChannelThumbnails(channels.map((c) => c.channel_id));

  if (!channels.length) return null;

  return (
    <ScrollRail snap>
      {channels.map((ch) => (
        <ChannelItem
          key={ch.channel_id}
          channelId={ch.channel_id}
          channelName={ch.channel_name}
          thumbnailUrl={thumbnails?.[ch.channel_id] ?? null}
          locale={locale}
          size={size}
        />
      ))}
    </ScrollRail>
  );
}
