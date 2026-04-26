'use client';
// 큐레이션 = 유저의 기본 저장함(is_default user_playlist)에 담기

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

async function getOrCreateDefaultPlaylist(userId: string): Promise<string> {
  const supabase = createClient();

  // maybeSingle: 신규 유저는 디폴트 저장함이 없어 0행 → null. .single() 은 0행에서
  // 406 을 던져 콘솔에 빨간 에러로 남음.
  const { data: existing } = await supabase
    .from('user_playlists')
    .select('id')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('user_playlists')
    .insert({ user_id: userId, name: '저장한 플레이리스트', is_public: false, is_default: true })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return created.id;
}

export function useCollection(playlistId: string) {
  const supabase = createClient();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: defaultList } = await supabase
        .from('user_playlists')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .maybeSingle();

      if (!defaultList) return;

      const { data } = await supabase
        .from('user_playlist_items')
        .select('playlist_id')
        .eq('user_playlist_id', defaultList.id)
        .eq('playlist_id', playlistId)
        .maybeSingle();

      setSaved(!!data);
    })();
  }, [playlistId, supabase]);

  const toggle = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    setLoading(true);
    const prev = saved;
    setSaved(!prev);

    try {
      const defaultId = await getOrCreateDefaultPlaylist(user.id);

      if (prev) {
        const { error } = await supabase
          .from('user_playlist_items')
          .delete()
          .eq('user_playlist_id', defaultId)
          .eq('playlist_id', playlistId);
        if (error) throw error;
      } else {
        const { count } = await supabase
          .from('user_playlist_items')
          .select('*', { count: 'exact', head: true })
          .eq('user_playlist_id', defaultId);
        const { error } = await supabase
          .from('user_playlist_items')
          .insert({ user_playlist_id: defaultId, playlist_id: playlistId, position: count ?? 0 });
        if (error) throw error;
      }
    } catch (e) {
      console.error('[useCollection] toggle failed:', e);
      setSaved(prev);
    } finally {
      setLoading(false);
    }

    return true;
  };

  return { saved, loading, toggle };
}
