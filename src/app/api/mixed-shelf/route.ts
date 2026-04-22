// Design Ref: §4.2 — GET /api/mixed-shelf (F6)
// RPC mixed_shelf(limit)로 curated + published user_playlists 혼합,
// user 소스 항목에 creator 프로필 join + cover fallback 처리

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 공개 RPC이므로 service role 불필요 — anon key로 RPC 호출 (GRANT TO anon, authenticated)
function publicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export interface MixedShelfItem {
  source: 'curated' | 'user';
  id: string;
  title: string;
  cover_url: string | null;
  caption: string | null;
  published_at: string;
  creator: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
  } | null;
}

interface RpcRow {
  source: 'curated' | 'user';
  id: string;
  title: string;
  cover_url: string | null;
  caption: string | null;
  creator_id: string | null;
  published_at: string;
}

export async function GET(req: NextRequest) {
  const supabase = publicClient();

  const url = new URL(req.url);
  const limitParam = url.searchParams.get('limit');
  const parsed = limitParam ? Number(limitParam) : 20;
  const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 50) : 20;

  const { data: rpcRows, error: rpcErr } = await supabase.rpc('mixed_shelf', {
    p_limit: limit,
  });

  if (rpcErr) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: rpcErr.message } },
      { status: 500 }
    );
  }

  const rows = (rpcRows ?? []) as RpcRow[];
  if (rows.length === 0) {
    return NextResponse.json({ data: [] });
  }

  // 1) user 소스 creator 프로필 일괄 조회
  const creatorIds = Array.from(
    new Set(rows.filter((r) => r.source === 'user' && r.creator_id).map((r) => r.creator_id as string))
  );

  let profileMap = new Map<string, MixedShelfItem['creator']>();
  if (creatorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, is_verified')
      .in('id', creatorIds);
    profileMap = new Map(
      (profiles ?? []).map((p) => [p.id as string, p as NonNullable<MixedShelfItem['creator']>])
    );
  }

  // 2) user 소스의 cover_url null fallback — 첫 user_playlist_item의 playlists.thumbnail_url
  const userRowsWithoutCover = rows.filter((r) => r.source === 'user' && !r.cover_url);
  const fallbackMap = new Map<string, string>();
  if (userRowsWithoutCover.length > 0) {
    const userIds = userRowsWithoutCover.map((r) => r.id);
    const { data: firstItems } = await supabase
      .from('user_playlist_items')
      .select('user_playlist_id, position, playlists(thumbnail_url)')
      .in('user_playlist_id', userIds)
      .order('position', { ascending: true });
    type Row = { user_playlist_id: string; playlists: { thumbnail_url: string } | null };
    for (const row of ((firstItems ?? []) as unknown as Row[])) {
      if (!fallbackMap.has(row.user_playlist_id) && row.playlists?.thumbnail_url) {
        fallbackMap.set(row.user_playlist_id, row.playlists.thumbnail_url);
      }
    }
  }

  const data: MixedShelfItem[] = rows.map((r) => ({
    source: r.source,
    id: r.id,
    title: r.title,
    cover_url: r.cover_url ?? (r.source === 'user' ? fallbackMap.get(r.id) ?? null : null),
    caption: r.caption,
    published_at: r.published_at,
    creator: r.source === 'user' && r.creator_id ? profileMap.get(r.creator_id) ?? null : null,
  }));

  return NextResponse.json(
    { data },
    {
      headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=120' },
    }
  );
}
