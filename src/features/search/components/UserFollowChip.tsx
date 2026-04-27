'use client';
// Design Ref: §5.2 — follow/unfollow chip for search user rows
// Plan SC 3: chip must not trigger parent Link navigation on click.
//
// Uses initialFollowing from useBatchFollow instead of each chip re-querying
// follow state (avoids N+1 in user search sections).

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface UserFollowChipProps {
  userId: string;
  initialFollowing: boolean;
  currentUserId: string | null;
  /** 'hero' = ProfileHeroHeader 등 colored bg 위에서 흰색 outline 스타일 */
  variant?: 'default' | 'hero';
}

export default function UserFollowChip({ userId, initialFollowing, currentUserId, variant = 'default' }: UserFollowChipProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  // Hide chip for self / guest
  if (!currentUserId || currentUserId === userId) return null;

  const toggle = async (e: React.MouseEvent) => {
    // Prevent the parent Link from navigating when the chip is inside an <a>.
    e.stopPropagation();
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const supabase = createClient();
    const next = !isFollowing;

    // Optimistic
    setIsFollowing(next);

    const { error } = next
      ? await supabase.from('follows').insert({ follower_id: currentUserId, following_id: userId })
      : await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', userId);

    if (error) {
      // 23505 = unique violation → 이미 팔로잉. stale 캐시로 인한 misalignment 이므로
      // 의도한 next(true) 가 실제 DB 상태와 일치 → revert 하지 않음.
      if (next && (error as { code?: string }).code === '23505') {
        // keep optimistic true
      } else {
        setIsFollowing(!next);
      }
    }

    // batchFollow 캐시 무효화 → 다른 화면(검색/드롭다운)에서 최신 상태 반영
    queryClient.invalidateQueries({ queryKey: ['batchFollow'] });
    setLoading(false);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={
        variant === 'hero'
          ? `text-sm font-medium px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 flex-shrink-0 ${
              isFollowing
                ? 'bg-transparent text-white border-white/40 hover:border-white'
                : 'bg-white text-black border-transparent hover:bg-white/90'
            }`
          : `text-xs font-medium px-3 py-1 rounded-full border transition-colors disabled:opacity-50 flex-shrink-0 ${
              isFollowing
                ? 'bg-[var(--muted)] text-[var(--text-secondary)] border-[var(--border)] hover:border-red-400 hover:text-red-400'
                : 'bg-[var(--foreground)] text-[var(--background)] border-transparent hover:opacity-80'
            }`
      }
    >
      {isFollowing ? '팔로잉' : '팔로우'}
    </button>
  );
}
