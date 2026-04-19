import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import type { Playlist } from '@/types';
import CollectionPageClient from '@/features/collection/components/CollectionPageClient';

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

  // Supabase FK 조인: 런타임은 단일 객체지만 타입은 배열로 표기 → 좁히기 캐스트.
  const playlists = ((items ?? []) as unknown as { playlists: Playlist | null }[])
    .map((r) => r.playlists)
    .filter(Boolean) as Playlist[];

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
      <div className="max-w-4xl mx-auto px-4">
        <CollectionPageClient
          playlists={collection.items}
          locale={locale}
          collectionTitle={collection.title}
          collectionDescription={collection.description}
          itemCount={collection.items.length}
          bannerImageUrl={thumbUrl ?? null}
        />
      </div>
    </div>
  );
}
