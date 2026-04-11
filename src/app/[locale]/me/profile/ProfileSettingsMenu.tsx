'use client';
// 프로필 페이지 설정 버튼 — 클릭 시 하위 메뉴(기본정보·내좋아요·내댓글·내재생목록) 토글
import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';

interface Props {
  locale: string;
}

const MENU_ITEMS = [
  { label: '기본 정보', path: 'settings' },
  { label: '내 좋아요', path: 'likes' },
  { label: '내 댓글', path: 'comments' },
  { label: '내 재생목록', path: 'playlists' },
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
        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:border-[var(--subtle)] transition-colors"
        aria-label="설정 메뉴"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        설정
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
