'use client';
// 채널 ID 목록 → YouTube 썸네일 URL 맵
// 기존 useChannelStories 내부에 있던 YouTube 썸네일 fetch를 분리.

import { useQuery } from '@tanstack/react-query';

export function useChannelThumbnails(channelIds: string[]) {
  const key = channelIds.slice().sort().join(',');
  return useQuery<Record<string, string>>({
    queryKey: ['channel-thumbnails', key],
    queryFn: async () => {
      if (!key) return {};
      const res = await fetch(`/api/youtube/channels?ids=${key}`);
      return res.json();
    },
    enabled: channelIds.length > 0,
    staleTime: 1000 * 60 * 60,
  });
}
