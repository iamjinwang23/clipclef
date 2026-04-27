// 채널 랜딩 페이지 — Spotify-style 헤더(풀 폭) + 플레이리스트 그리드
import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Playlist } from '@/types';
import PlaylistCard from '@/features/playlist/components/PlaylistCard';
import ChannelHeader from '@/features/channel/components/ChannelHeader';
import { OG_DEFAULT, SITE_NAME, SITE_URL } from '@/lib/seo';

const getChannelPlaylists = cache(async (channelId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('playlists')
    .select('*')
    .eq('channel_id', channelId)
    .eq('is_active', true)
    .order('like_count', { ascending: false });
  return (data ?? []) as Playlist[];
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; channelId: string }>;
}): Promise<Metadata> {
  const { locale, channelId: raw } = await params;
  const channelId = decodeURIComponent(raw);
  const playlists = await getChannelPlaylists(channelId);
  if (playlists.length === 0) return { title: '채널을 찾을 수 없습니다' };

  const name = playlists[0].channel_name;
  const description = `${name} — 큐레이션된 플레이리스트 ${playlists.length}개`;
  const image = playlists[0].thumbnail_url || OG_DEFAULT;
  const url = `${SITE_URL}/${locale}/channel/${encodeURIComponent(channelId)}`;

  return {
    title: name,
    description,
    alternates: {
      canonical: `/${locale}/channel/${encodeURIComponent(channelId)}`,
      languages: {
        ko: `/ko/channel/${encodeURIComponent(channelId)}`,
        en: `/en/channel/${encodeURIComponent(channelId)}`,
      },
    },
    openGraph: {
      type: 'profile',
      siteName: SITE_NAME,
      title: name,
      description,
      url,
      images: [{ url: image, alt: name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: name,
      description,
      images: [image],
    },
  };
}

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ locale: string; channelId: string }>;
}) {
  const { channelId: raw } = await params;
  const channelId = decodeURIComponent(raw);

  const playlists = await getChannelPlaylists(channelId);
  if (playlists.length === 0) notFound();

  const channelName = playlists[0].channel_name;

  return (
    <div className="@container max-w-4xl mx-auto px-4 py-8 pb-10">
      <ChannelHeader
        channelId={channelId}
        channelName={channelName}
        playlistCount={playlists.length}
      />

      <div className="grid grid-cols-2 @md:grid-cols-3 gap-4">
        {playlists.map((p) => (
          <PlaylistCard key={p.id} playlist={p} />
        ))}
      </div>
    </div>
  );
}
