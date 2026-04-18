// 채널 랜딩 페이지 — 검색 결과 채널 행에서 진입
// 레이아웃은 아티스트 페이지와 유사하되 이미지 배너 대신 원형 아바타 + 채널명
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Playlist } from '@/types';
import PlaylistCard from '@/features/playlist/components/PlaylistCard';
import ChannelAvatar from '@/features/playlist/components/ChannelAvatar';

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
      {/* 헤더: 원형 아바타 + 채널명 (아티스트 Hero와 동일 폰트 사이즈) */}
      <section className="flex flex-col items-center text-center gap-4 pt-8 pb-4 sm:pt-12 sm:pb-6">
        <div className="sm:hidden">
          <ChannelAvatar channelId={channelId} channelName={channelName} size={112} />
        </div>
        <div className="hidden sm:block">
          <ChannelAvatar channelId={channelId} channelName={channelName} size={144} />
        </div>
        <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight tracking-tight">
          {channelName}
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">플리 {playlists.length}개</p>
      </section>

      {/* 플레이리스트 그리드 */}
      <section className="mt-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {playlists.map((p) => (
            <PlaylistCard key={p.id} playlist={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
