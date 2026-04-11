import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';
import type { Playlist } from '@/types';

async function getCollection(id: string) {
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: col } = await service
    .from('curated_collections')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (!col) return null;

  const { data: items } = await service
    .from('curated_collection_items')
    .select('playlist_id, position, playlists(*)')
    .eq('collection_id', id)
    .order('position');

  const playlists = (items ?? []).map((r: any) => r.playlists).filter(Boolean) as Playlist[];

  return { ...col, items: playlists };
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const collection = await getCollection(id);
  if (!collection) notFound();

  const thumbUrl = collection.banner_image_url ?? collection.items[0]?.thumbnail_url;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* 헤더 — 배너 이미지 + 제목 */}
      {thumbUrl && (
        <div className="relative w-full h-52 rounded-3xl overflow-hidden mb-6">
          <Image
            src={thumbUrl}
            alt={collection.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 896px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-1">
              큐레이션 컬렉션 · 플리 {collection.items.length}개
            </p>
            <h1 className="text-2xl font-bold text-white leading-snug">{collection.title}</h1>
            {collection.description && (
              <p className="text-sm text-white/75 mt-1">{collection.description}</p>
            )}
          </div>
        </div>
      )}

      {/* 플리 그리드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {collection.items.map((playlist: Playlist) => (
          <Link
            key={playlist.id}
            href={`/${locale}/playlist/${playlist.id}`}
            className="group"
          >
            {/* 썸네일 */}
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-[var(--muted)] mb-2">
              <Image
                src={playlist.thumbnail_url}
                alt={playlist.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 50vw, 33vw"
              />
            </div>

            {/* 제목 */}
            <p className="text-sm font-medium line-clamp-2 leading-snug group-hover:text-[var(--text-secondary)] transition-colors">
              {playlist.title}
            </p>

            <p className="text-xs text-[var(--subtle)] mt-0.5 truncate">{playlist.channel_name}</p>
            {playlist.editor_note && (
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2 italic leading-relaxed">
                "{playlist.editor_note}"
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
