'use client';
// Home channel rail — 인기 채널 Top 20 (useChannelStories에서 정렬·슬라이스)
// 각 아이템은 /channel/{id} 전용 페이지로 이동 (필터가 아님)
// ArtistCard 스타일 (80px 원형 + 2줄 텍스트)

import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useChannelStories } from '../hooks/useChannelStories';
import { useAllPlaylists } from '../hooks/useAllPlaylists';

function ChannelItem({
  channelId,
  channelName,
  thumbnailUrl,
  locale,
}: {
  channelId: string;
  channelName: string;
  thumbnailUrl: string | null;
  locale: string;
}) {
  const initial = channelName.charAt(0).toUpperCase();

  return (
    <Link
      href={`/${locale}/channel/${encodeURIComponent(channelId)}`}
      className="flex flex-col items-center gap-2 group flex-shrink-0 w-22"
    >
      <div className="relative w-20 h-20 rounded-full overflow-hidden bg-[var(--muted)] ring-2 ring-transparent group-hover:ring-[var(--accent)] transition-all duration-200">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={channelName}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-[var(--text-secondary)]">
            {initial}
          </div>
        )}
      </div>
      <p className="text-xs font-medium text-center text-[var(--foreground)] line-clamp-2 leading-tight group-hover:text-[var(--accent)] transition-colors">
        {channelName}
      </p>
    </Link>
  );
}

export default function ChannelStoriesBar() {
  const locale = useLocale();
  const { data: allPlaylists } = useAllPlaylists();
  const channels = useChannelStories(allPlaylists);

  if (!channels.length) return null;

  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-6xl mx-auto py-4 px-4">
        <div
          className="flex gap-4 overflow-x-auto scrollbar-hide"
          style={{ scrollSnapType: 'x proximity' }}
        >
          {channels.map((ch) => (
            <ChannelItem
              key={ch.channelId}
              channelId={ch.channelId}
              channelName={ch.channelName}
              thumbnailUrl={ch.thumbnailUrl}
              locale={locale}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
