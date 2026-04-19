'use client';
// Design Ref: home-redesign.design.md §5.5 — 전체 채널 페이지
// 검색 결과의 채널 행 스타일 재사용. 정렬은 useChannelStories 의 인기 점수(제한 없음).

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useAllPlaylists } from '@/features/playlist/hooks/useAllPlaylists';
import { useChannelStories } from '@/features/playlist/hooks/useChannelStories';
import ChannelAvatar from '@/features/playlist/components/ChannelAvatar';

export default function ChannelsPage() {
  const locale = useLocale();
  const { data: allPlaylists, isLoading } = useAllPlaylists();
  // limit=Infinity: 전체 채널 노출 (홈에선 10)
  const channels = useChannelStories(allPlaylists, Number.POSITIVE_INFINITY);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold leading-snug mb-6">채널</h1>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-[var(--subtle)]">불러오는 중…</p>
      ) : channels.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--subtle)]">채널이 없어요</p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {channels.map((c) => (
            <li key={c.channelId}>
              <Link
                href={`/${locale}/channel/${encodeURIComponent(c.channelId)}`}
                className="flex items-center gap-3 py-3 hover:bg-[var(--muted)] rounded-lg px-2 -mx-2 transition-colors"
              >
                <ChannelAvatar channelId={c.channelId} channelName={c.channelName} size={44} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">
                    {c.channelName}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    플레이리스트 {c.playlistCount}개
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
