// Design Ref: §5.3 — 내 공개 프로필 허브
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Playlist } from '@/types';
import ProfileSettingsMenu from './ProfileSettingsMenu';
import UserAvatar from '@/components/ui/UserAvatar';
import VerifiedBadge from '@/components/ui/VerifiedBadge';

export default async function MyProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}`);

  const [
    { data: profile },
    { data: uploadedPlaylists },
    { data: userPlaylists },
    { count: followerCount },
    { count: followingCount },
  ] = await Promise.all([
    supabase.from('profiles').select('display_name, avatar_url, is_verified').eq('id', user.id).single(),
    supabase
      .from('playlists')
      .select('id, title, thumbnail_url, channel_name, track_count')
      .eq('uploaded_by', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('user_playlists')
      .select('id, name, created_at')
      .eq('user_id', user.id)
      .eq('is_public', true)
      .order('created_at', { ascending: false }),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
  ]);

  const displayName = profile?.display_name ?? '이름 없음';
  const avatarUrl = profile?.avatar_url ?? (user.user_metadata?.avatar_url as string | undefined) ?? '';
  const isVerified = profile?.is_verified ?? false;
  const playlists = (uploadedPlaylists ?? []) as Pick<Playlist, 'id' | 'title' | 'thumbnail_url' | 'channel_name' | 'track_count'>[];
  const pubLists = userPlaylists ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* 프로필 헤더 */}
      <div className="flex items-center gap-4 mb-8">
        <UserAvatar src={avatarUrl} name={displayName} size={64} />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold flex items-center gap-1.5 truncate">
            {displayName}
            {isVerified && <VerifiedBadge size={18} />}
          </h1>
          <div className="flex gap-4 mt-1 text-xs text-[var(--text-secondary)]">
            <span>팔로워 <strong className="text-[var(--foreground)]">{followerCount ?? 0}</strong></span>
            <span>팔로잉 <strong className="text-[var(--foreground)]">{followingCount ?? 0}</strong></span>
          </div>
        </div>
        <ProfileSettingsMenu locale={locale} />
      </div>

      {/* 내가 올린 플리 */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">
          내가 올린 플리 ({playlists.length})
        </h2>
        {playlists.length === 0 ? (
          <div className="py-10 text-center text-sm text-[var(--text-secondary)] border border-dashed border-[var(--border)] rounded-xl">
            <p className="mb-2">아직 올린 플리가 없어요</p>
            <Link href={`/${locale}/upload`} className="text-xs underline hover:text-[var(--foreground)]">
              + 플리 올리기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {playlists.map((p) => (
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

      {/* 공개 재생목록 */}
      {pubLists.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">
            공개 재생목록 ({pubLists.length})
          </h2>
          <div className="space-y-2">
            {pubLists.map((up) => (
              <Link
                key={up.id}
                href={`/${locale}/me/playlists`}
                className="flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] transition-colors"
              >
                <span className="text-sm font-medium">{up.name}</span>
                <svg className="w-4 h-4 text-[var(--subtle)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
