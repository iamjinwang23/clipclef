'use client';
// 프로필 페이지 설정 버튼 — 클릭 시 하위 메뉴(기본정보·내좋아요·내댓글·내플레이리스트) 토글
import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';

interface Props {
  locale: string;
}

const MENU_ITEMS = [
  { label: '기본 정보', path: 'settings' },
  { label: '내 좋아요', path: 'likes' },
  { label: '내 댓글', path: 'comments' },
  { label: '내 플레이리스트', path: 'playlists' },
];

export default function ProfileSettingsMenu({ locale }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2 text-[var(--foreground)] hover:text-[var(--text-secondary)] transition-colors"
        aria-label="더보기 메뉴"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-2xl py-1 z-50">
          {MENU_ITEMS.map(({ label, path }) => (
            <Link
              key={path}
              href={`/${locale}/me/${path}`}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
