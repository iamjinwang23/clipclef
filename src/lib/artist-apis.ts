// Design Ref: §3 — MusicBrainz + Fanart.tv + TheAudioDB + Wikipedia 클라이언트
// lastfm.ts 대체 모듈. MusicBrainz는 클라이언트/서버 양쪽 호출 가능.
// Fanart.tv / TheAudioDB / Wikipedia는 서버 전용 (API Key 또는 서버 전용 로직).

// ─── 유틸 (lastfm.ts에서 이전) ───────────────────────────────────────────────

const FEATURING_RE = /\s+(ft\.|feat\.|featuring|×|x\s|\s&\s|\s\/\s|with)\s.*/i;
const PARENS_RE = /\s+\([^)]*\)/g;
const SLUG_ALLOWED_RE = /[^\p{L}\p{N}-]/gu;
const CONSECUTIVE_HYPHEN_RE = /-{2,}/g;

/** 피처링·콜라보를 제거한 메인 아티스트명 반환 */
export function extractMainArtist(name: string): string {
  return name
    .replace(FEATURING_RE, '')
    .replace(PARENS_RE, '')
    .trim();
}


/** 아티스트명 → URL slug 변환 */
export function toArtistSlug(name: string): string {
  const main = extractMainArtist(name);
  return main
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(SLUG_ALLOWED_RE, '')
    .replace(CONSECUTIVE_HYPHEN_RE, '-')
    .replace(/^-|-$/g, '');
}

// ─── 타입 정의 ───────────────────────────────────────────────────────────────

export interface FanartImages {
  artistbackground: string | null;
  artistthumb: string | null;
  hdmusiclogo: string | null;
}

export interface TheAudioDBData {
  strArtistThumb: string | null;
  strArtistFanart: string | null;
  strBiographyEN: string | null;
}

// ─── MusicBrainz ─────────────────────────────────────────────────────────────
// Plan SC-06: 클라이언트 직접 호출 (IP 분산으로 1 req/sec 제한 우회)
// User-Agent 헤더 필수 (MusicBrainz 정책)

const MB_BASE = 'https://musicbrainz.org/ws/2';
const MB_USER_AGENT = 'ClipClef/1.0 (iamjinwang23@gmail.com)';

/**
 * 아티스트명으로 MusicBrainz MBID 검색.
 * 클라이언트·서버 양쪽에서 호출 가능.
 * @returns MBID 문자열 또는 null (미발견/에러)
 */
export async function searchMbid(name: string): Promise<string | null> {
  try {
    const url = new URL(`${MB_BASE}/artist/`);
    url.searchParams.set('query', name);
    url.searchParams.set('limit', '1');
    url.searchParams.set('fmt', 'json');

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': MB_USER_AGENT },
      next: { revalidate: 0 },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const artists: { id?: string }[] = data?.artists ?? [];
    return artists[0]?.id ?? null;
  } catch {
    return null;
  }
}

// ─── Fanart.tv ───────────────────────────────────────────────────────────────
// 서버 전용 — FANART_API_KEY 필요

/**
 * MBID로 Fanart.tv 고화질 이미지 조회.
 * @returns FanartImages 또는 null (미존재/에러)
 */
export async function fetchFanartImages(mbid: string): Promise<FanartImages | null> {
  const apiKey = process.env.FANART_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://webservice.fanart.tv/v3/music/${encodeURIComponent(mbid)}?api_key=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });

    if (!res.ok) return null;

    const data = await res.json();

    return {
      artistbackground: data?.artistbackground?.[0]?.url ?? null,
      artistthumb: data?.artistthumb?.[0]?.url ?? null,
      hdmusiclogo: data?.hdmusiclogo?.[0]?.url ?? null,
    };
  } catch {
    return null;
  }
}

// ─── TheAudioDB ──────────────────────────────────────────────────────────────
// 서버 전용 — THEAUDIODB_API_KEY (기본값 "2" 무료)

/**
 * MBID로 TheAudioDB 아티스트 정보 조회 (이미지 폴백 + EN 바이오).
 * @returns TheAudioDBData 또는 null (미존재/에러)
 */
export async function fetchTheAudioDB(mbid: string): Promise<TheAudioDBData | null> {
  const apiKey = process.env.THEAUDIODB_API_KEY ?? '2';

  try {
    const url = `https://www.theaudiodb.com/api/v1/json/${apiKey}/artist-mb.php?i=${encodeURIComponent(mbid)}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });

    if (!res.ok) return null;

    const data = await res.json();
    const artist = data?.artists?.[0];
    if (!artist) return null;

    return {
      strArtistThumb: artist.strArtistThumb ?? null,
      strArtistFanart: artist.strArtistFanart ?? null,
      strBiographyEN: artist.strBiographyEN
        ? trimBio(artist.strBiographyEN as string)
        : null,
    };
  } catch {
    return null;
  }
}

// ─── Wikipedia KO ────────────────────────────────────────────────────────────
// 서버 전용 — 인증 불필요, REST API

/**
 * 아티스트명으로 Wikipedia 한국어 요약 조회.
 * @returns extract 문자열 (최대 500자) 또는 null
 */
/**
 * MBID로 MusicBrainz URL 관계에서 Wikipedia 링크를 찾아 정확한 바이오를 반환.
 * 동명이인 disambiguation 문제를 방지.
 */
export async function fetchWikipediaBio(mbid: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${MB_BASE}/artist/${mbid}?inc=url-rels&fmt=json`,
      { headers: { 'User-Agent': MB_USER_AGENT }, next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const relations: { type: string; url: { resource: string } }[] = data?.relations ?? [];

    const wikiRel = relations.find(
      (r) => r.type === 'wikipedia' && r.url?.resource?.includes('wikipedia.org')
    );
    if (!wikiRel) return null;

    const wikiUrl = wikiRel.url.resource;
    const match = wikiUrl.match(/(\w+)\.wikipedia\.org\/wiki\/(.+)/);
    if (!match) return null;

    const [, lang, title] = match;
    const summaryRes = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${title}`,
      { next: { revalidate: 86400 } }
    );
    if (!summaryRes.ok) return null;

    const summary = await summaryRes.json();
    return summary?.extract ? trimBio(summary.extract) : null;
  } catch {
    return null;
  }
}

// ─── 폴백 헬퍼 ───────────────────────────────────────────────────────────────

function trimBio(text: string, maxLen = 500): string {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + '…';
}
// Design Ref: §3.5 — 이미지·바이오 폴백 체인

/**
 * 이미지 폴백 체인:
 * Fanart.tv background → Fanart.tv thumb → TheAudioDB thumb → TheAudioDB fanart → null
 */
export function resolveImage(
  fanart: FanartImages | null,
  audiodb: TheAudioDBData | null
): string | null {
  return (
    fanart?.artistbackground ??
    fanart?.artistthumb ??
    audiodb?.strArtistThumb ??
    audiodb?.strArtistFanart ??
    null
  );
}

/**
 * 바이오 폴백 체인:
 * Wikipedia KO → TheAudioDB EN → null
 */
export function resolveBio(
  wikipediaKo: string | null,
  audiodbEn: string | null
): string | null {
  return wikipediaKo ?? audiodbEn ?? null;
}
