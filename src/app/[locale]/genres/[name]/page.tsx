// Design Ref: home-redesign.design.md §5.8 — 장르 상세 페이지
// 헤더(GenreHero, 그라데이션) + 해당 장르 포함 플리 그리드

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

  // 장르 메타 + 해당 장르 플리 병렬 조회
  const [genreRes, playlistsRes] = await Promise.all([
    supabase
      .from('genres')
      .select('name, thumbnail_url')
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

  // 장르 행 자체가 없거나 active=false면 404 (단, 플리는 있어도 의도적으로 숨겨진 상태)
  if (!genre) notFound();

  return (
    <div className="pb-10">
      <GenreHero
        name={genre.name}
        thumbnailUrl={genre.thumbnail_url}
        playlistCount={playlists.length}
      />

      <section className="max-w-6xl mx-auto px-4 mt-6">
        {playlists.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--subtle)]">
            이 장르의 플레이리스트가 아직 없어요
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {playlists.map((p) => (
              <PlaylistCard key={p.id} playlist={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
