'use client';
// Design Ref: §5.4 — 좋아요 버튼 (토글, 로그인 필요)
// Plan SC: 좋아요 토글 동작

import { useState } from 'react';
import { useLike } from '../hooks/useLike';
import LoginModal from './LoginModal';

interface LikeButtonProps {
  playlistId: string;
  initialCount: number;
}

export default function LikeButton({ playlistId, initialCount }: LikeButtonProps) {
  const { liked, count, loading, toggle } = useLike(playlistId, initialCount);
  const [showLogin, setShowLogin] = useState(false);

  const handleClick = async () => {
    const success = await toggle();
    if (success === false) setShowLogin(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className={`flex items-center gap-1.5 h-9 px-4 rounded-full border text-sm font-medium transition-colors ${
          liked
            ? 'bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]'
            : 'bg-transparent text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--subtle)] hover:text-[var(--foreground)]'
        }`}
      >
        <span>{liked ? '♥' : '♡'}</span>
        <span>{count}</span>
      </button>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
