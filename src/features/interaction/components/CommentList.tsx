'use client';
// Design Ref: §5.4 — 댓글 목록 (아바타/닉네임/날짜/내용/삭제)

import { useTranslations } from 'next-intl';
import { useComments } from '../hooks/useComments';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import UserAvatar from '@/components/ui/UserAvatar';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import { formatRelativeTime } from '@/features/notification/lib/formatRelativeTime';

interface CommentListProps {
  playlistId: string;
}

export default function CommentList({ playlistId }: CommentListProps) {
  const t = useTranslations('comment');
  const tCommon = useTranslations('common');
  const { comments, isLoading, deleteComment } = useComments(playlistId);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
  }, []);

  if (isLoading) return <div className="py-4 text-sm text-[var(--text-secondary)]">{tCommon('loading')}</div>;

  if (comments.length === 0) {
    return <p className="py-4 text-sm text-[var(--text-secondary)]">{t('empty')}</p>;
  }

  return (
    <ul className="space-y-4">
      {comments.map((comment) => (
        <li key={comment.id} className="flex gap-3">
          {/* 아바타 */}
          <UserAvatar src={comment.profiles.avatar_url} name={comment.profiles.display_name} size={32} />
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
          </div>
        </li>
      ))}
    </ul>
  );
}
