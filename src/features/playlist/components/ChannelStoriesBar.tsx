'use client';
// 인스타그램 스토리 형식 채널 목록 — 선택 = 그라디언트, 미선택 = 회색

import Image from 'next/image';
import { useChannelStories } from '../hooks/useChannelStories';
import { useAllPlaylists } from '../hooks/useAllPlaylists';
import { useFilterStore } from '@/features/filter/store';

const GRADIENT = 'bg-[#f92524]';
const GRAY = 'bg-[var(--border)]';

function StoryItem({
  name,
  thumbnailUrl,
  label,
  isSelected,
  onClick,
}: {
  name: string;
  thumbnailUrl: string | null;
  label: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 shrink-0"
      style={{ scrollSnapAlign: 'start' }}
    >
      <div className={`rounded-full p-[2px] ${isSelected ? GRADIENT : GRAY}`}>
        <div className="rounded-full bg-[var(--background)] p-[2px]">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={name}
              width={52}
              height={52}
              className="rounded-full object-cover w-[52px] h-[52px]"
            />
          ) : (
            <div className="w-[52px] h-[52px] rounded-full bg-[var(--muted)] flex items-center justify-center text-xs font-semibold text-[var(--foreground)]">
              {initial}
            </div>
          )}
        </div>
      </div>
      <span className="text-xs text-[var(--text-secondary)] max-w-[64px] text-center leading-tight line-clamp-2">
        {label}
      </span>
    </button>
  );
}

export default function ChannelStoriesBar() {
  const { data: allPlaylists } = useAllPlaylists();
  const channels = useChannelStories(allPlaylists);
  const { channelId, setChannelId } = useFilterStore();

  if (!channels.length) return null;

  return (
    <div className="bg-[var(--background)]">
      <div
        className="max-w-6xl mx-auto py-3 flex gap-4 overflow-x-auto scrollbar-hide"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollPaddingLeft: '1rem' }}
      >
        {/* 좌측 여백 스페이서 */}
        <div className="w-4 flex-shrink-0" aria-hidden />
        {/* ALL */}
        <StoryItem
          name="ALL"
          thumbnailUrl={null}
          label="전체"
          isSelected={channelId === null}
          onClick={() => setChannelId(null)}
        />

        {/* 채널 목록 */}
        {channels.map((ch) => (
          <StoryItem
            key={ch.channelId}
            name={ch.channelName}
            thumbnailUrl={ch.thumbnailUrl}
            label={ch.channelName}
            isSelected={channelId === ch.channelId}
            onClick={() => setChannelId(channelId === ch.channelId ? null : ch.channelId)}
          />
        ))}
        {/* 우측 여백 스페이서 */}
        <div className="w-4 flex-shrink-0" aria-hidden />
      </div>
    </div>
  );
}
