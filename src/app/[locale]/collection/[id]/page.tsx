import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import type { Playlist } from '@/types';
import CollectionPageClient from '@/features/collection/components/CollectionPageClient';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Creator = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
};

type CollectionData = {
  source: 'curated' | 'user';
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  items: Playlist[];
  creator: Creator | null;
};

async function getCollection(id: string): Promise<CollectionData | null> {
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. curated_collections 우선 조회 (관리자 에디토리얼)
  const { data: curated } = await service
    .from('curated_collections')
    .select('id, title, description, banner_image_url')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();

  if (curated) {
    const { data: items } = await service
      .from('curated_collection_items')
      .select('playlist_id, position, playlists(*)')
      .eq('collection_id', id)
      .order('position');

    const playlists = ((items ?? []) as unknown as { playlists: Playlist | null }[])
      .map((r) => r.playlists)
      .filter(Boolean) as Playlist[];

    return {
      source: 'curated',
      id: curated.id,
      title: curated.title,
      description: curated.description,
      coverUrl: curated.banner_image_url,
      items: playlists,
      creator: null,
    };
  }

  // 2. user_playlists fallback (유저 발행 큐레이션)
  // published_at IS NOT NULL = 공개. 미발행은 notFound 처리.
  const { data: userPl } = await service
    .from('user_playlists')
    .select(
      'id, name, caption, cover_url, user_id, published_at, profiles!user_id(id, display_name, avatar_url, is_verified)'
    )
    .eq('id', id)
    .not('published_at', 'is', null)
    .maybeSingle();

  if (!userPl) return null;

  const { data: items } = await service
    .from('user_playlist_items')
    .select('playlist_id, position, playlists(*)')
    .eq('user_playlist_id', id)
    .order('position');

  const playlists = ((items ?? []) as unknown as { playlists: Playlist | null }[])
    .map((r) => r.playlists)
    .filter(Boolean) as Playlist[];

  // FK 조인: profiles는 단일 row지만 타입은 배열/객체 양쪽 가능 → 좁히기 캐스트
  const profile = (userPl as unknown as {
    profiles: Creator | Creator[] | null;
  }).profiles;
  const creator: Creator | null = Array.isArray(profile) ? profile[0] ?? null : profile;

  return {
    source: 'user',
    id: userPl.id,
    title: userPl.name,
    description: userPl.caption,
    coverUrl: userPl.cover_url,
    items: playlists,
    creator,
  };
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const collection = await getCollection(id);
  if (!collection) notFound();

  // user 소스일 때 본인 여부 / 팔로우 여부 (UserFollowChip 표시)
  let currentUserId: string | null = null;
  let isFollowing = false;
  if (collection.source === 'user' && collection.creator) {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    currentUserId = user?.id ?? null;

    if (user && user.id !== collection.creator.id) {
      const { data: follow } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('following_id', collection.creator.id)
        .maybeSingle();
      isFollowing = !!follow;
    }
  }

  const thumbUrl = collection.coverUrl ?? collection.items[0]?.thumbnail_url ?? null;

  return (
    <div>
      <div className="max-w-4xl mx-auto px-4">
        <CollectionPageClient
          playlists={collection.items}
          locale={locale}
          collectionTitle={collection.title}
          collectionDescription={collection.description}
          itemCount={collection.items.length}
          bannerImageUrl={thumbUrl}
          creator={collection.creator}
          currentUserId={currentUserId}
          initialFollowing={isFollowing}
        />
      </div>
    </div>
  );
}
