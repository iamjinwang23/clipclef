'use client';
// Design Ref: §3.2 — MoreMenu (former ProfileSettingsMenu).
// 5개 메뉴 항목 + LocaleToggle 슬롯. direction/align/trigger props 로 Rail/Profile 양쪽 재사용.

import { useRef, useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import LocaleToggle from '@/components/i18n/LocaleToggle';

interface Props {
  locale: string;
  direction?: 'down' | 'up';
  align?: 'left' | 'right';
  trigger?: ReactNode;
}

const MENU_ITEMS = [
  { key: 'basicInfo', path: 'settings' },
  { key: 'likes', path: 'likes' },
  { key: 'comments', path: 'comments' },
  { key: 'curations', path: 'playlists' },
] as const;

export default function MoreMenu({
  locale,
  direction = 'down',
  align = 'right',
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t = useTranslations('more');
  const tNav = useTranslations('nav');

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const popoverPosition =
    direction === 'up'
      ? `bottom-full mb-2 ${align === 'right' ? 'right-0' : 'left-0'}`
      : `top-full mt-2 ${align === 'right' ? 'right-0' : 'left-0'}`;

  return (
    <div ref={ref} className="relative flex-shrink-0">
      {trigger ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={tNav('more')}
          aria-expanded={open}
          className="contents"
        >
          {trigger}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={tNav('more')}
          aria-expanded={open}
          className="p-2 text-[var(--foreground)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      )}

      {open && (
        <div
          className={`absolute ${popoverPosition} w-48 bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-2xl py-1 z-50`}
        >
          {MENU_ITEMS.map(({ key, path }) => (
            <Link
              key={key}
              href={`/${locale}/me/${path}`}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              {t(key)}
            </Link>
          ))}
          <div className="border-t border-[var(--border)] my-1" />
          <LocaleToggle />
        </div>
      )}
    </div>
  );
}
