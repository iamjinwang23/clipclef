// 채널 랜딩 페이지 — Spotify-style 헤더 + 플레이리스트 그리드
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Playlist } from '@/types';
import PlaylistCard from '@/features/playlist/components/PlaylistCard';
import ChannelHeader from '@/features/channel/components/ChannelHeader';

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ locale: string; channelId: string }>;
}) {
  const { channelId: raw } = await params;
  const channelId = decodeURIComponent(raw);

  const supabase = await createClient();
  const { data } = await supabase
    .from('playlists')
    .select('*')
    .eq('channel_id', channelId)
    .eq('is_active', true)
    .order('like_count', { ascending: false });

  const playlists = (data ?? []) as Playlist[];
  if (playlists.length === 0) notFound();

  const channelName = playlists[0].channel_name;

  return (
    <div className="max-w-4xl mx-auto px-4 pb-10">
      <ChannelHeader
        channelId={channelId}
        channelName={channelName}
        playlistCount={playlists.length}
      />

      {/* 플레이리스트 그리드 */}
      <section className="mt-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {playlists.map((p) => (
            <PlaylistCard key={p.id} playlist={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
