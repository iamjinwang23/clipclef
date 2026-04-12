'use client';
// 인스타그램 스토리 형식 채널 목록 — 선택 = 그라디언트, 미선택 = 회색
// ALL: 좌측 고정 / 나머지: 수평 스와이프 / ALL 우측 그라데이션 처리

import Image from 'next/image';
import { useChannelStories } from '../hooks/useChannelStories';
import { useAllPlaylists } from '../hooks/useAllPlaylists';
import { useFilterStore } from '@/features/filter/store';

const GRADIENT = 'bg-[#f92524]';
const GRAY = 'bg-[var(--border)]';

// ALL 전용 아이템 — SVG 슬롯 포함
function AllItem({ isSelected, onClick }: { isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 shrink-0"
    >
      <div className={`rounded-full p-[2px] ${isSelected ? GRADIENT : GRAY}`}>
        <div className="rounded-full bg-[var(--background)] p-[2px]">
          <div className="w-[58px] h-[58px] rounded-full bg-[var(--muted)] flex items-center justify-center">
            {/* ↓ 여기에 제공받은 SVG로 교체 */}
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
              {/* SVG_PLACEHOLDER */}
            </svg>
          </div>
        </div>
      </div>
      <span className="text-xs text-[var(--text-secondary)] max-w-[64px] text-center leading-tight">
        전체
      </span>
    </button>
  );
}

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
              width={58}
              height={58}
              className="rounded-full object-cover w-[58px] h-[58px]"
            />
          ) : (
            <div className="w-[58px] h-[58px] rounded-full bg-[var(--muted)] flex items-center justify-center text-xs font-semibold text-[var(--foreground)]">
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
      <div className="max-w-6xl mx-auto py-3 px-4 flex items-start gap-3">

        {/* 고정: 전체(ALL) */}
        <AllItem
          isSelected={channelId === null}
          onClick={() => setChannelId(null)}
        />

        {/* 스와이프 영역 + ALL 우측 그라데이션 */}
        <div className="relative flex-1 min-w-0">
          {/* ALL 옆 그라데이션 — 필터바와 동일 패턴 */}
          <div
            className="absolute left-0 top-0 bottom-0 w-8 pointer-events-none z-10"
            style={{ background: 'linear-gradient(to right, var(--background), transparent)' }}
          />
          {/* 우측 그라데이션 */}
          <div
            className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none z-10"
            style={{ background: 'linear-gradient(to left, var(--background), transparent)' }}
          />

          <div
            className="flex gap-4 overflow-x-auto scrollbar-hide"
            style={{ scrollSnapType: 'x mandatory' }}
          >
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
            {/* 우측 여백 */}
            <div className="w-2 flex-shrink-0" aria-hidden />
          </div>
        </div>

      </div>
    </div>
  );
}
