// Design Ref: §4.2 — POST /api/listens (scrobble write)
// Plan SC: SC-2 scrobble/DAU — 4min/50% 임계값 교차 시점에 useScrobble에서 호출
// Plan SC: R2 — unique partial index가 1분 내 중복 차단, 409는 silent success로 처리

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
  const track_id = typeof b.track_id === 'string' ? b.track_id : '';
  const playlist_id = typeof b.playlist_id === 'string' ? b.playlist_id : '';
  const duration_ms = typeof b.duration_ms === 'number' ? Math.floor(b.duration_ms) : NaN;

  const fieldErrors: Record<string, string> = {};
  if (!UUID_RE.test(track_id)) fieldErrors.track_id = 'UUID 형식이 아닙니다';
  if (!UUID_RE.test(playlist_id)) fieldErrors.playlist_id = 'UUID 형식이 아닙니다';
  if (!Number.isFinite(duration_ms) || duration_ms < 0) fieldErrors.duration_ms = '0 이상 정수가 필요합니다';
  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '입력 검증 실패', details: { fieldErrors } } },
      { status: 400 }
    );
  }

  // RLS가 user_id = auth.uid() 검증. 서버에서도 한 번 더 명시.
  const { data, error } = await supabase
    .from('listens')
    .insert({
      user_id: user.id,
      track_id,
      playlist_id,
      duration_ms,
    })
    .select('id, played_at')
    .single();

  if (error) {
    // Postgres unique_violation = 23505 — 1분 내 중복 (정상 동작)
    if (error.code === '23505') {
      return NextResponse.json(
        { error: { code: 'DUPLICATE_WITHIN_MINUTE', message: '최근 기록됨' } },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
