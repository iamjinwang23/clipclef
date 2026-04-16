// Design Ref: §4 — GET /api/artists/[slug]
// Plan SC-06: MusicBrainz MBID는 클라이언트(ArtistStrip)에서 전달받음 → 서버 IP 고정 우회
// mbid 없으면 artist.server.ts 내부에서 MusicBrainz 폴백 호출

import { NextRequest, NextResponse } from 'next/server';
import { fetchArtistWithCache } from '@/features/artist/lib/artist.server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const nameParam = req.nextUrl.searchParams.get('name');
  const mbidParam = req.nextUrl.searchParams.get('mbid');

  const artistName = nameParam?.trim() || slug.replace(/-/g, ' ');

  try {
    const artist = await fetchArtistWithCache(slug, artistName, mbidParam ?? null);

    if (!artist) {
      return NextResponse.json({ not_found: true });
    }

    return NextResponse.json(artist);
  } catch {
    return NextResponse.json({ not_found: true }, { status: 500 });
  }
}
