// Design Ref: §4.2 — batch follow status to avoid N+1 in user search section
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Given a follower (current user) and a list of target user ids,
 * return a Map<targetUserId, isFollowing>.
 *
 * Uses the `follows` table with columns (follower_id, following_id).
 * Empty input or missing follower returns an empty map.
 */
export async function getFollowStates(
  supabase: SupabaseClient,
  followerId: string | null,
  targetIds: string[]
): Promise<Map<string, boolean>> {
  if (!followerId || targetIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', followerId)
    .in('following_id', targetIds);

  if (error) {
    // Plan SC 3: fail soft — chip defaults to 팔로우 when state unknown
    return new Map(targetIds.map((id) => [id, false]));
  }

  const followingSet = new Set((data ?? []).map((r) => r.following_id as string));
  return new Map(targetIds.map((id) => [id, followingSet.has(id)]));
}
