// YouTube 채널 썸네일 조회 (채널 ID 목록 → 프로필 이미지 URL)
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get('ids');
  if (!ids) return NextResponse.json({ error: 'ids required' }, { status: 400 });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return NextResponse.json({}, { status: 200 }); // API 없으면 빈 결과

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${ids}&key=${apiKey}&maxResults=50`
  );
  const data = await res.json();

  if (!data.items) return NextResponse.json({});

  const result: Record<string, string> = {};
  for (const item of data.items) {
    const thumb =
      item.snippet?.thumbnails?.medium?.url ??
      item.snippet?.thumbnails?.default?.url ?? '';
    if (thumb) result[item.id] = thumb;
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
