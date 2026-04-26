import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_LOCALE, IS_PRODUCTION, LOCALES, SITE_URL } from '@/lib/seo';

// 1시간마다 재생성 (Vercel ISR)
export const revalidate = 3600;

type Entry = MetadataRoute.Sitemap[number];

function makeEntry(
  pathNoLocale: string,
  opts: { lastModified?: Date; changeFrequency?: Entry['changeFrequency']; priority?: number } = {}
): Entry {
  const path = pathNoLocale.startsWith('/') ? pathNoLocale : `/${pathNoLocale}`;
  const languages: Record<string, string> = {};
  for (const lc of LOCALES) {
    languages[lc] = `${SITE_URL}/${lc}${path === '/' ? '' : path}`;
  }
  return {
    url: `${SITE_URL}/${DEFAULT_LOCALE}${path === '/' ? '' : path}`,
    lastModified: opts.lastModified ?? new Date(),
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
    alternates: { languages },
  };
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // production 외에는 빈 sitemap (robots.ts 가 이미 disallow)
  if (!IS_PRODUCTION) return [];

  const entries: Entry[] = [];

  // 1) 정적 라우트
  entries.push(
    makeEntry('/', { changeFrequency: 'daily', priority: 1.0 }),
    makeEntry('/playlists', { changeFrequency: 'daily', priority: 0.9 }),
    makeEntry('/artists', { changeFrequency: 'daily', priority: 0.8 }),
    makeEntry('/channels', { changeFrequency: 'daily', priority: 0.7 }),
    makeEntry('/genres', { changeFrequency: 'weekly', priority: 0.7 }),
    makeEntry('/search', { changeFrequency: 'monthly', priority: 0.4 }),
    makeEntry('/terms', { changeFrequency: 'yearly', priority: 0.2 }),
    makeEntry('/privacy', { changeFrequency: 'yearly', priority: 0.2 })
  );

  const sb = adminClient();
  if (!sb) return entries;

  // 2) 플레이리스트 (활성)
  const { data: playlists } = await sb
    .from('playlists')
    .select('id, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(10000);
  for (const p of playlists ?? []) {
    entries.push(
      makeEntry(`/playlist/${p.id}`, {
        lastModified: p.created_at ? new Date(p.created_at) : undefined,
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    );
  }

  // 3) 아티스트 (캐시 성공 건만)
  const { data: artists } = await sb
    .from('artists')
    .select('slug, cached_at')
    .eq('not_found', false)
    .order('cached_at', { ascending: false })
    .limit(5000);
  for (const a of artists ?? []) {
    if (!a.slug) continue;
    entries.push(
      makeEntry(`/artist/${encodeURIComponent(a.slug)}`, {
        lastModified: a.cached_at ? new Date(a.cached_at) : undefined,
        changeFrequency: 'monthly',
        priority: 0.6,
      })
    );
  }

  // 4) 채널 (활성 플레이리스트의 distinct channel_id)
  const { data: channelRows } = await sb
    .from('playlists')
    .select('channel_id')
    .eq('is_active', true)
    .not('channel_id', 'is', null)
    .limit(20000);
  const channelIds = new Set<string>();
  for (const row of channelRows ?? []) {
    if (row.channel_id) channelIds.add(row.channel_id as string);
  }
  for (const cid of Array.from(channelIds).slice(0, 2000)) {
    entries.push(
      makeEntry(`/channel/${encodeURIComponent(cid)}`, {
        changeFrequency: 'weekly',
        priority: 0.5,
      })
    );
  }

  // 5) 컬렉션: curated (관리자 에디토리얼) + user (발행된 공개)
  const { data: curated } = await sb
    .from('curated_collections')
    .select('id, created_at')
    .eq('is_active', true)
    .limit(500);
  for (const c of curated ?? []) {
    entries.push(
      makeEntry(`/collection/${c.id}`, {
        lastModified: c.created_at ? new Date(c.created_at) : undefined,
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    );
  }

  const { data: userColl } = await sb
    .from('user_playlists')
    .select('id, published_at')
    .eq('is_public', true)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(2000);
  for (const c of userColl ?? []) {
    entries.push(
      makeEntry(`/collection/${c.id}`, {
        lastModified: c.published_at ? new Date(c.published_at) : undefined,
        changeFrequency: 'weekly',
        priority: 0.6,
      })
    );
  }

  return entries;
}
