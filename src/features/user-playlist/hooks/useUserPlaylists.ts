'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UserPlaylist } from '@/types';

export function useUserPlaylists() {
  const supabase = createClient();
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('user_playlists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setPlaylists((data ?? []) as UserPlaylist[]);
  }, [supabase]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (name: string): Promise<UserPlaylist | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('user_playlists')
      .insert({ user_id: user.id, name: name.trim(), is_public: true })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const created = data as UserPlaylist;
    setPlaylists((prev) => [created, ...prev]);
    return created;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('user_playlists').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
  };

  const togglePublic = async (id: string, isPublic: boolean) => {
    const { error } = await supabase
      .from('user_playlists')
      .update({ is_public: isPublic })
      .eq('id', id);
    if (error) throw new Error(error.message);
    setPlaylists((prev) => prev.map((p) => p.id === id ? { ...p, is_public: isPublic } : p));
  };

  const addItem = async (userPlaylistId: string, playlistId: string) => {
    setLoading(true);
    try {
      const { count } = await supabase
        .from('user_playlist_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_playlist_id', userPlaylistId);
      const { error } = await supabase
        .from('user_playlist_items')
        .insert({ user_playlist_id: userPlaylistId, playlist_id: playlistId, position: count ?? 0 });
      if (error && error.code !== '23505') throw new Error(error.message); // 중복은 무시
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (userPlaylistId: string, playlistId: string) => {
    const { error } = await supabase
      .from('user_playlist_items')
      .delete()
      .eq('user_playlist_id', userPlaylistId)
      .eq('playlist_id', playlistId);
    if (error) throw new Error(error.message);
  };

  const getItemIds = async (userPlaylistId: string): Promise<string[]> => {
    const { data } = await supabase
      .from('user_playlist_items')
      .select('playlist_id')
      .eq('user_playlist_id', userPlaylistId);
    return (data ?? []).map((r: { playlist_id: string }) => r.playlist_id);
  };

  return { playlists, loading, fetch, create, remove, togglePublic, addItem, removeItem, getItemIds };
}
