// Design Ref: §4.1 — 닉네임 중복 체크 API
// GET /api/profiles/check-name?name={displayName}&userId={currentUserId}
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const name = searchParams.get('name')?.trim();
  const userId = searchParams.get('userId');

  if (!name || !userId) {
    return NextResponse.json({ error: 'name and userId are required' }, { status: 400 });
  }

  // Plan SC: 자기 자신의 현재 닉네임으로 저장 시 허용
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('display_name', name)
    .neq('id', userId)
    .maybeSingle();

  return NextResponse.json({ available: data === null });
}
