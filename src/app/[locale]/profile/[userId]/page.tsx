// Design Ref: §1,§4 — public profile parity with /me/profile
//  - header (avatar + name + follower/following counts + follow chip)
//  - uploaded playlists grid (playlists.uploaded_by=userId AND is_active=true)
//  - curations grid (curation-route-unify: 1 큐레이션 = 1 카드 → /collection/[id])
// Plan SC-1..SC-8
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import ProfileHeroHeader from '@/components/ui/ProfileHeroHeader';
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
    // curation-route-unify: published_at 기준 (Migration 021), cover_url 포함
    supabase
      .from('user_playlists')
      .select('id, name, cover_url, published_at')
      .eq('user_id', userId)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false }),
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

  // curation-route-unify: 카드 1개에 필요한 정보만 — 첫 아이템 썸네일(cover fallback) + 총 트랙 수
  const curationCards = await Promise.all(
    (userPlaylists ?? []).map(async (up) => {
      const { data, count } = await supabase
        .from('user_playlist_items')
        .select('playlists(thumbnail_url)', { count: 'exact' })
        .eq('user_playlist_id', up.id)
        .order('position')
        .limit(1);
      const firstThumb = ((data ?? []) as unknown as { playlists: { thumbnail_url: string } | null }[])
        .map((r) => r.playlists?.thumbnail_url)
        .find(Boolean) ?? null;
      return {
        id: up.id,
        name: up.name,
        cover_url: up.cover_url as string | null,
        firstThumb,
        itemCount: count ?? 0,
      };
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
    <div className="pb-10">
      {/* Design Ref: §6.1 — header parity with /me/profile (Spotify-style hero header) */}
      <ProfileHeroHeader
        avatarUrl={avatarUrl}
        displayName={displayName}
        isVerified={isVerified}
        followerCount={followerCount ?? 0}
        followingCount={followingCount ?? 0}
        trailing={
          <UserFollowChip
            userId={userId}
            initialFollowing={isFollowing}
            currentUserId={me?.id ?? null}
          />
        }
      />

      <div className="max-w-3xl mx-auto px-4 mt-6">
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

      {/* curation-route-unify: 큐레이션 1건 = 카드 1개 → /collection/[id] */}
      {curationCards.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">
            큐레이션 {curationCards.length}개
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {curationCards.map((c) => {
              const cover = c.cover_url ?? c.firstThumb;
              return (
                <Link key={c.id} href={`/${locale}/collection/${c.id}`} className="group block">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-[var(--muted)] mb-1.5">
                    {cover ? (
                      <Image
                        src={cover}
                        alt={c.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 50vw, 33vw"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[var(--subtle)] to-[var(--muted)] flex items-center justify-center">
                        <span className="text-[var(--text-secondary)] text-xs">큐레이션</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-semibold line-clamp-2 leading-snug">{c.name}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{c.itemCount}개 플레이리스트</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}
      </div>
    </div>
  );
}
