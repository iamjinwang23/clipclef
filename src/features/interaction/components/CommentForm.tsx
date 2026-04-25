'use client';
// Design Ref: §5.4 — 댓글 입력 폼

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useComments } from '../hooks/useComments';
import LoginModal from './LoginModal';
import { toast } from '@/lib/toast';

interface CommentFormProps {
  playlistId: string;
  isLoggedIn: boolean;
}

export default function CommentForm({ playlistId, isLoggedIn }: CommentFormProps) {
  const t = useTranslations('comment');
  const { addComment } = useComments(playlistId);
  const [content, setContent] = useState('');
  const [showLogin, setShowLogin] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    if (!isLoggedIn) { setShowLogin(true); return; }
    try {
      await addComment.mutateAsync(content.trim());
      setContent('');
      toast.success('댓글을 남겼어요');
    } catch {
      toast.error('댓글 작성에 실패했어요. 다시 시도해 주세요.');
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onClick={() => !isLoggedIn && setShowLogin(true)}
          placeholder={isLoggedIn ? t('placeholder') : t('loginRequired')}
          readOnly={!isLoggedIn}
          maxLength={500}
          rows={2}
          className="flex-1 text-sm border border-[var(--border)] rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[var(--subtle)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--text-secondary)]"
        />
        {isLoggedIn && (
          <button
            type="submit"
            disabled={!content.trim() || addComment.isPending}
            className="self-end px-4 py-2 text-sm font-medium bg-[var(--foreground)] text-[var(--background)] rounded-lg disabled:opacity-40 hover:opacity-80 transition-opacity"
          >
            {t('submit')}
          </button>
        )}
      </form>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
