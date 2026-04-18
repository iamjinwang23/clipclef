// Design Ref: §5.3 — 내 좋아요 페이지
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Playlist } from '@/types';
import PlaylistCard from '@/features/playlist/components/PlaylistCard';

export default async function MyLikesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}`);

  const { data } = await supabase
    .from('likes')
    .select('playlists(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const playlists = (data ?? []).map((r: any) => r.playlists).filter(Boolean) as Playlist[];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold mb-6">내 좋아요</h1>
      {playlists.length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--text-secondary)]">좋아요한 플레이리스트가 없어요</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {playlists.map((pl) => (
            <PlaylistCard key={pl.id} playlist={pl} />
          ))}
        </div>
      )}
    </div>
  );
}
