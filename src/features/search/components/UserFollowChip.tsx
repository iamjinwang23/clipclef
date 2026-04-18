'use client';
// Design Ref: §5.2 — follow/unfollow chip for search user rows
// Plan SC 3: chip must not trigger parent Link navigation on click.
//
// Uses initialFollowing from useBatchFollow instead of each chip re-querying
// follow state (avoids N+1 in user search sections).

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UserFollowChipProps {
  userId: string;
  initialFollowing: boolean;
  currentUserId: string | null;
}

export default function UserFollowChip({ userId, initialFollowing, currentUserId }: UserFollowChipProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

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
      // Revert on failure
      setIsFollowing(!next);
    }
    setLoading(false);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors disabled:opacity-50 flex-shrink-0 ${
        isFollowing
          ? 'bg-[var(--muted)] text-[var(--text-secondary)] border-[var(--border)] hover:border-red-400 hover:text-red-400'
          : 'bg-[var(--foreground)] text-[var(--background)] border-transparent hover:opacity-80'
      }`}
    >
      {isFollowing ? '팔로잉' : '팔로우'}
    </button>
  );
}
