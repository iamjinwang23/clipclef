// Design Ref: §3, §4 — Last.fm(bio/listeners) + Deezer(이미지) 아티스트 정보
// 서버 전용 — LASTFM_API_KEY 노출 방지 (클라이언트에서 직접 호출 금지)
// 주의: Last.fm은 2019년부터 API에서 아티스트 이미지를 제거함 → Deezer API로 대체

const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0/';
const DEEZER_SEARCH = 'https://api.deezer.com/search/artist';

const FEATURING_RE = /\s+(ft\.|feat\.|featuring|×|x\s|\s&\s|\s\/\s|with)\s.*/i;
const PARENS_RE = /\s*\([^)]*\)/g;
const SLUG_ALLOWED_RE = /[^a-z0-9-]/g;
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

export interface LastFmArtistData {
  name: string;
  imageUrl: string | null;
  bioSummary: string | null;
  listeners: number | null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/** Deezer API에서 아티스트 이미지 조회 (인증 불필요) */
async function fetchArtistImageFromDeezer(name: string): Promise<string | null> {
  try {
    const url = new URL(DEEZER_SEARCH);
    url.searchParams.set('q', name);
    url.searchParams.set('limit', '1');

    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!res.ok) return null;

    const data = await res.json();
    const first = data?.data?.[0];
    // picture_xl (1000x1000) 우선, 없으면 picture_big (500x500)
    return first?.picture_xl ?? first?.picture_big ?? null;
  } catch {
    return null;
  }
}

/** Last.fm(bio·listeners) + Deezer(이미지)를 병렬로 조합하여 반환 */
export async function fetchArtistFromLastFm(
  name: string
): Promise<LastFmArtistData | null> {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) return null;

  try {
    const lfUrl = new URL(LASTFM_BASE);
    lfUrl.searchParams.set('method', 'artist.getinfo');
    lfUrl.searchParams.set('artist', name);
    lfUrl.searchParams.set('api_key', apiKey);
    lfUrl.searchParams.set('format', 'json');

    // Last.fm과 Deezer 병렬 요청
    const [lfRes, imageUrl] = await Promise.all([
      fetch(lfUrl.toString(), { next: { revalidate: 0 } }),
      fetchArtistImageFromDeezer(name),
    ]);

    if (!lfRes.ok) return null;

    const data = await lfRes.json();
    if (data.error || !data.artist) return null;

    const artist = data.artist;
    const rawBio: string = artist.bio?.summary ?? '';
    const bioSummary = rawBio ? stripHtml(rawBio).slice(0, 500) : null;
    const listenersRaw = artist.stats?.listeners
      ? parseInt(artist.stats.listeners, 10)
      : null;

    return {
      name: artist.name ?? name,
      imageUrl,                                           // Deezer 이미지
      bioSummary: bioSummary || null,
      listeners: listenersRaw !== null && !isNaN(listenersRaw) ? listenersRaw : null,
    };
  } catch {
    return null;
  }
}
