'use client';
// 플레이리스트 목록에서 유니크 채널 추출 + 24h 신규 여부 + 썸네일 조회

import { useQuery } from '@tanstack/react-query';
import type { Playlist } from '@/types';

export interface ChannelStory {
  channelId: string;
  channelName: string;
  thumbnailUrl: string | null;
  isNew: boolean; // 최근 24h 이내 플레이리스트 업로드 여부
  latestCreatedAt: string;
}

function deriveChannels(playlists: Playlist[]): ChannelStory[] {
  const now = Date.now();
  const h24 = 24 * 60 * 60 * 1000;

  const map = new Map<string, { channelName: string; latestAt: string; isNew: boolean }>();

  for (const pl of playlists) {
    const existing = map.get(pl.channel_id);
    const createdAt = pl.created_at;
    const isNew = now - new Date(createdAt).getTime() < h24;

    if (!existing || createdAt > existing.latestAt) {
      map.set(pl.channel_id, {
        channelName: pl.channel_name,
        latestAt: createdAt,
        isNew: isNew || (existing?.isNew ?? false),
      });
    } else if (isNew) {
      existing.isNew = true;
    }
  }

  return Array.from(map.entries())
    .map(([channelId, v]) => ({
      channelId,
      channelName: v.channelName,
      thumbnailUrl: null,
      isNew: v.isNew,
      latestCreatedAt: v.latestAt,
    }))
    .sort((a, b) => {
      // 신규 채널 우선, 그다음 최신순
      if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
      return b.latestCreatedAt.localeCompare(a.latestCreatedAt);
    });
}

export function useChannelStories(playlists: Playlist[] | undefined) {
  const channels = playlists ? deriveChannels(playlists) : [];
  const channelIds = channels.map((c) => c.channelId).join(',');

  const { data: thumbnails } = useQuery<Record<string, string>>({
    queryKey: ['channel-thumbnails', channelIds],
    queryFn: async () => {
      if (!channelIds) return {};
      const res = await fetch(`/api/youtube/channels?ids=${channelIds}`);
      return res.json();
    },
    enabled: channels.length > 0,
    staleTime: 1000 * 60 * 60, // 1시간 캐시
  });

  return channels.map((c) => ({
    ...c,
    thumbnailUrl: thumbnails?.[c.channelId] ?? null,
  }));
}
