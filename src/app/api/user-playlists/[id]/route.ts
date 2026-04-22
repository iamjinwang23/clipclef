// Design Ref: §4.2 — PATCH/DELETE /api/user-playlists/[id] (Letterboxd 방식)
// FR-09: 발행 후에도 수정·삭제 모두 가능 (소유자만)

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireOwner(id: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'UNAUTHORIZED' as const, supabase, user: null };

  const { data: own } = await supabase
    .from('user_playlists')
    .select('id, user_id, is_default')
    .eq('id', id)
    .single();
  if (!own) return { error: 'NOT_FOUND' as const, supabase, user };
  if (own.user_id !== user.id) return { error: 'FORBIDDEN' as const, supabase, user };
  if (own.is_default) return { error: 'DEFAULT_IMMUTABLE' as const, supabase, user };
  return { error: null, supabase, user, own };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { error: { code: 'INVALID_ID', message: 'UUID 형식 오류' } },
      { status: 400 }
    );
  }

  const check = await requireOwner(id);
  if (check.error === 'UNAUTHORIZED') {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }
  if (check.error === 'NOT_FOUND') {
    return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  }
  if (check.error === 'FORBIDDEN') {
    return NextResponse.json({ error: { code: 'FORBIDDEN' } }, { status: 403 });
  }
  if (check.error === 'DEFAULT_IMMUTABLE') {
    return NextResponse.json(
      { error: { code: 'DEFAULT_IMMUTABLE', message: '기본 저장함은 수정할 수 없습니다' } },
      { status: 400 }
    );
  }
  const { supabase } = check;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_BODY' } }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const update: Record<string, unknown> = {};

  if (typeof b.title === 'string') {
    const title = b.title.trim();
    if (title.length < 1 || title.length > 100) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', details: { fieldErrors: { title: '1-100자' } } } },
        { status: 400 }
      );
    }
    update.name = title;
  }
  if (b.caption === null || typeof b.caption === 'string') {
    const caption = b.caption === null ? null : (b.caption as string).trim();
    if (caption !== null && caption.length > 140) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', details: { fieldErrors: { caption: '140자 이하' } } } },
        { status: 400 }
      );
    }
    update.caption = caption;
  }
  if (b.cover_url === null || typeof b.cover_url === 'string') {
    update.cover_url = b.cover_url === '' ? null : (b.cover_url as string | null);
  }

  // 항목 교체 옵션
  const playlist_ids = Array.isArray(b.playlist_ids)
    ? (b.playlist_ids.filter((x) => typeof x === 'string') as string[])
    : null;
  if (playlist_ids !== null) {
    if (playlist_ids.length < 1 || playlist_ids.length > 20) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', details: { fieldErrors: { playlist_ids: '1-20개' } } } },
        { status: 400 }
      );
    }
    if (playlist_ids.some((x) => !UUID_RE.test(x))) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', details: { fieldErrors: { playlist_ids: 'UUID 형식' } } } },
        { status: 400 }
      );
    }
  }

  // 필드 업데이트
  if (Object.keys(update).length > 0) {
    const { error: updErr } = await supabase
      .from('user_playlists')
      .update(update)
      .eq('id', id);
    if (updErr) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: updErr.message } },
        { status: 500 }
      );
    }
  }

  // 항목 교체
  if (playlist_ids) {
    await supabase.from('user_playlist_items').delete().eq('user_playlist_id', id);
    const newItems = playlist_ids.map((pid, i) => ({
      user_playlist_id: id,
      playlist_id: pid,
      position: i,
    }));
    const { error: insErr } = await supabase.from('user_playlist_items').insert(newItems);
    if (insErr) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: insErr.message } },
        { status: 500 }
      );
    }
  }

  const { data: updated } = await supabase
    .from('user_playlists')
    .select('*')
    .eq('id', id)
    .single();

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { error: { code: 'INVALID_ID' } },
      { status: 400 }
    );
  }

  const check = await requireOwner(id);
  if (check.error === 'UNAUTHORIZED') {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }
  if (check.error === 'NOT_FOUND') {
    return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  }
  if (check.error === 'FORBIDDEN') {
    return NextResponse.json({ error: { code: 'FORBIDDEN' } }, { status: 403 });
  }
  if (check.error === 'DEFAULT_IMMUTABLE') {
    return NextResponse.json(
      { error: { code: 'DEFAULT_IMMUTABLE' } },
      { status: 400 }
    );
  }

  const { supabase } = check;
  // CASCADE FK가 user_playlist_items도 자동 정리
  const { error } = await supabase.from('user_playlists').delete().eq('id', id);
  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
