import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function assertAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null;
  return user;
}

// GET — 컬렉션 목록 + 항목 조회
export async function GET() {
  const service = serviceClient();
  const { data: cols } = await service
    .from('curated_collections')
    .select('*')
    .order('position');

  if (!cols) return NextResponse.json([]);

  const result = await Promise.all(
    cols.map(async (col) => {
      const { data: items } = await service
        .from('curated_collection_items')
        .select('playlist_id, position, playlists(*)')
        .eq('collection_id', col.id)
        .order('position');

      return {
        ...col,
        items: (items ?? []).map((r: any) => r.playlists).filter(Boolean),
      };
    })
  );

  return NextResponse.json(result);
}

// PUT — 컬렉션 생성
export async function PUT(req: NextRequest) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, position } = await req.json();
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });

  const { data, error } = await serviceClient()
    .from('curated_collections')
    .insert({ title, position: position ?? 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — 컬렉션에 플레이리스트 추가
export async function POST(req: NextRequest) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { collectionId, playlistId, position } = await req.json();
  if (!collectionId || !playlistId) {
    return NextResponse.json({ error: 'collectionId and playlistId required' }, { status: 400 });
  }

  const { error } = await serviceClient()
    .from('curated_collection_items')
    .upsert({ collection_id: collectionId, playlist_id: playlistId, position: position ?? 0 });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// PATCH — 컬렉션 필드 업데이트 (is_active, banner_image_url 등)
export async function PATCH(req: NextRequest) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { collectionId, ...fields } = await req.json();
  if (!collectionId) return NextResponse.json({ error: 'collectionId required' }, { status: 400 });

  const allowed = ['is_active', 'banner_image_url', 'title', 'description'];
  const update = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)));

  const { error } = await serviceClient()
    .from('curated_collections')
    .update(update)
    .eq('id', collectionId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — 컬렉션 삭제 or 항목 제거
export async function DELETE(req: NextRequest) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { collectionId, playlistId } = await req.json();
  if (!collectionId) return NextResponse.json({ error: 'collectionId required' }, { status: 400 });

  const service = serviceClient();

  if (playlistId) {
    // 항목만 제거
    const { error } = await service
      .from('curated_collection_items')
      .delete()
      .eq('collection_id', collectionId)
      .eq('playlist_id', playlistId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    // 컬렉션 전체 삭제 (CASCADE로 items도 삭제)
    const { error } = await service
      .from('curated_collections')
      .delete()
      .eq('id', collectionId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
