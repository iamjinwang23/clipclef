// Design Ref: §5.1 — 플레이리스트 상세 페이지
import { cache } from 'react';
import type { Metadata } from 'next';
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
import UploadSuccessToast from '@/features/playlist/components/UploadSuccessToast';
import { toArtistSlug, extractMainArtist } from '@/lib/artist-apis';
import { OG_DEFAULT, SITE_NAME, SITE_URL } from '@/lib/seo';

type PlaylistWithUploader = Playlist & {
  uploader?: { display_name: string | null; avatar_url: string | null; is_verified: boolean } | null;
};

// 한 요청 내 generateMetadata + page 페치 중복 제거
const getPlaylistData = cache(async (id: string) => {
  const supabase = await createClient();
  const [{ data: playlist }, { data: tracks }] = await Promise.all([
    supabase
      .from('playlists')
      .select('*, uploader:profiles!uploaded_by(display_name, avatar_url, is_verified)')
      .eq('id', id)
      .single(),
    supabase.from('tracks').select('*').eq('playlist_id', id).order('position'),
  ]);
  return {
    playlist: (playlist ?? null) as PlaylistWithUploader | null,
    tracks: (tracks ?? []) as Track[],
  };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const { playlist } = await getPlaylistData(id);
  if (!playlist) return { title: '플레이리스트를 찾을 수 없습니다' };

  const tags = [...playlist.genre, ...playlist.mood, ...playlist.place, ...playlist.era];
  const description =
    playlist.editor_note?.trim() ||
    playlist.description?.trim() ||
    `${playlist.channel_name} · ${tags.slice(0, 6).join(', ') || '플레이리스트'}`;
  const url = `${SITE_URL}/${locale}/playlist/${playlist.id}`;
  const image = playlist.thumbnail_url || OG_DEFAULT;

  return {
    title: playlist.title,
    description,
    alternates: {
      canonical: `/${locale}/playlist/${playlist.id}`,
      languages: {
        ko: `/ko/playlist/${playlist.id}`,
        en: `/en/playlist/${playlist.id}`,
      },
    },
    openGraph: {
      type: 'article',
      siteName: SITE_NAME,
      title: playlist.title,
      description,
      url,
      images: [{ url: image, alt: playlist.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: playlist.title,
      description,
      images: [image],
    },
  };
}

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const supabase = await createClient();

  const [{ playlist, tracks }, { data: { user } }] = await Promise.all([
    getPlaylistData(id),
    supabase.auth.getUser(),
  ]);

  if (!playlist) notFound();

  const p = playlist;
  const t = tracks;

  // FK embed가 null을 반환해도 uploaded_by가 있으면 프로필을 별도 조회하여 fallback
  type UploaderInfo = { display_name: string | null; avatar_url: string | null; is_verified: boolean };
  let uploader: UploaderInfo | null = p.uploader ?? null;
  if (p.uploaded_by && !uploader) {
    const { data: uploaderRow } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, is_verified')
      .eq('id', p.uploaded_by)
      .single();
    if (uploaderRow) uploader = uploaderRow as UploaderInfo;
  }
  const allTags = [...p.genre, ...p.mood, ...p.place, ...p.era];

  // Plan SC: 소유자만 수정/삭제 버튼 노출
  const isOwner = !!user && user.id === p.uploaded_by;

  // Design Ref: §6.2 — 트랙에서 고유 아티스트 slug 추출 (최대 5명, not_found 제외는 ArtistStrip이 처리)
  // Design Ref: §6.2 — 트랙에서 고유 아티스트 slug 추출 (최대 5명, not_found 제외는 ArtistStrip이 처리)
  const artistMap = new Map<string, { name: string; slug: string }>();
  for (const track of t) {
    if (!track.artist) continue;
    const slug = toArtistSlug(track.artist);
    if (slug && !artistMap.has(slug)) {
      artistMap.set(slug, { name: extractMainArtist(track.artist), slug });
    }
  }
  const artistSlugs = [...artistMap.values()];

  // JSON-LD: MusicPlaylist (schema.org) — 검색 리치 결과 후보
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicPlaylist',
    name: p.title,
    description: p.editor_note || p.description || undefined,
    url: `${SITE_URL}/${locale}/playlist/${p.id}`,
    image: p.thumbnail_url || undefined,
    numTracks: p.track_count,
    genre: p.genre.length ? p.genre : undefined,
    track: t.slice(0, 50).map((track, i) => ({
      '@type': 'MusicRecording',
      position: track.position ?? i + 1,
      name: track.title,
      byArtist: track.artist
        ? { '@type': 'MusicGroup', name: extractMainArtist(track.artist) }
        : undefined,
    })),
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <UploadSuccessToast />
      {/* 업로더 프로필 — 최상단 */}
      {p.uploaded_by && (
        <div className="pt-4 pb-0">
          <UploaderCard
            uploadedBy={p.uploaded_by}
            displayName={uploader?.display_name ?? null}
            avatarUrl={uploader?.avatar_url ?? null}
            isVerified={uploader?.is_verified ?? false}
          />
        </div>
      )}

      {/* 플레이어 (영상 아래에 제목/채널/태그/액션 삽입 후 트랙리스트) */}
      <PlaylistPlayer playlist={p} tracks={t}>
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
          <div className="flex items-center gap-2 ml-0.5 text-sm text-[var(--text-secondary)]">
            <Link
              href={`/${locale}/channel/${encodeURIComponent(p.channel_id)}`}
              className="flex items-center gap-2 hover:text-[var(--foreground)] transition-colors"
            >
              <ChannelAvatar channelId={p.channel_id} channelName={p.channel_name} size={18} />
              <span>{p.channel_name}</span>
            </Link>
            <span>· {Math.max(1, p.track_count)}개 트랙</span>
          </div>
        </div>

        {/* 노트 입력 */}
        {p.editor_note && (
          <blockquote className="mb-3 border-l-2 border-[var(--subtle)] pl-4 py-1">
            <p className="text-sm text-[var(--text-secondary)] italic leading-relaxed">{p.editor_note}</p>
          </blockquote>
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

      {/* 태그 */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-6">
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

      {/* 아티스트 카드 */}
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
        <CommentList playlistId={p.id} isLoggedIn={!!user} />
      </section>
    </div>
  );
}
