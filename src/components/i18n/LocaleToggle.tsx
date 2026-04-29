'use client';
// Design Ref: §3.1 — KO|EN 텍스트 토글. router.replace로 locale prefix 교체 + NEXT_LOCALE 쿠키 set
// Plan SC: URL prefix + 쿠키 동시 갱신

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

const LOCALES = ['ko', 'en'] as const;
type Locale = (typeof LOCALES)[number];

interface Props {
  className?: string;
}

export default function LocaleToggle({ className }: Props) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('more');
  const [isPending, startTransition] = useTransition();

  const setLocale = (next: Locale) => {
    if (next === locale || isPending) return;

    // /ko/foo/bar → /en/foo/bar  (root /, /ko, /en 도 안전 처리)
    const stripped = pathname.replace(/^\/(ko|en)(?=\/|$)/, '');
    const newPath = `/${next}${stripped || ''}` || `/${next}`;
    const qs = searchParams?.toString();
    const fullUrl = qs ? `${newPath}?${qs}` : newPath;

    // 쿠키 우선 (middleware가 쿠키 읽음). 핸들러 내 의도된 side effect.
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `NEXT_LOCALE=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;

    startTransition(() => router.replace(fullUrl));
  };

  return (
    <div className={`flex items-center justify-between px-4 py-2 ${className ?? ''}`}>
      <span className="text-sm text-[var(--foreground)]">{t('language')}</span>
      <div className="flex items-center gap-1.5 text-sm" aria-disabled={isPending}>
        {LOCALES.map((lc, i) => (
          <span key={lc} className="contents">
            {i > 0 && <span className="text-[var(--subtle)]">|</span>}
            <button
              type="button"
              onClick={() => setLocale(lc)}
              aria-pressed={lc === locale}
              className={
                lc === locale
                  ? 'font-semibold text-[var(--foreground)]'
                  : 'text-[var(--subtle)] hover:text-[var(--foreground)] transition-colors'
              }
            >
              {lc.toUpperCase()}
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
