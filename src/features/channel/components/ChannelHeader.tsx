'use client';
// 채널 상세 헤더 — 컴팩트 스타일 (64px 아바타 + 이름 + 플레이리스트 카운트)

import ChannelAvatar from '@/features/playlist/components/ChannelAvatar';

interface ChannelHeaderProps {
  channelId: string;
  channelName: string;
  playlistCount: number;
}

export default function ChannelHeader({ channelId, channelName, playlistCount }: ChannelHeaderProps) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <ChannelAvatar channelId={channelId} channelName={channelName} size={64} />
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-semibold truncate">{channelName}</h1>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          플레이리스트 {playlistCount}개
        </p>
      </div>
    </div>
  );
}
