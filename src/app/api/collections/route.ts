import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: cols } = await service
    .from('curated_collections')
    .select('*')
    .eq('is_active', true)
    .order('position');

  if (!cols || cols.length === 0) return NextResponse.json([]);

  const result = await Promise.all(
    cols.map(async (col) => {
      const { data: items } = await service
        .from('curated_collection_items')
        .select('playlist_id, position, playlists(*)')
        .eq('collection_id', col.id)
        .order('position');

      return {
        ...col,
        items: (items ?? [])
          .map((r: { playlists: unknown }) => r.playlists)
          .filter(Boolean),
      };
    })
  );

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
  });
}
