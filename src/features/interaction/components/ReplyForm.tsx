'use client';
// Design Ref: §6.1 — 인라인 답글 입력 폼

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useComments } from '../hooks/useComments';
import LoginModal from './LoginModal';

interface ReplyFormProps {
  playlistId: string;
  parentId: string;
  isLoggedIn: boolean;
  onClose: () => void;
}

export default function ReplyForm({ playlistId, parentId, isLoggedIn, onClose }: ReplyFormProps) {
  const t = useTranslations('comment');
  const { addReply } = useComments(playlistId);
  const [content, setContent] = useState('');
  const [showLogin, setShowLogin] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    if (!isLoggedIn) { setShowLogin(true); return; }
    try {
      await addReply.mutateAsync({ parentId, content: content.trim() });
      onClose();
    } catch {}
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onClick={() => !isLoggedIn && setShowLogin(true)}
          placeholder={isLoggedIn ? t('replyPlaceholder') : t('replyLoginRequired')}
          readOnly={!isLoggedIn}
          maxLength={500}
          rows={2}
          autoFocus
          className="flex-1 text-sm border border-[var(--border)] rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[var(--subtle)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--text-secondary)]"
        />
        <div className="flex flex-col gap-1 self-end">
          {isLoggedIn && (
            <button
              type="submit"
              disabled={!content.trim() || addReply.isPending}
              className="px-3 py-1.5 text-xs font-medium bg-[var(--foreground)] text-[var(--background)] rounded-lg disabled:opacity-40 hover:opacity-80 transition-opacity"
            >
              {t('replySubmit')}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
          >
            {t('replyCancel')}
          </button>
        </div>
      </form>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
