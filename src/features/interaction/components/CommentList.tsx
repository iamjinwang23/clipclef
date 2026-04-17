'use client';
// Design Ref: §6.2 — 댓글 목록 + 대댓글 렌더링 (1단계, 항상 펼침)

import { useTranslations } from 'next-intl';
import { useComments } from '../hooks/useComments';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import UserAvatar from '@/components/ui/UserAvatar';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import { formatRelativeTime } from '@/features/notification/lib/formatRelativeTime';
import ReplyForm from './ReplyForm';
import type { Comment } from '@/types';

interface CommentListProps {
  playlistId: string;
  isLoggedIn: boolean;
}

export default function CommentList({ playlistId, isLoggedIn }: CommentListProps) {
  const t = useTranslations('comment');
  const tCommon = useTranslations('common');
  const { comments, isLoading, deleteComment } = useComments(playlistId);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
  }, []);

  if (isLoading) return <div className="py-4 text-sm text-[var(--text-secondary)]">{tCommon('loading')}</div>;

  if (comments.length === 0) {
    return <p className="py-4 text-sm text-[var(--text-secondary)]">{t('empty')}</p>;
  }

  const renderComment = (comment: Comment, isReply = false) => (
    <li key={comment.id} className="flex gap-3">
      <UserAvatar src={comment.profiles.avatar_url} name={comment.profiles.display_name} size={isReply ? 24 : 32} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="flex items-center gap-1">
            <span className="text-xs font-medium">{comment.profiles.display_name ?? '익명'}</span>
            {comment.profiles.is_verified && <VerifiedBadge size={12} />}
          </span>
          <span className="text-xs text-[var(--text-secondary)]">{formatRelativeTime(comment.created_at)}</span>
          {currentUserId === comment.user_id && (
            <button
              onClick={() => deleteComment.mutate(comment.id)}
              className="text-xs text-[var(--text-secondary)] hover:text-red-400 transition-colors ml-auto"
            >
              {t('delete')}
            </button>
          )}
        </div>
        <p className="text-sm text-[var(--foreground)] break-words">{comment.content}</p>

        {/* Plan SC: SC-02 — 대댓글(isReply)에는 답글 버튼 미표시 */}
        {!isReply && (
          <button
            onClick={() => setActiveReplyId(activeReplyId === comment.id ? null : comment.id)}
            className="mt-1 text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
          >
            {t('reply')}
          </button>
        )}

        {/* 대댓글 목록 */}
        {!isReply && (comment.replies?.length ?? 0) > 0 && (
          <ul className="mt-2 space-y-3 border-l border-[var(--border)] pl-3">
            {comment.replies!.map((reply) => renderComment(reply, true))}
          </ul>
        )}

        {/* 인라인 ReplyForm */}
        {!isReply && activeReplyId === comment.id && (
          <ReplyForm
            playlistId={playlistId}
            parentId={comment.id}
            isLoggedIn={isLoggedIn}
            onClose={() => setActiveReplyId(null)}
          />
        )}
      </div>
    </li>
  );

  return (
    <ul className="space-y-4">
      {comments.map((comment) => renderComment(comment))}
    </ul>
  );
}
