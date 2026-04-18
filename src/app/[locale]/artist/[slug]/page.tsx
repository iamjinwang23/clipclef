// Design Ref: §6.1 — 아티스트 상세 페이지 (서버 컴포넌트)
// Plan SC: 아티스트 페이지에 사진·바이오·출연 플레이리스트 노출
import { notFound } from 'next/navigation';
import ArtistHero from '@/features/artist/components/ArtistHero';
import PlaylistCard from '@/features/playlist/components/PlaylistCard';
import {
  fetchArtistWithCache,
  getArtistPlaylists,
} from '@/features/artist/lib/artist.server';
import { extractMainArtist } from '@/lib/artist-apis';

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);

  // slug에서 아티스트명 복원 (하이픈 → 공백, 후에 DB에 실제 이름 있음)
  const artistName = slug.replace(/-/g, ' ');

  const artist = await fetchArtistWithCache(slug, artistName);
  if (!artist) notFound();

  const playlists = await getArtistPlaylists(extractMainArtist(artist.name!));

  return (
    <div className="max-w-4xl mx-auto px-4 pb-10">
      {/* 히어로 */}
      <ArtistHero
        name={artist.name}
        imageUrl={artist.image_url}
      />

      {/* 바이오그래피 */}
      {artist.bio_en && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
            소개
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
            {artist.bio_en}
          </p>
        </section>
      )}

      {/* 플레이리스트 */}
      {playlists.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">
            플레이리스트 {playlists.length}개
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        </section>
      )}

      {/* 플레이리스트 없음 */}
      {playlists.length === 0 && (
        <p className="mt-8 text-sm text-[var(--subtle)] text-center">
          등록된 플레이리스트가 없어요
        </p>
      )}
    </div>
  );
}
