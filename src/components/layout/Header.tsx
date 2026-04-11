'use client';
// Design Ref: §5.3 — Header: 로고, 검색창, 프로필 드롭다운
// mobile: 검색창 숨김 → 검색 아이콘, +만들기 → 아이콘

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useFilterStore } from '@/features/filter/store';
import UserAvatar from '@/components/ui/UserAvatar';
import SearchOverlay from '@/components/ui/SearchOverlay';

export default function Header() {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { query, setQuery } = useFilterStore();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

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

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const displayName = user?.user_metadata?.full_name as string | undefined;

  return (
    <>
      <header className="sticky top-0 z-40 bg-[var(--background)]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          {/* 로고 */}
          <Link href={`/${locale}`} className="flex items-center flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="ClipClef" className="h-6 w-auto" style={{ filter: 'invert(1)' }} />
          </Link>

          {/* 검색창 — 데스크톱 전용 */}
          <div className="hidden sm:block flex-1 max-w-sm relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none"
              fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="검색"
              className="w-full pl-9 pr-8 py-1.5 text-sm rounded-full bg-[var(--muted)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--subtle)] placeholder:text-[var(--text-secondary)]"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--foreground)]"
              >
                ×
              </button>
            )}
          </div>

          {/* 우측 */}
          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            {/* 검색 아이콘 — 모바일 전용 */}
            <button
              onClick={() => setSearchOpen(true)}
              className="sm:hidden p-2 rounded-full text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              aria-label="검색"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </button>

            {user ? (
              <>
                {/* +만들기 — 데스크톱: 텍스트, 모바일: 아이콘 */}
                <Link
                  href={`/${locale}/upload`}
                  className="hidden sm:flex items-center text-xs font-medium px-2.5 py-1.5 rounded-full border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--subtle)] transition-colors flex-shrink-0"
                >
                  + 만들기
                </Link>
                <Link
                  href={`/${locale}/upload`}
                  className="sm:hidden p-2 rounded-full text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                  aria-label="업로드"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </Link>

                {/* 프로필 드롭다운 */}
                <div ref={dropdownRef} className="relative">
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
                className="text-sm font-medium px-3 py-1.5 bg-[var(--foreground)] text-[var(--background)] rounded hover:opacity-80 transition-opacity"
              >
                {t('login')}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 검색 오버레이 — 모바일 */}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
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
