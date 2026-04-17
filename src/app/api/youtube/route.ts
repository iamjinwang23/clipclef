// Design Ref: §4.2 — YouTube 영상 URL 파싱 API (로그인 사용자 전체 허용)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0] || null;
  } catch {}
  const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match?.[1] ?? null;
}

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (parseInt(match[1] ?? '0') * 3600) + (parseInt(match[2] ?? '0') * 60) + parseInt(match[3] ?? '0');
}

function timestampToSeconds(ts: string): number {
  const parts = ts.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] * 60 + parts[1];
}

function extractArtist(title: string): { cleanTitle: string; artist: string | null } {
  const match = title.match(/^(.+?)\s*[-–]\s*(.+)$/);
  if (match) return { artist: match[1].trim(), cleanTitle: match[2].trim() };
  return { artist: null, cleanTitle: title };
}

function parseTracklist(description: string, totalSec: number): {
  position: number; title: string; artist: string | null;
  duration_sec: number | null; youtube_video_id: string | null;
}[] {
  const lines = description.split('\n');
  // 타임스탬프 패턴: "0:00", "00:00", "1:23:45" 로 시작하는 줄
  const tsRegex = /^(?:\d+[\.\)]\s*)?(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)/;

  const raw: { startSec: number; title: string; artist: string | null }[] = [];
  for (const line of lines) {
    const match = line.trim().match(tsRegex);
    if (match) {
      const { cleanTitle, artist } = extractArtist(match[2].trim());
      raw.push({ startSec: timestampToSeconds(match[1]), title: cleanTitle, artist });
    }
  }

  if (raw.length === 0) return [];

  return raw.map((t, i) => {
    let duration_sec: number | null;
    if (i < raw.length - 1) {
      duration_sec = raw[i + 1].startSec - t.startSec;
    } else if (totalSec > t.startSec) {
      duration_sec = totalSec - t.startSec;
    } else if (raw.length >= 2) {
      // totalSec 누락/이상 시 이전 트랙 평균 길이로 추정
      const avg = Math.round(t.startSec / (raw.length - 1));
      duration_sec = avg > 0 ? avg : null;
    } else {
      duration_sec = null;
    }
    return {
      position: i + 1,
      title: t.title,
      artist: t.artist,
      start_sec: t.startSec,
      duration_sec,
      youtube_video_id: null,
    };
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  const videoId = extractVideoId(url);
  if (!videoId) return NextResponse.json({ error: '유효한 YouTube 영상 URL이 아닙니다' }, { status: 400 });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'YouTube API not configured' }, { status: 500 });

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`
  );
  const data = await res.json();

  // YouTube API 자체 에러 (키 오류, 할당량 초과 등)
  if (data.error) {
    return NextResponse.json({ error: `YouTube API 오류: ${data.error.message}` }, { status: 502 });
  }

  const video = data.items?.[0];
  if (!video) return NextResponse.json({ error: `영상을 찾을 수 없습니다 (id: ${videoId})` }, { status: 404 });

  const totalSec = parseDuration(video.contentDetails.duration);
  const description: string = video.snippet.description ?? '';
  const tracks = parseTracklist(description, totalSec);

  return NextResponse.json({
    youtube_id: videoId,
    title: video.snippet.title,
    channel_name: video.snippet.channelTitle,
    channel_id: video.snippet.channelId,
    thumbnail_url:
      video.snippet.thumbnails?.maxres?.url ??
      video.snippet.thumbnails?.high?.url ??
      video.snippet.thumbnails?.standard?.url ??
      video.snippet.thumbnails?.default?.url ?? '',
    description: description || null,
    view_count: parseInt(video.statistics?.viewCount ?? '0', 10),
    tracks,
  });
}
