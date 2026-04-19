'use client';
// Design Ref: home-channel-rail.plan.md §1.1 — compute log-normalized popularity score
// 채널별 집계(좋아요/조회수/댓글/30일 신규) → 로그 정규화 합산 → Top 20

import { useQuery } from '@tanstack/react-query';
import type { Playlist } from '@/types';

export interface ChannelStory {
  channelId: string;
  channelName: string;
  thumbnailUrl: string | null;
  score: number;
}

const DAY_30_MS = 30 * 24 * 60 * 60 * 1000;
const TOP_N = 20;

// 가중치 — 로그 적용 후 3개 지표 스케일이 비슷해짐. 댓글은 희소해서 더 높게.
const W_LIKE = 1.0;
const W_VIEW = 0.8;
const W_COMMENT = 2.0;
const W_NEW = 1.5;

function deriveChannels(playlists: Playlist[]): ChannelStory[] {
  const now = Date.now();

  // 채널별 그룹화 + 집계
  const byChannel = new Map<string, {
    channelName: string;
    likes: number;
    views: number;
    comments: number;
    new30: number;
  }>();

  for (const pl of playlists) {
    const isNew = now - new Date(pl.created_at).getTime() < DAY_30_MS;
    const existing = byChannel.get(pl.channel_id);
    if (existing) {
      existing.likes += pl.like_count;
      existing.views += pl.view_count;
      existing.comments += pl.comment_count;
      if (isNew) existing.new30 += 1;
    } else {
      byChannel.set(pl.channel_id, {
        channelName: pl.channel_name,
        likes: pl.like_count,
        views: pl.view_count,
        comments: pl.comment_count,
        new30: isNew ? 1 : 0,
      });
    }
  }

  // 로그 정규화 점수
  return [...byChannel.entries()]
    .map(([channelId, v]) => {
      const score =
        Math.log(1 + v.likes) * W_LIKE
        + Math.log(1 + v.views / 1000) * W_VIEW
        + Math.log(1 + v.comments) * W_COMMENT
        + v.new30 * W_NEW;
      return {
        channelId,
        channelName: v.channelName,
        thumbnailUrl: null,
        score,
      } as ChannelStory;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N);
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
