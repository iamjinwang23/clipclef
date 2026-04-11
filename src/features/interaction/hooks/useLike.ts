'use client';
// Design Ref: §6.2 — Optimistic update with rollback

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useLike(playlistId: string, initialCount: number) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('likes')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('playlist_id', playlistId)
        .maybeSingle()
        .then(({ data }) => setLiked(!!data));
    });
  }, [playlistId]);

  const toggle = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false; // 로그인 필요 시그널

    setLoading(true);
    const prev = liked;
    // Optimistic update
    setLiked(!prev);
    setCount((c) => (prev ? c - 1 : c + 1));

    const { error } = prev
      ? await supabase.from('likes').delete().eq('user_id', user.id).eq('playlist_id', playlistId)
      : await supabase.from('likes').insert({ user_id: user.id, playlist_id: playlistId });

    if (error) {
      // Rollback
      setLiked(prev);
      setCount((c) => (prev ? c + 1 : c - 1));
    } else {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
    }
    setLoading(false);
    return true;
  };

  return { liked, count, loading, toggle };
}
