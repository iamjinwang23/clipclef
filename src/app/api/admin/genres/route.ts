// Design Ref: home-redesign.design.md §4.2 — admin CRUD for genres
// Pattern mirrors /api/admin/collections: service role + email-based assertAdmin

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

// GET — admin 전체 목록 (active 여부 무관하게 반환, position 오름차순)
export async function GET() {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const service = serviceClient();
  const { data, error } = await service
    .from('genres')
    .select('*')
    .order('position', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST — 신규 장르 생성  { name, position? }
export async function POST(req: NextRequest) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = await req.json();
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const service = serviceClient();
  // 새 장르는 position을 기존 max+1 로 기본 배치
  const { data: maxRow } = await service
    .from('genres')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPos =
    typeof body?.position === 'number'
      ? body.position
      : ((maxRow?.position ?? 0) + 1);

  const { data, error } = await service
    .from('genres')
    .insert({ name, position: nextPos })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH — 업데이트  ?id=... + { name?, thumbnail_url?, position?, is_active? }
export async function PATCH(req: NextRequest) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const body = await req.json();
  const patch: Record<string, unknown> = {};
  if (typeof body?.name === 'string') patch.name = body.name.trim();
  if (body?.thumbnail_url === null || typeof body?.thumbnail_url === 'string') {
    patch.thumbnail_url = body.thumbnail_url;
  }
  if (typeof body?.position === 'number') patch.position = body.position;
  if (typeof body?.is_active === 'boolean') patch.is_active = body.is_active;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
  }

  const service = serviceClient();
  const { data, error } = await service
    .from('genres')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE — ?id=...
export async function DELETE(req: NextRequest) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const service = serviceClient();
  const { error } = await service.from('genres').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
