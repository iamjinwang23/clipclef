// Design Ref: §4.2 — POST /api/user-playlists/publish (F5 발행)
// Plan SC: SC-3 publish rate — 저장한 플리 3+ 묶어서 컬렉션 발행
// Letterboxd 방식: published_at=NOW(), 향후 수정·삭제 모두 가능

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_BODY', message: '잘못된 요청 본문' } },
      { status: 400 }
    );
  }

  const b = body as Record<string, unknown>;
  const title = typeof b.title === 'string' ? b.title.trim() : '';
  const caption = typeof b.caption === 'string' ? b.caption.trim() : null;
  const cover_url = typeof b.cover_url === 'string' && b.cover_url ? b.cover_url : null;
  const playlist_ids = Array.isArray(b.playlist_ids)
    ? (b.playlist_ids.filter((x) => typeof x === 'string') as string[])
    : [];

  const fieldErrors: Record<string, string> = {};
  if (title.length < 1 || title.length > 100) fieldErrors.title = '제목은 1-100자';
  if (caption !== null && caption.length > 140) fieldErrors.caption = '카피는 140자 이하';
  if (playlist_ids.length < 1) fieldErrors.playlist_ids = '최소 1개 이상 선택';
  if (playlist_ids.length > 20) fieldErrors.playlist_ids = '최대 20개까지';
  if (playlist_ids.some((id) => !UUID_RE.test(id))) fieldErrors.playlist_ids = 'UUID 형식 오류';
  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '입력 검증 실패', details: { fieldErrors } } },
      { status: 400 }
    );
  }

  // 1) user_playlists 생성 (published_at=NOW) — 발행 상태로 시작
  const { data: created, error: createErr } = await supabase
    .from('user_playlists')
    .insert({
      user_id: user.id,
      name: title,
      caption: caption || null,
      cover_url,
      is_public: true,
      is_default: false,
      published_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (createErr || !created) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: createErr?.message ?? '생성 실패' } },
      { status: 500 }
    );
  }

  // 2) user_playlist_items 일괄 insert (position 순서 보존)
  const items = playlist_ids.map((pid, i) => ({
    user_playlist_id: created.id as string,
    playlist_id: pid,
    position: i,
  }));
  const { error: itemsErr } = await supabase.from('user_playlist_items').insert(items);

  if (itemsErr) {
    // 롤백: 생성한 user_playlist 삭제 (CASCADE로 items도 정리)
    await supabase.from('user_playlists').delete().eq('id', created.id);
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: itemsErr.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: created }, { status: 201 });
}
