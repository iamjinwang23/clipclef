'use client';
// Design Ref: §5.4 — 컬렉션 저장/해제 버튼

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCollection } from '../hooks/useCollection';
import LoginModal from './LoginModal';

interface CollectionButtonProps {
  playlistId: string;
  variant?: 'full' | 'icon' | 'responsive';
}

export default function CollectionButton({ playlistId, variant = 'full' }: CollectionButtonProps) {
  const t = useTranslations('common');
  const { saved, loading, toggle } = useCollection(playlistId);
  const [showLogin, setShowLogin] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const success = await toggle();
    if (success === false) setShowLogin(true);
  };

  const fullClass = `flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
    saved
      ? 'bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]'
      : 'bg-transparent text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--subtle)] hover:text-[var(--foreground)]'
  }`;

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={handleClick}
          disabled={loading}
          title={saved ? t('saved') : t('save')}
          className={`p-1.5 rounded-full transition-colors ${
            saved ? 'text-[var(--foreground)]' : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
          }`}
        >
          {saved ? '★' : '☆'}
        </button>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      </>
    );
  }

  if (variant === 'responsive') {
    return (
      <>
        {/* 데스크톱: 텍스트 풀버튼 */}
        <button
          onClick={handleClick}
          disabled={loading}
          className={`hidden sm:flex ${fullClass}`}
        >
          <span>{saved ? '★' : '☆'}</span>
          <span>{saved ? t('saved') : t('save')}</span>
        </button>
        {/* 모바일: 아이콘 + border */}
        <button
          onClick={handleClick}
          disabled={loading}
          title={saved ? t('saved') : t('save')}
          className={`sm:hidden flex items-center justify-center px-3 py-2 rounded-full border text-sm transition-colors ${
            saved
              ? 'bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]'
              : 'text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--subtle)] hover:text-[var(--foreground)]'
          }`}
        >
          {saved ? '★' : '☆'}
        </button>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className={fullClass}
      >
        <span>{saved ? '★' : '☆'}</span>
        <span>{saved ? t('saved') : t('save')}</span>
      </button>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
