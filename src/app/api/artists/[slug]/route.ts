// Design Ref: §4.1 — GET /api/artists/[slug]
// 캐시 확인 → stale이면 Last.fm 재조회 → 응답
// Plan SC: 서버 컴포넌트에서만 Last.fm 직접 호출 (API Key 노출 방지)

import { NextRequest, NextResponse } from 'next/server';
import { fetchArtistWithCache } from '@/features/artist/lib/artist.server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // name 쿼리 파라미터: ArtistStrip이 원본 아티스트명을 전달 (더 정확한 Last.fm 검색)
  // 없으면 slug에서 복원 (하이픈 → 공백)
  const nameParam = req.nextUrl.searchParams.get('name');
  const artistName = nameParam?.trim() || slug.replace(/-/g, ' ');

  try {
    const artist = await fetchArtistWithCache(slug, artistName);

    if (!artist) {
      return NextResponse.json({ not_found: true });
    }

    return NextResponse.json(artist);
  } catch {
    return NextResponse.json({ not_found: true }, { status: 500 });
  }
}
