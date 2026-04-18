'use client';
// Design Ref: §4.1 — 5-section search orchestrator (videos/users/channels/artists/tags)
// Plan SC 1,5: feeds both the shared dropdown and the dedicated results page.

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Playlist } from '@/types';
import {
  GENRE_OPTIONS,
  MOOD_OPTIONS,
  PLACE_OPTIONS,
  ERA_OPTIONS,
} from '@/types';
import {
  type SearchResult,
  type SearchLimits,
  type SearchChannel,
  type SearchTag,
  type TagCategory,
  DROPDOWN_LIMITS,
} from '../types';

const EMPTY_RESULT: SearchResult = {
  videos: [],
  users: [],
  channels: [],
  artists: [],
  tags: [],
};

function escapeLike(q: string) {
  return q.replace(/[%_]/g, '\\$&');
}

type TagOption = { label: string; category: TagCategory };
const ALL_TAG_OPTIONS: TagOption[] = [
  ...GENRE_OPTIONS.map((label) => ({ label, category: 'genre' as const })),
  ...MOOD_OPTIONS.map((label) => ({ label, category: 'mood' as const })),
  ...PLACE_OPTIONS.map((label) => ({ label, category: 'place' as const })),
  ...ERA_OPTIONS.map((label) => ({ label, category: 'era' as const })),
];

async function runSearch(query: string, limits: Required<SearchLimits>): Promise<SearchResult> {
  const q = query.trim();
  if (!q) return EMPTY_RESULT;
  const escaped = escapeLike(q);
  const supabase = createClient();

  // 5 sections in parallel — each section isolated so one failure doesn't block others
  const [videosRes, usersRes, channelsRes, artistsRes, tagsRes] = await Promise.all([
    fetchVideos(supabase, escaped, limits.videos).catch(() => [] as Playlist[]),
    fetchUsers(supabase, escaped, limits.users).catch(() => [] as SearchResult['users']),
    fetchChannels(supabase, escaped, limits.channels).catch(() => [] as SearchChannel[]),
    fetchArtists(supabase, escaped, limits.artists).catch(() => [] as SearchResult['artists']),
    limits.includeTags
      ? fetchTags(supabase, q).catch(() => [] as SearchTag[])
      : Promise.resolve([] as SearchTag[]),
  ]);

  return {
    videos: videosRes,
    users: usersRes,
    channels: channelsRes,
    artists: artistsRes,
    tags: tagsRes,
  };
}

// ── Section: videos (playlists by title OR tracks by title/artist) ────────
async function fetchVideos(
  supabase: ReturnType<typeof createClient>,
  escaped: string,
  limit: number
): Promise<Playlist[]> {
  const { data: trackMatches } = await supabase
    .from('tracks')
    .select('playlist_id')
    .or(`title.ilike.%${escaped}%,artist.ilike.%${escaped}%`);

  const trackIds = [
    ...new Set((trackMatches ?? []).map((t: { playlist_id: string }) => t.playlist_id)),
  ];
  const titleFilter = `title.ilike.%${escaped}%`;
  let q = supabase.from('playlists').select('*').eq('is_active', true);
  q = trackIds.length > 0
    ? q.or(`${titleFilter},id.in.(${trackIds.join(',')})`)
    : q.or(titleFilter);
  const { data } = await q.order('like_count', { ascending: false }).limit(limit);
  return (data ?? []) as Playlist[];
}

// ── Section: users (profiles.display_name) ────────────────────────────────
async function fetchUsers(
  supabase: ReturnType<typeof createClient>,
  escaped: string,
  limit: number
) {
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, is_verified')
    .ilike('display_name', `%${escaped}%`)
    .limit(limit);
  return (data ?? []) as SearchResult['users'];
}

// ── Section: channels (playlists.channel_name distinct) ────────────────────
async function fetchChannels(
  supabase: ReturnType<typeof createClient>,
  escaped: string,
  limit: number
): Promise<SearchChannel[]> {
  const { data } = await supabase
    .from('playlists')
    .select('channel_id, channel_name, thumbnail_url')
    .eq('is_active', true)
    .ilike('channel_name', `%${escaped}%`);

  // Distinct by channel_id + count
  const map = new Map<string, SearchChannel>();
  for (const row of (data ?? []) as Array<{
    channel_id: string;
    channel_name: string;
    thumbnail_url: string | null;
  }>) {
    const prev = map.get(row.channel_id);
    if (prev) {
      prev.count += 1;
    } else {
      map.set(row.channel_id, {
        channel_id: row.channel_id,
        channel_name: row.channel_name,
        thumbnail_url: row.thumbnail_url,
        count: 1,
      });
    }
  }
  return [...map.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ── Section: artists (artists.name) ────────────────────────────────────────
async function fetchArtists(
  supabase: ReturnType<typeof createClient>,
  escaped: string,
  limit: number
) {
  const { data } = await supabase
    .from('artists')
    .select('name, slug, image_url')
    .ilike('name', `%${escaped}%`)
    .eq('not_found', false)
    .limit(limit);
  return (data ?? []) as SearchResult['artists'];
}

// ── Section: tags (constant-match + DB count per tag) ──────────────────────
async function fetchTags(
  supabase: ReturnType<typeof createClient>,
  rawQuery: string
): Promise<SearchTag[]> {
  const needle = rawQuery.toLowerCase();
  const matched = ALL_TAG_OPTIONS.filter((t) =>
    t.label.toLowerCase().includes(needle)
  );
  if (matched.length === 0) return [];

  // Count playlists per matched tag (array contains)
  const results = await Promise.all(
    matched.map(async (t) => {
      const { count } = await supabase
        .from('playlists')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .contains(t.category, [t.label]);
      return { label: t.label, category: t.category, count: count ?? 0 };
    })
  );
  return results.filter((r) => r.count > 0).sort((a, b) => b.count - a.count);
}

/**
 * React hook: run a 5-section search for the given query with configurable
 * per-section limits. Returns empty result immediately for blank queries.
 * Consumers typically wrap `query` in a debounce (e.g. `useDebouncedValue(300)`)
 * before passing it in.
 */
export function useSearch(query: string, limits: SearchLimits = {}) {
  const merged: Required<SearchLimits> = { ...DROPDOWN_LIMITS, ...limits };
  const q = query.trim();

  const queryResult = useQuery({
    queryKey: ['search', q, merged],
    queryFn: () => runSearch(q, merged),
    enabled: q.length > 0,
    staleTime: 30_000,
  });

  return {
    data: queryResult.data ?? EMPTY_RESULT,
    loading: queryResult.isFetching,
    error: queryResult.error,
  };
}
