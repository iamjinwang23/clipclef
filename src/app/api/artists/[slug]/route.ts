// Design Ref: §4 — GET /api/artists/[slug]
// Plan SC-06: MusicBrainz MBID는 클라이언트(ArtistStrip)에서 전달받음 → 서버 IP 고정 우회
// mbid 없으면 artist.server.ts 내부에서 MusicBrainz 폴백 호출

import { NextRequest, NextResponse } from 'next/server';
import { fetchArtistWithCache } from '@/features/artist/lib/artist.server';

// 단순 in-memory rate limiter — 프로세스 재시작 시 초기화됨
// Critical fix: 공개 엔드포인트가 외부 API + service_role upsert를 무제한 트리거하는 문제 방지
const ipHits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;      // 윈도우당 최대 요청
const RATE_WINDOW_MS = 60_000; // 1분

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

// slug 유효성: 영숫자·한글·하이픈만 허용, 100자 이하
const VALID_SLUG_RE = /^[\p{L}\p{N}-]{1,100}$/u;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });
  }

  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);

  if (!VALID_SLUG_RE.test(slug)) {
    return NextResponse.json({ error: 'INVALID_SLUG' }, { status: 400 });
  }

  const nameParam = req.nextUrl.searchParams.get('name');
  const mbidParam = req.nextUrl.searchParams.get('mbid');

  // mbid가 있을 경우 uuid 형식 검증 (클라이언트 주입 방지)
  if (mbidParam && !/^[0-9a-f-]{36}$/.test(mbidParam)) {
    return NextResponse.json({ error: 'INVALID_MBID' }, { status: 400 });
  }

  const artistName = nameParam?.trim() || slug.replace(/-/g, ' ');

  try {
    const artist = await fetchArtistWithCache(slug, artistName, mbidParam ?? null);

    if (!artist) {
      return NextResponse.json({ not_found: true });
    }

    return NextResponse.json(artist);
  } catch (err) {
    console.error('[/api/artists] fetchArtistWithCache error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
