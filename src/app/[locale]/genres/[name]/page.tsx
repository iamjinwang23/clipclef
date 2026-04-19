// Design Ref: home-redesign.design.md §5.8 — 장르 상세 페이지
// 채널 상세와 동일 구조: Hero(full-bleed 그라데이션) 바깥, 본문은 max-w-4xl 그리드

import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Playlist } from '@/types';
import PlaylistCard from '@/features/playlist/components/PlaylistCard';
import GenreHero from '@/features/genre/components/GenreHero';

export default async function GenreDetailPage({
  params,
}: {
  params: Promise<{ locale: string; name: string }>;
}) {
  const { name: raw } = await params;
  const name = decodeURIComponent(raw);

  const supabase = await createClient();

  const [genreRes, playlistsRes] = await Promise.all([
    supabase
      .from('genres')
      .select('name, thumbnail_url, dominant_color')
      .eq('name', name)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('playlists')
      .select('*')
      .eq('is_active', true)
      .contains('genre', [name])
      .order('like_count', { ascending: false }),
  ]);

  const genre = genreRes.data;
  const playlists = (playlistsRes.data ?? []) as Playlist[];

  if (!genre) notFound();

  return (
    <div className="pb-10">
      {/* Hero는 full-width (본문 max-w 래퍼 밖) — 채널 상세와 동일 */}
      <GenreHero
        name={genre.name}
        thumbnailUrl={genre.thumbnail_url}
        dominantColor={genre.dominant_color}
        playlistCount={playlists.length}
      />

      <section className="max-w-4xl mx-auto px-4 mt-6">
        {playlists.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--subtle)]">
            이 장르의 플레이리스트가 아직 없어요
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {playlists.map((p) => (
              <PlaylistCard key={p.id} playlist={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
