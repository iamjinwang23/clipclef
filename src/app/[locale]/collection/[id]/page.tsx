import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';
import type { Playlist } from '@/types';

export const dynamic = 'force-dynamic';

async function getCollection(id: string) {
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: col } = await service
    .from('curated_collections')
    .select('id, title, description, position, is_active, banner_image_url, created_at')
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
    <div>
      {/* 배너 이미지 (full-width) */}
      {thumbUrl && (
        <div className="relative w-full h-64 sm:h-80 overflow-hidden">
          <Image
            src={thumbUrl}
            alt={collection.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        </div>
      )}

      {/* 타이틀 — 배너 아래, body width 정렬 */}
      <div className="max-w-4xl mx-auto px-4 pt-5 pb-2">
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-widest mb-1">
          큐레이션 컬렉션 · 플리 {collection.items.length}개
        </p>
        <h1 className="text-2xl font-bold leading-snug whitespace-pre-line">{collection.title}</h1>
        {collection.description && (
          <p className="text-sm text-[var(--text-secondary)] mt-1 whitespace-pre-line">{collection.description}</p>
        )}
      </div>

      {/* 플리 그리드 */}
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-6">
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
    </div>
  );
}
