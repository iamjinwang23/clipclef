// Design Ref: §4.2 — GET /api/listens/recent
// 홈 § 1 이어듣기 섹션 + /me/library 진입 데이터 소스
// RPC recent_playlists_for_user(limit)가 auth.uid() 내부 사용 → 본인 기록만 반환

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const limitParam = url.searchParams.get('limit');
  const parsed = limitParam ? Number(limitParam) : 5;
  const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 50) : 5;

  const { data: rows, error: rpcError } = await supabase.rpc(
    'recent_playlists_for_user',
    { p_limit: limit }
  );

  if (rpcError) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: rpcError.message } },
      { status: 500 }
    );
  }

  const recents = (rows ?? []) as Array<{ playlist_id: string; last_played_at: string }>;
  if (recents.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const ids = recents.map((r) => r.playlist_id);
  const { data: playlists, error: plError } = await supabase
    .from('playlists')
    .select('*')
    .in('id', ids);

  if (plError) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: plError.message } },
      { status: 500 }
    );
  }

  // RPC 순서 유지 (FIFO) — recents 순서대로 playlists를 join
  const byId = new Map((playlists ?? []).map((p) => [p.id as string, p]));
  const data = recents
    .map((r) => ({
      playlist_id: r.playlist_id,
      last_played_at: r.last_played_at,
      playlist: byId.get(r.playlist_id) ?? null,
    }))
    .filter((r) => r.playlist !== null);

  return NextResponse.json({ data });
}
