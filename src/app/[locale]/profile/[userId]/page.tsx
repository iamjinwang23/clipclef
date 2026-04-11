import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import UserAvatar from '@/components/ui/UserAvatar';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import { createClient } from '@/lib/supabase/server';
import type { Playlist } from '@/types';

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string; userId: string }>;
}) {
  const { locale, userId } = await params;
  const supabase = await createClient();

  const [{ data: profile }, { data: userPlaylists }] = await Promise.all([
    supabase.from('profiles').select('display_name, avatar_url, is_verified').eq('id', userId).single(),
    supabase
      .from('user_playlists')
      .select('id, name, created_at')
      .eq('user_id', userId)
      .eq('is_public', true)
      .order('created_at', { ascending: false }),
  ]);

  if (!profile) notFound();

  // 각 재생목록의 항목(플리) 가져오기
  const playlistsWithItems = await Promise.all(
    (userPlaylists ?? []).map(async (up) => {
      const { data } = await supabase
        .from('user_playlist_items')
        .select('playlists(id, title, thumbnail_url, channel_name)')
        .eq('user_playlist_id', up.id)
        .order('position')
        .limit(4);
      const items = (data ?? []).map((r: any) => r.playlists).filter(Boolean) as Playlist[];
      return { ...up, items };
    })
  );

  const displayName = profile.display_name ?? '이름 없음';
  const avatarUrl = profile.avatar_url;
  const isVerified = profile.is_verified;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* 프로필 헤더 */}
      <div className="flex items-center gap-4 mb-8">
        <UserAvatar src={avatarUrl} name={displayName} size={64} />
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-1.5">
            {displayName}
            {isVerified && <VerifiedBadge size={18} />}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            재생목록 {playlistsWithItems.length}개
          </p>
        </div>
      </div>

      {/* 재생목록 목록 */}
      {playlistsWithItems.length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--text-secondary)]">공개된 재생목록이 없어요</p>
      ) : (
        <div className="space-y-6">
          {playlistsWithItems.map((up) => (
            <div key={up.id}>
              <h2 className="font-semibold text-base mb-3">{up.name}</h2>
              {up.items.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)]">담긴 플리가 없어요</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {up.items.map((p) => (
                    <Link
                      key={p.id}
                      href={`/${locale}/playlist/${p.id}`}
                      className="group block"
                    >
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-[var(--muted)] mb-1.5">
                        <Image
                          src={p.thumbnail_url}
                          alt={p.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 50vw, 25vw"
                        />
                      </div>
                      <p className="text-xs font-medium line-clamp-2 leading-snug">{p.title}</p>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">{p.channel_name}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
