'use client';
// Design Ref: §5.4 — /search page with ?q branch
//  - ?q present: render SearchResults
//  - ?q absent: render search input + recent searches + SearchDropdown preview

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import SearchDropdown from '@/features/search/components/SearchDropdown';
import SearchResults from '@/features/search/components/SearchResults';

const STORAGE_KEY = 'clipclef_recent_searches';
const MAX_RECENT = 8;

function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}
function saveRecent(terms: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(terms.slice(0, MAX_RECENT)));
}

export default function SearchPage() {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get('q')?.trim() ?? '';

  const [value, setValue] = useState(q);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecent(loadRecent());
    if (!q) inputRef.current?.focus();
  }, [q]);

  // Keep the input in sync when ?q changes (browser back/forward)
  useEffect(() => { setValue(q); }, [q]);

  const applySearch = (term: string) => {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...recent.filter((r) => r !== t)];
    setRecent(next);
    saveRecent(next);
    // Navigate to results mode (replace to avoid history stack bloat when user edits)
    router.replace(`/${locale}/search?q=${encodeURIComponent(t)}`);
  };

  const clearQuery = () => {
    setValue('');
    router.replace(`/${locale}/search`);
  };

  const removeRecent = (term: string) => {
    const next = recent.filter((r) => r !== term);
    setRecent(next);
    saveRecent(next);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">
      {/* 검색 입력 — 모바일 전용 (데스크톱은 Header에 이미 검색창이 있음) */}
      <div className="sm:hidden px-4 py-3 border-b border-[var(--border)]">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none"
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') applySearch(value); }}
            placeholder="검색"
            className="w-full pl-9 pr-8 py-1.5 text-sm rounded-full bg-[var(--muted)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--subtle)] placeholder:text-[var(--text-secondary)]"
          />
          {value && (
            <button
              type="button"
              onClick={clearQuery}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--foreground)]"
              aria-label="검색어 지우기"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {q ? (
          /* 결과 모드 */
          <SearchResults query={q} />
        ) : value.trim() ? (
          /* 입력 중 — 드롭다운 프리뷰 */
          <SearchDropdown
            query={value}
            onSelect={() => applySearch(value)}
            onViewAll={(qq) => applySearch(qq)}
          />
        ) : (
          /* 최근 검색어 */
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
