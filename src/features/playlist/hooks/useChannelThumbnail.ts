'use client';
import { useQuery } from '@tanstack/react-query';

export function useChannelThumbnail(channelId: string) {
  return useQuery<string | null>({
    queryKey: ['channel-thumbnail', channelId],
    queryFn: async () => {
      const res = await fetch(`/api/youtube/channels?ids=${channelId}`);
      const data: Record<string, string> = await res.json();
      return data[channelId] ?? null;
    },
    staleTime: 1000 * 60 * 60,
    enabled: !!channelId,
  });
}
