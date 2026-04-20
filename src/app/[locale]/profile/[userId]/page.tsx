// Design Ref: §1,§4 — public profile parity with /me/profile
//  - header (avatar + name + follower/following counts + follow chip)
//  - uploaded playlists grid (playlists.uploaded_by=userId AND is_active=true)
//  - curations grid (user_playlists, preview 4 items per list)
// Plan SC-1..SC-8
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import UserAvatar from '@/components/ui/UserAvatar';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import UserFollowChip from '@/features/search/components/UserFollowChip';
import { createClient } from '@/lib/supabase/server';
import type { Playlist } from '@/types';

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string; userId: string }>;
}) {
  const { locale, userId } = await params;
  const supabase = await createClient();

  // Design Ref: §4 — 6-way parallel fetch on server
  const { data: { user: me } } = await supabase.auth.getUser();

  const [
    { data: profile },
    { data: uploadedPlaylists },
    { data: userPlaylists },
    { count: followerCount },
    { count: followingCount },
    isFollowing,
  ] = await Promise.all([
    supabase.from('profiles').select('display_name, avatar_url, is_verified').eq('id', userId).single(),
    // Plan SC-4 — uploaded playlists filter is_active=true, matches /me/profile
    supabase
      .from('playlists')
      .select('id, title, thumbnail_url, channel_name, track_count')
      .eq('uploaded_by', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('user_playlists')
      .select('id, name, created_at')
      .eq('user_id', userId)
      .eq('is_public', true)
      .order('created_at', { ascending: false }),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
    // Design Ref: §4.1 — server-side single-row follow check (no flicker, no N+1)
    me && me.id !== userId
      ? supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', me.id)
          .eq('following_id', userId)
          .maybeSingle()
          .then(({ data }) => !!data)
      : Promise.resolve(false),
  ]);

  if (!profile) notFound();

  // 큐레이션 미리보기 — 기존 패턴 유지
  const playlistsWithItems = await Promise.all(
    (userPlaylists ?? []).map(async (up) => {
      const { data } = await supabase
        .from('user_playlist_items')
        .select('playlists(id, title, thumbnail_url, channel_name)')
        .eq('user_playlist_id', up.id)
        .order('position')
        .limit(4);
      const items = ((data ?? []) as unknown as { playlists: Playlist | null }[])
        .map((r) => r.playlists)
        .filter(Boolean) as Playlist[];
      return { ...up, items };
    })
  );

  const displayName = profile.display_name ?? '이름 없음';
  const avatarUrl = profile.avatar_url;
  const isVerified = profile.is_verified;
  const uploads = (uploadedPlaylists ?? []) as Pick<
    Playlist,
    'id' | 'title' | 'thumbnail_url' | 'channel_name' | 'track_count'
  >[];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Design Ref: §6.1 — header parity with /me/profile (ProfileSettingsMenu → UserFollowChip) */}
      <div className="flex items-center gap-4 mb-8">
        <UserAvatar src={avatarUrl} name={displayName} size={64} />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold flex items-center gap-1.5 truncate">
            {displayName}
            {isVerified && <VerifiedBadge size={18} />}
          </h1>
          <div className="flex gap-4 mt-1 text-xs text-[var(--text-secondary)]">
            <span>
              팔로워 <strong className="text-[var(--foreground)]">{followerCount ?? 0}</strong>
            </span>
            <span>
              팔로잉 <strong className="text-[var(--foreground)]">{followingCount ?? 0}</strong>
            </span>
          </div>
        </div>
        {/* Plan SC-3 — self-view/guest hides chip via UserFollowChip internal guard */}
        <UserFollowChip
          userId={userId}
          initialFollowing={isFollowing}
          currentUserId={me?.id ?? null}
        />
      </div>

      {/* Design Ref: §6.2 — uploaded playlists section (mirrors /me/profile §플레이리스트) */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">
          플레이리스트 {uploads.length}개
        </h2>
        {uploads.length === 0 ? (
          <div className="py-10 text-center text-sm text-[var(--text-secondary)] border border-dashed border-[var(--border)] rounded-xl">
            공개된 플레이리스트가 없어요
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {uploads.map((p) => (
              <Link key={p.id} href={`/${locale}/playlist/${p.id}`} className="group block">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-[var(--muted)] mb-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.thumbnail_url}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="text-xs font-medium line-clamp-2 leading-snug">{p.title}</p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">{p.channel_name}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Design Ref: §6.3 — curation preview grid (label only changed: 플레이리스트 → 큐레이션) */}
      {playlistsWithItems.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">
            큐레이션 {playlistsWithItems.length}개
          </h2>
          <div className="space-y-6">
            {playlistsWithItems.map((up) => (
              <div key={up.id}>
                <h3 className="font-semibold text-base mb-3">{up.name}</h3>
                {up.items.length === 0 ? (
                  <p className="text-xs text-[var(--text-secondary)]">담긴 플레이리스트가 없어요</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {up.items.map((p) => (
                      // Plan SC-6 — curation item → /[locale]/playlist/[id] (unchanged)
                      <Link key={p.id} href={`/${locale}/playlist/${p.id}`} className="group block">
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
        </section>
      )}
    </div>
  );
}
