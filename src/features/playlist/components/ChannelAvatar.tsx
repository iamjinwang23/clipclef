'use client';
import Image from 'next/image';
import { useChannelThumbnail } from '../hooks/useChannelThumbnail';

interface ChannelAvatarProps {
  channelId: string;
  channelName: string;
  size?: number;
}

export default function ChannelAvatar({ channelId, channelName, size = 20 }: ChannelAvatarProps) {
  const { data: thumbnailUrl } = useChannelThumbnail(channelId);
  const initial = channelName.charAt(0).toUpperCase();

  if (thumbnailUrl) {
    return (
      <Image
        src={thumbnailUrl}
        alt={channelName}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full bg-[var(--muted)] flex items-center justify-center flex-shrink-0 text-[var(--text-secondary)] font-medium"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {initial}
    </div>
  );
}
