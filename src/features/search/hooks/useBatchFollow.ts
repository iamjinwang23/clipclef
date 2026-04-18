'use client';
// Design Ref: §4.2 — React Query wrapper for batch follow state
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { getFollowStates } from '../lib/follow-batch';

/**
 * Given a list of user ids, returns a Map<id, isFollowing> for the current
 * session user. Re-runs when the id list changes. Empty map while loading
 * or when not logged in.
 */
export function useBatchFollow(targetIds: string[]) {
  const [meId, setMeId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null));
  }, []);

  // Stable key: sorted & joined ids — prevents unnecessary refetches when order changes
  const key = [...targetIds].sort().join(',');

  const query = useQuery({
    queryKey: ['batchFollow', meId, key],
    queryFn: async () => {
      const supabase = createClient();
      return getFollowStates(supabase, meId, targetIds);
    },
    enabled: !!meId && targetIds.length > 0,
    staleTime: 30_000,
  });

  return {
    map: query.data ?? new Map<string, boolean>(),
    loading: query.isLoading,
    isLoggedIn: !!meId,
    meId,
  };
}
