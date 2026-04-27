// Design Ref: §6.1 — 아티스트 상세 페이지 (서버 컴포넌트)
// Plan SC: 아티스트 페이지에 사진·바이오·출연 플레이리스트 노출
import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArtistHero from '@/features/artist/components/ArtistHero';
import PlaylistCard from '@/features/playlist/components/PlaylistCard';
import {
  fetchArtistWithCache,
  getArtistPlaylists,
} from '@/features/artist/lib/artist.server';
import { extractMainArtist } from '@/lib/artist-apis';
import { OG_DEFAULT, SITE_NAME, SITE_URL } from '@/lib/seo';

// generateMetadata + page 페치 중복 제거 (request-level)
const getArtist = cache(async (slug: string) => {
  const artistName = slug.replace(/-/g, ' ');
  return fetchArtistWithCache(slug, artistName);
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const artist = await getArtist(slug);
  if (!artist) return { title: '아티스트를 찾을 수 없습니다' };

  const description =
    artist.bio_en?.trim().slice(0, 200) || `${artist.name} — clip/clef 아티스트 페이지`;
  const url = `${SITE_URL}/${locale}/artist/${encodeURIComponent(slug)}`;
  const image = artist.image_url || OG_DEFAULT;

  return {
    title: artist.name,
    description,
    alternates: {
      canonical: `/${locale}/artist/${encodeURIComponent(slug)}`,
      languages: {
        ko: `/ko/artist/${encodeURIComponent(slug)}`,
        en: `/en/artist/${encodeURIComponent(slug)}`,
      },
    },
    openGraph: {
      type: 'profile',
      siteName: SITE_NAME,
      title: artist.name,
      description,
      url,
      images: [{ url: image, alt: artist.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: artist.name,
      description,
      images: [image],
    },
  };
}

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);

  const artist = await getArtist(slug);
  if (!artist) notFound();

  const playlists = await getArtistPlaylists(extractMainArtist(artist.name!));

  // JSON-LD: MusicGroup (schema.org)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: artist.name,
    description: artist.bio_en || undefined,
    url: `${SITE_URL}/${locale}/artist/${encodeURIComponent(slug)}`,
    image: artist.image_url || undefined,
    identifier: artist.mbid
      ? { '@type': 'PropertyValue', propertyID: 'MusicBrainz', value: artist.mbid }
      : undefined,
  };

  return (
    <div className="@container max-w-4xl mx-auto px-4 pb-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
          <div className="grid grid-cols-2 @md:grid-cols-3 gap-4">
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
