'use client';
// Design Ref: §5.3 — Header: 로고, 검색창(가운데), 프로필 드롭다운
// mobile: 검색창 숨김 → 검색 아이콘, +만들기 → 아이콘
// Module-4: DesktopSearchBar uses shared SearchDropdown; Enter → /search?q=...

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { isInAppBrowser } from '@/lib/browser';
import SearchDropdown from '@/features/search/components/SearchDropdown';
import { toast } from '@/lib/toast';

// ─── 최근 검색어 localStorage 유틸 ───────────────────────────────────────────
const STORAGE_KEY = 'clipclef_recent_searches';
const MAX_RECENT = 8;

function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}
function saveRecent(terms: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(terms.slice(0, MAX_RECENT)));
}

// ─── 데스크톱 검색바 (공용 SearchDropdown 사용) ──────────────────────────────
function DesktopSearchBar() {
  const locale = useLocale();
  const router = useRouter();
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  // lazy init — 마운트 시 1회만 localStorage 를 읽고, 이후에는 로컬 상태만 갱신.
  // removeRecent/applySearch/clearAll 이 saveRecent 로 동기화하므로 같은 탭 내부 일관성은 유지됨.
  const [recent, setRecent] = useState<string[]>(() =>
    typeof window === 'undefined' ? [] : loadRecent()
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Plan SC 4: Enter / "전체 결과 보기" → /search?q=...
  const applySearch = (term: string) => {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...recent.filter((r) => r !== t)];
    setRecent(next);
    saveRecent(next);
    setFocused(false);
    router.push(`/${locale}/search?q=${encodeURIComponent(t)}`);
  };

  const removeRecent = (term: string) => {
    const next = recent.filter((r) => r !== term);
    setRecent(next);
    saveRecent(next);
  };
  const clearAll = () => { setRecent([]); saveRecent([]); };

  const showPreview = focused && value.trim().length > 0;
  const showRecent = focused && value.trim().length === 0;

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
          placeholder="노래 제목, 아티스트명으로 검색"
          className="w-full pl-9 pr-8 py-2.5 text-sm rounded-full bg-[var(--muted)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--subtle)] placeholder:text-[var(--text-secondary)]"
        />
        {value && (
          <button
            onClick={() => setValue('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--foreground)]"
          >
            ×
          </button>
        )}
      </div>

      {/* 드롭다운 */}
      {(showPreview || showRecent) && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl z-50 overflow-hidden max-h-96 overflow-y-auto">
          {showPreview ? (
            <SearchDropdown
              query={value}
              onSelect={() => { setFocused(false); applySearch(value); }}
              onViewAll={(q) => applySearch(q)}
            />
          ) : (
            /* 최근 검색어 */
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">최근 검색</span>
                <button onClick={clearAll} className="text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)]">
                  전체 삭제
                </button>
              </div>
              {recent.length === 0 ? (
                <p className="text-xs text-[var(--subtle)] text-center py-3">최근 검색어가 없습니다</p>
              ) : (
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
              )}
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleLogin = async () => {
    if (isInAppBrowser()) {
      toast.info('앱 내 브라우저에서는 Google 로그인이 지원되지 않습니다. Safari 또는 Chrome에서 접속해 주세요.');
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[var(--background)]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-3 sm:gap-4">
          {/* 좌측: 뒤로가기(모바일) + 모바일 로고 (데스크톱은 rail 상단이 담당) */}
          <div className="flex items-center gap-2 flex-shrink-0">
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
            <Link href={`/${locale}`} className="sm:hidden flex items-center flex-shrink-0" aria-label="홈으로">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="ClipClef" className="h-6 w-auto" />
            </Link>
          </div>

          {/* 가운데: 검색창 — 가운데 영역 가운데 정렬 (max-w-xl mx-auto) */}
          <div className="hidden sm:block flex-1">
            <div className="max-w-xl mx-auto">
              <DesktopSearchBar />
            </div>
          </div>

          {/* 우측: 모바일 비로그인 로그인 버튼 (데스크톱은 rail 이 담당) */}
          <div className="flex-1 sm:flex-none flex items-center justify-end gap-2">
            {!user && (
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
