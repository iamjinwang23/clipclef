'use client';
// Design Ref: §5.3 — Header: 로고, 검색창(가운데), 프로필 드롭다운
// mobile: 검색창 숨김 → 검색 아이콘, +만들기 → 아이콘

import Link from 'next/link';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useFilterStore } from '@/features/filter/store';
import UserAvatar from '@/components/ui/UserAvatar';
import NotificationBell from '@/features/notification/components/NotificationBell';
import { isInAppBrowser } from '@/lib/browser';
import type { Playlist } from '@/types';

// ─── 최근 검색어 localStorage 유틸 ───────────────────────────────────────────
const STORAGE_KEY = 'clipclef_recent_searches';
const MAX_RECENT = 8;

function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}
function saveRecent(terms: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(terms.slice(0, MAX_RECENT)));
}

// ─── 데스크톱 검색바 (드롭다운 포함) ─────────────────────────────────────────
function DesktopSearchBar() {
  const locale = useLocale();
  const { query, setQuery } = useFilterStore();
  const [value, setValue] = useState(query);
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [results, setResults] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 외부 query 변경 동기화 (예: 모바일 검색 후)
  useEffect(() => { setValue(query); }, [query]);

  // 포커스 시 최근 검색어 로드
  useEffect(() => {
    if (focused) setRecent(loadRecent());
  }, [focused]);

  // 실시간 검색 (debounce 300ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const term = value.trim();
    if (!term || !focused) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const escaped = term.replace(/[%_]/g, '\\$&');
        const { data: trackMatches } = await supabase
          .from('tracks').select('playlist_id')
          .or(`title.ilike.%${escaped}%,artist.ilike.%${escaped}%`);
        const trackIds = [...new Set((trackMatches ?? []).map((t: { playlist_id: string }) => t.playlist_id))];
        let q = supabase.from('playlists').select('*').eq('is_active', true);
        const titleFilter = `title.ilike.%${escaped}%,channel_name.ilike.%${escaped}%`;
        if (trackIds.length > 0) q = q.or(`${titleFilter},id.in.(${trackIds.join(',')})`);
        else q = q.or(titleFilter);
        const { data } = await q.order('like_count', { ascending: false }).limit(6);
        setResults((data ?? []) as Playlist[]);
      } finally { setLoading(false); }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, focused]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const applySearch = (term: string) => {
    if (!term.trim()) return;
    setQuery(term.trim());
    setValue(term.trim());
    const next = [term.trim(), ...recent.filter((r) => r !== term.trim())];
    setRecent(next);
    saveRecent(next);
    setFocused(false);
  };

  const removeRecent = (term: string) => {
    const next = recent.filter((r) => r !== term);
    setRecent(next);
    saveRecent(next);
  };

  const clearAll = () => { setRecent([]); saveRecent([]); };

  const showResults = value.trim().length > 0;
  const showDropdown = focused && (showResults || recent.length > 0);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* 검색 입력 */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none"
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applySearch(value);
            if (e.key === 'Escape') setFocused(false);
          }}
          placeholder="검색"
          className="w-full pl-9 pr-8 py-1.5 text-sm rounded-full bg-[var(--muted)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--subtle)] placeholder:text-[var(--text-secondary)]"
        />
        {value && (
          <button
            onClick={() => { setValue(''); setQuery(''); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--foreground)]"
          >
            ×
          </button>
        )}
      </div>

      {/* 드롭다운 */}
      {showDropdown && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto">
          {showResults ? (
            /* 실시간 검색 결과 */
            <div className="p-2">
              {loading && <p className="text-xs text-[var(--subtle)] px-2 py-1.5">검색 중...</p>}
              {!loading && results.length === 0 && (
                <p className="text-sm text-[var(--subtle)] text-center py-4">검색 결과가 없습니다</p>
              )}
              {results.map((playlist) => (
                <Link
                  key={playlist.id}
                  href={`/${locale}/playlist/${playlist.id}`}
                  onClick={() => applySearch(value)}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
                >
                  {playlist.thumbnail_url && (
                    <div className="relative w-14 h-8 rounded overflow-hidden flex-shrink-0">
                      <Image src={playlist.thumbnail_url} alt="" fill className="object-cover" sizes="56px" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate text-[var(--foreground)]">{playlist.title}</p>
                    <p className="text-xs text-[var(--text-secondary)] truncate">{playlist.channel_name}</p>
                  </div>
                </Link>
              ))}
              {results.length > 0 && (
                <button
                  onClick={() => applySearch(value)}
                  className="w-full text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] py-2.5 text-center border-t border-[var(--border)] mt-1"
                >
                  &apos;{value}&apos; 전체 결과 보기 →
                </button>
              )}
            </div>
          ) : (
            /* 최근 검색어 */
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">최근 검색</span>
                <button onClick={clearAll} className="text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)]">
                  전체 삭제
                </button>
              </div>
              <ul className="space-y-0.5">
                {recent.map((term) => (
                  <li key={term} className="flex items-center gap-2 rounded-lg hover:bg-[var(--muted)] px-2 py-1.5 group">
                    <svg className="w-3.5 h-3.5 text-[var(--subtle)] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" strokeLinecap="round" />
                    </svg>
                    <button className="flex-1 text-left text-sm text-[var(--foreground)]" onClick={() => applySearch(term)}>
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────
export default function Header() {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const isTabRoot = [
    `/${locale}`,
    `/${locale}/`,
    `/${locale}/search`,
    `/${locale}/upload`,
    `/${locale}/me/notifications`,
    `/${locale}/me/profile`,
  ].includes(pathname);

  const [user, setUser] = useState<User | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Design Ref: §5.4 — profiles.avatar_url 우선, fallback은 OAuth 메타데이터
  useEffect(() => {
    if (!user) { setProfileAvatarUrl(undefined); return; }
    supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setProfileAvatarUrl(data?.avatar_url ?? undefined));
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogin = async () => {
    if (isInAppBrowser()) {
      alert('앱 내 브라우저에서는 Google 로그인이 지원되지 않습니다.\nSafari 또는 Chrome에서 접속해 주세요.');
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  };

  const handleLogout = async () => {
    setOpen(false);
    await supabase.auth.signOut();
    router.push(`/${locale}`);
    router.refresh();
  };

  const avatarUrl = profileAvatarUrl ?? (user?.user_metadata?.avatar_url as string | undefined);
  const displayName = user?.user_metadata?.full_name as string | undefined;

  return (
    <>
      <header className="sticky top-0 z-40 bg-[var(--background)]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center">
          {/* 좌측: 뒤로가기(모바일 depth2+) + 로고 */}
          <div className="flex-1 flex items-center gap-1">
            {!isTabRoot && (
              <button
                onClick={() => router.back()}
                className="sm:hidden p-1 -ml-1 text-[var(--foreground)]"
                aria-label="뒤로가기"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <Link href={`/${locale}`} className="flex items-center flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="ClipClef" className="hidden sm:block h-6 w-auto" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mobile_logo.svg" alt="ClipClef" className="sm:hidden h-6 w-auto" />
            </Link>
          </div>

          {/* 가운데: 검색창 (데스크톱 전용) */}
          <div className="hidden sm:block w-80">
            <DesktopSearchBar />
          </div>

          {/* 우측: 액션 */}
          <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3">
            {user ? (
              <>
                {/* +만들기 — 데스크톱 전용 */}
                <Link
                  href={`/${locale}/upload`}
                  className="hidden sm:flex items-center text-sm font-medium px-3 py-1.5 rounded-full bg-white text-black hover:bg-white/90 transition-colors flex-shrink-0"
                >
                  + 만들기
                </Link>

                {/* 알림 벨 — 데스크톱 전용 */}
                <span className="hidden sm:block">
                  <NotificationBell userId={user.id} locale={locale} />
                </span>

                {/* 프로필 드롭다운 — 데스크톱 전용 */}
                <div ref={dropdownRef} className="relative hidden sm:block">
                  <button
                    onClick={() => setOpen((v) => !v)}
                    className="rounded-full border-2 border-transparent hover:border-[var(--subtle)] transition-colors flex-shrink-0"
                  >
                    <UserAvatar src={avatarUrl} name={displayName} size={32} />
                  </button>

                  {open && (
                    <div className="absolute right-0 mt-2 w-48 bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-2xl py-1 z-50">
                      <div className="px-4 py-3 border-b border-[var(--border)]">
                        <p className="text-sm font-medium truncate text-[var(--foreground)]">{displayName ?? '이름 없음'}</p>
                        <p className="text-xs text-[var(--text-secondary)] truncate">{user.email}</p>
                      </div>
                      <div className="py-1">
                        <DropdownLink href={`/${locale}/me/profile`} onClick={() => setOpen(false)}>내 프로필</DropdownLink>
                      </div>
                      <div className="border-t border-[var(--border)] py-1">
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[var(--muted)] transition-colors"
                        >
                          {t('logout')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={handleLogin}
                className="hidden sm:block text-sm font-medium px-3 py-1.5 bg-[var(--foreground)] text-[var(--background)] rounded hover:opacity-80 transition-opacity"
              >
                {t('login')}
              </button>
            )}
          </div>
        </div>
      </header>

    </>
  );
}

function DropdownLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
    >
      {children}
    </Link>
  );
}
