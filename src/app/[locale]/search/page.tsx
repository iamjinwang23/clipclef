'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useFilterStore } from '@/features/filter/store';
import type { Playlist } from '@/types';

const STORAGE_KEY = 'clipclef_recent_searches';
const MAX_RECENT = 8;

function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}
function saveRecent(terms: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(terms.slice(0, MAX_RECENT)));
}

export default function SearchPage() {
  const { setQuery } = useFilterStore();
  const { locale } = useParams<{ locale: string }>();
  const [value, setValue] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [results, setResults] = useState<Playlist[]>([]);
  const [artistResults, setArtistResults] = useState<{ name: string; slug: string; image_url: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setRecent(loadRecent());
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const term = value.trim();
    if (!term) { setResults([]); setArtistResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const escaped = term.replace(/[%_]/g, '\\$&');

        const [{ data: artistData }, { data: trackMatches }] = await Promise.all([
          supabase.from('artists').select('name, slug, image_url').ilike('name', `%${escaped}%`).eq('not_found', false).limit(3),
          supabase.from('tracks').select('playlist_id').or(`title.ilike.%${escaped}%,artist.ilike.%${escaped}%`),
        ]);

        setArtistResults((artistData ?? []) as { name: string; slug: string; image_url: string | null }[]);

        const trackIds = [...new Set((trackMatches ?? []).map((t: { playlist_id: string }) => t.playlist_id))];
        let q = supabase.from('playlists').select('*').eq('is_active', true);
        const titleFilter = `title.ilike.%${escaped}%,channel_name.ilike.%${escaped}%`;
        q = trackIds.length > 0 ? q.or(`${titleFilter},id.in.(${trackIds.join(',')})`) : q.or(titleFilter);
        const { data } = await q.order('like_count', { ascending: false }).limit(10);
        setResults((data ?? []) as Playlist[]);
      } finally { setLoading(false); }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value]);

  const applySearch = (term: string) => {
    if (!term.trim()) return;
    setQuery(term.trim());
    const next = [term.trim(), ...recent.filter((r) => r !== term.trim())];
    setRecent(next);
    saveRecent(next);
  };

  const removeRecent = (term: string) => {
    const next = recent.filter((r) => r !== term);
    setRecent(next);
    saveRecent(next);
  };

  const showResults = value.trim().length > 0;

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">
      {/* 검색 입력 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
        <svg className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') applySearch(value); }}
          placeholder="플레이리스트 검색"
          className="flex-1 bg-transparent text-[var(--foreground)] text-sm focus:outline-none placeholder:text-[var(--subtle)]"
        />
        {value && (
          <button type="button" onClick={() => setValue('')} className="text-[var(--text-secondary)] hover:text-[var(--foreground)] text-lg leading-none">
            ×
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {showResults ? (
          <div className="px-4 pt-3">
            {loading && <p className="text-xs text-[var(--subtle)] mb-2">검색 중...</p>}
            {!loading && results.length === 0 && artistResults.length === 0 && (
              <p className="text-sm text-[var(--subtle)] text-center mt-8">검색 결과가 없습니다</p>
            )}

            {!loading && artistResults.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">아티스트</p>
                {artistResults.map((artist) => (
                  <Link
                    key={artist.slug}
                    href={`/${locale}/artist/${artist.slug}`}
                    onClick={() => applySearch(artist.name)}
                    className="flex items-center gap-3 py-2 hover:bg-[var(--muted)] rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[var(--muted)]">
                      {artist.image_url ? (
                        <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[var(--text-secondary)]">
                          {artist.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium text-[var(--foreground)]">{artist.name}</span>
                    <span className="ml-auto text-xs text-[var(--subtle)]">아티스트</span>
                  </Link>
                ))}
              </div>
            )}

            {results.map((playlist) => (
              <Link
                key={playlist.id}
                href={`/${locale}/playlist/${playlist.id}`}
                onClick={() => applySearch(value)}
                className="flex items-center gap-3 py-2.5 hover:bg-[var(--muted)] rounded-lg px-2 -mx-2 transition-colors"
              >
                {playlist.thumbnail_url && (
                  <div className="relative w-16 h-9 rounded-md overflow-hidden flex-shrink-0">
                    <Image src={playlist.thumbnail_url} alt="" fill className="object-cover" sizes="64px" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate text-[var(--foreground)]">{playlist.title}</p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">{playlist.channel_name}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-4 pt-4">
            {recent.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">최근 검색</span>
                  <button onClick={() => { setRecent([]); saveRecent([]); }} className="text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)]">
                    전체 삭제
                  </button>
                </div>
                <ul className="space-y-0.5">
                  {recent.map((term) => (
                    <li key={term} className="flex items-center gap-2 rounded-lg hover:bg-[var(--muted)] px-2 py-2 group">
                      <svg className="w-3.5 h-3.5 text-[var(--subtle)] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" strokeLinecap="round" />
                      </svg>
                      <button className="flex-1 text-left text-sm text-[var(--foreground)]" onClick={() => { setValue(term); applySearch(term); }}>
                        {term}
                      </button>
                      <button
                        onClick={() => removeRecent(term)}
                        className="opacity-0 group-hover:opacity-100 text-[var(--subtle)] hover:text-[var(--text-secondary)] text-base leading-none transition-opacity"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-[var(--subtle)] text-center mt-8">최근 검색어가 없습니다</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
