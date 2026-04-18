// Design Ref: §4 — 플레이리스트 소유자 수정/삭제 API (PATCH/DELETE)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Plan SC: 다른 사용자가 직접 API 호출 시 403 반환
async function assertOwner(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), supabase: null };

  const { data: playlist } = await supabase
    .from('playlists')
    .select('uploaded_by')
    .eq('id', id)
    .single();

  if (!playlist || playlist.uploaded_by !== user.id) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), supabase: null };
  }

  return { error: null, supabase };
}

// PATCH — 에디터노트·태그 업데이트 + 트랙 수정
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, supabase } = await assertOwner(id);
  if (error) return error;

  const body = await req.json();
  const { editor_note, genre, mood, place, era, tracks } = body;

  // 플레이리스트 필드 업데이트
  const updateFields: Record<string, unknown> = {};
  if (editor_note !== undefined) updateFields.editor_note = editor_note;
  if (genre !== undefined) updateFields.genre = genre;
  if (mood !== undefined) updateFields.mood = mood;
  if (place !== undefined) updateFields.place = place;
  if (era !== undefined) updateFields.era = era;

  if (Object.keys(updateFields).length > 0) {
    const { error: updateErr } = await supabase!
      .from('playlists')
      .update(updateFields)
      .eq('id', id);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // 트랙 수정: 제출된 배열 기준으로 추가/수정/삭제
  if (Array.isArray(tracks)) {
    // 기존 트랙 ID 조회
    const { data: existing } = await supabase!
      .from('tracks')
      .select('id')
      .eq('playlist_id', id);

    const existingIds = (existing ?? []).map((t: { id: string }) => t.id);
    const submittedIds = tracks.map((t: { id: string }) => t.id);

    // 제출에서 빠진 트랙 → 삭제
    const toDelete = existingIds.filter((eid: string) => !submittedIds.includes(eid));
    if (toDelete.length > 0) {
      await supabase!.from('tracks').delete().in('id', toDelete);
    }

    // 제출된 트랙 → 업데이트 (title, artist, start_sec, duration_sec)
    for (const track of tracks) {
      await supabase!
        .from('tracks')
        .update({
          title: track.title,
          artist: track.artist ?? null,
          start_sec: track.start_sec ?? null,
          duration_sec: track.duration_sec ?? null,
        })
        .eq('id', track.id)
        .eq('playlist_id', id); // 보안: 해당 플레이리스트의 트랙만 수정
    }
  }

  return NextResponse.json({ ok: true });
}

// DELETE — 플레이리스트 + 연관 데이터 하드 삭제
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, supabase } = await assertOwner(id);
  if (error) return error;

  // Design Ref: §4.3 — cascade 삭제 순서 (FK 제약 고려)
  await supabase!.from('tracks').delete().eq('playlist_id', id);
  await supabase!.from('user_playlist_items').delete().eq('playlist_id', id);
  await supabase!.from('likes').delete().eq('playlist_id', id);
  await supabase!.from('comments').delete().eq('playlist_id', id);

  const { error: delErr } = await supabase!
    .from('playlists')
    .delete()
    .eq('id', id);

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
