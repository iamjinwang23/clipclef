// Design Ref: §5.1 — 플레이리스트 상세 페이지
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Playlist, Track } from '@/types';
import PlaylistPlayer from '@/features/playlist/components/PlaylistPlayer';
import ChannelAvatar from '@/features/playlist/components/ChannelAvatar';
import PlaylistOwnerMenu from '@/features/playlist/components/PlaylistOwnerMenu';
import LikeButton from '@/features/interaction/components/LikeButton';
import SaveButton from '@/features/interaction/components/SaveButton';
import CommentList from '@/features/interaction/components/CommentList';
import CommentForm from '@/features/interaction/components/CommentForm';
import UploaderCard from '@/features/interaction/components/UploaderCard';
import ArtistStrip from '@/features/artist/components/ArtistStrip';
import { toArtistSlug, extractMainArtist } from '@/lib/artist-apis';

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const supabase = await createClient();

  const [{ data: playlist }, { data: tracks }, { data: { user } }] = await Promise.all([
    supabase.from('playlists').select('*, uploader:profiles!uploaded_by(display_name, avatar_url, is_verified)').eq('id', id).single(),
    supabase.from('tracks').select('*').eq('playlist_id', id).order('position'),
    supabase.auth.getUser(),
  ]);

  if (!playlist) notFound();

  const p = playlist as Playlist & { uploader?: { display_name: string | null; avatar_url: string | null; is_verified: boolean } | null };
  const t = (tracks ?? []) as Track[];
  const allTags = [...p.genre, ...p.mood, ...p.place, ...p.era];

  // Plan SC: 소유자만 수정/삭제 버튼 노출
  const isOwner = !!user && user.id === p.uploaded_by;

  // Design Ref: §6.2 — 트랙에서 고유 아티스트 slug 추출 (최대 5명, not_found 제외는 ArtistStrip이 처리)
  const artistMap = new Map<string, { name: string; slug: string }>();
  for (const track of t) {
    if (!track.artist) continue;
    const slug = toArtistSlug(track.artist);
    if (slug && !artistMap.has(slug)) {
      artistMap.set(slug, { name: extractMainArtist(track.artist), slug });
    }
  }
  const artistSlugs = [...artistMap.values()].slice(0, 5);

  return (
    <div className="max-w-4xl mx-auto px-4 pb-6">
      {/* 업로더 프로필 — 최상단 */}
      {p.uploaded_by && p.uploader && (
        <div className="pt-4 pb-0">
          <UploaderCard
            uploadedBy={p.uploaded_by}
            displayName={p.uploader.display_name}
            avatarUrl={p.uploader.avatar_url}
            isVerified={p.uploader.is_verified}
          />
        </div>
      )}

      {/* 플레이어 (영상 아래에 제목/채널/태그/액션 삽입 후 트랙리스트) */}
      <PlaylistPlayer youtubeId={p.youtube_id} tracks={t}>
        {/* 제목 + 채널 */}
        <div className="mt-4 mb-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-start gap-2 min-w-0">
              {p.is_ai && (
                <span className="mt-0.5 flex-shrink-0 bg-violet-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  AI
                </span>
              )}
              <h1 className="text-xl font-semibold leading-snug">{p.title}</h1>
            </div>
            {isOwner && (
              <PlaylistOwnerMenu
                playlistId={p.id}
                locale={locale}
                initialData={{
                  editorNote: p.editor_note,
                  genre: p.genre,
                  mood: p.mood,
                  place: p.place,
                  era: p.era,
                }}
                tracks={t}
              />
            )}
          </div>
          <div className="flex items-center gap-2 ml-0.5">
            <ChannelAvatar channelId={p.channel_id} channelName={p.channel_name} size={18} />
            <p className="text-sm text-[var(--text-secondary)]">
              {p.channel_name} · {Math.max(1, p.track_count)}개 트랙
            </p>
          </div>
        </div>

        {/* 에디터 노트 */}
        {p.editor_note && (
          <blockquote className="mb-3 border-l-2 border-[var(--subtle)] pl-4 py-1">
            <p className="text-sm text-[var(--text-secondary)] italic leading-relaxed">{p.editor_note}</p>
          </blockquote>
        )}

        {/* 태그 */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {allTags.map((tag) => (
              <span
                key={tag}
                className="text-sm px-2.5 py-0.5 bg-[var(--muted)] text-[var(--text-secondary)] rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex items-center gap-2 mb-2">
          <LikeButton playlistId={p.id} initialCount={p.like_count} />
          <SaveButton playlistId={p.id} isLoggedIn={!!user} responsive />
          <a
            href={`https://www.youtube.com/watch?v=${p.youtube_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 h-9 px-4 rounded-full border border-[var(--border)] text-sm font-medium hover:bg-[var(--muted)] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
            </svg>
            YouTube에서 보기
          </a>
        </div>
      </PlaylistPlayer>

      {/* 아티스트 카드 — 트랙리스트 아래, 댓글 위 */}
      {artistSlugs.length > 0 && (
        <ArtistStrip artists={artistSlugs} locale={locale} />
      )}

      {/* 댓글 */}
      <section className="mt-10">
        <h2 className="text-base font-semibold text-white mb-4">
          댓글 {p.comment_count}개
        </h2>
        <div className="mb-6">
          <CommentForm playlistId={p.id} isLoggedIn={!!user} />
        </div>
        <CommentList playlistId={p.id} />
      </section>
    </div>
  );
}
