'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useFollow(targetUserId: string | null) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!targetUserId) return;
    const supabase = createClient();

    const init = async () => {
      const [
        { data: { user } },
        { count: fCount },
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetUserId),
      ]);

      setFollowerCount(fCount ?? 0);
      if (!user) return;
      setCurrentUserId(user.id);

      if (user.id !== targetUserId) {
        const { data } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId)
          .single();
        setIsFollowing(!!data);
      }
    };

    init();
  }, [targetUserId]);

  const toggle = async () => {
    if (!targetUserId || !currentUserId || loading) return;
    setLoading(true);
    const supabase = createClient();

    if (isFollowing) {
      await supabase.from('follows').delete()
        .eq('follower_id', currentUserId).eq('following_id', targetUserId);
      setIsFollowing(false);
      setFollowerCount((c) => Math.max(c - 1, 0));
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: targetUserId });
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
    }
    setLoading(false);
  };

  const isSelf = !!currentUserId && currentUserId === targetUserId;

  return { isFollowing, followerCount, toggle, loading, isSelf, isLoggedIn: !!currentUserId };
}
