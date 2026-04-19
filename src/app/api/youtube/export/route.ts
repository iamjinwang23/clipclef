import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

async function getValidToken(userId: string): Promise<string | null> {
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: row } = await service
    .from('user_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single();

  if (!row) return null;

  // 만료 여부 확인 (60초 여유)
  const isExpired = row.expires_at
    ? new Date(row.expires_at).getTime() - 60_000 < Date.now()
    : false;

  if (!isExpired) return row.access_token;

  // refresh_token으로 갱신
  if (!row.refresh_token) return null;

  const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: row.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!refreshRes.ok) return null;

  const refreshed = await refreshRes.json();
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await service.from('user_tokens').update({
    access_token: refreshed.access_token,
    expires_at: newExpiresAt,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId);

  return refreshed.access_token as string;
}

async function createYouTubePlaylist(token: string, title: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet,status', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      snippet: { title, description: 'ClipClef에서 내보낸 플레이리스트' },
      status: { privacyStatus: 'public' },
    }),
  });
  if (res.status === 401 || res.status === 403) throw new Error('youtube_not_connected');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `YouTube API error: ${res.status}`);
  }
  const data = await res.json();
  return data.id as string;
}

async function addVideoToPlaylist(token: string, playlistId: string, videoId: string): Promise<void> {
  await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      snippet: { playlistId, resourceId: { kind: 'youtube#video', videoId } },
    }),
  });
  // 삭제된 영상 등 개별 실패는 무시
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = await getValidToken(user.id);
  if (!token) {
    return NextResponse.json({ error: 'youtube_not_connected' }, { status: 401 });
  }

  const { userPlaylistId, name } = await req.json();
  if (!userPlaylistId || !name) {
    return NextResponse.json({ error: 'userPlaylistId and name required' }, { status: 400 });
  }

  // 소유권 확인
  const { data: pl } = await supabase
    .from('user_playlists')
    .select('id')
    .eq('id', userPlaylistId)
    .eq('user_id', user.id)
    .single();
  if (!pl) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // 항목의 youtube_id 수집
  const { data: rawItems } = await supabase
    .from('user_playlist_items')
    .select('playlists(youtube_id)')
    .eq('user_playlist_id', userPlaylistId)
    .order('position');

  const youtubeIds = ((rawItems ?? []) as unknown as { playlists: { youtube_id: string } | null }[])
    .map((r) => r.playlists?.youtube_id)
    .filter(Boolean) as string[];

  if (youtubeIds.length === 0) {
    return NextResponse.json({ error: '내보낼 영상이 없습니다' }, { status: 400 });
  }

  try {
    const ytPlaylistId = await createYouTubePlaylist(token, name);
    for (const videoId of youtubeIds) {
      await addVideoToPlaylist(token, ytPlaylistId, videoId);
    }
    return NextResponse.json({ url: `https://www.youtube.com/playlist?list=${ytPlaylistId}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'youtube_not_connected') {
      return NextResponse.json({ error: 'youtube_not_connected' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
