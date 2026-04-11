// Design Ref: §4.3 — Admin CRUD hooks
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Playlist } from '@/types';

export function useAdminPlaylists() {
  const supabase = createClient();
  const qc = useQueryClient();

  const playlists = useQuery<Playlist[]>({
    queryKey: ['admin', 'playlists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Playlist[];
    },
  });

  const createPlaylist = useMutation({
    mutationFn: async (payload: Omit<Playlist, 'id' | 'like_count' | 'created_at'> & {
      tracks: { position: number; title: string; artist: string | null; start_sec: number | null; duration_sec: number | null; youtube_video_id: string | null }[];
      editor_note?: string | null;
      uploaded_by?: string | null;
    }) => {
      const { tracks, ...playlistData } = payload;
      const { data: pl, error: pe } = await supabase
        .from('playlists')
        .insert({ ...playlistData, track_count: tracks.length })
        .select()
        .single();
      if (pe) {
        if (pe.code === '23505') throw new Error('이미 등록된 YouTube 영상입니다.');
        throw new Error(pe.message);
      }
      if (tracks.length > 0) {
        const { error: te } = await supabase.from('tracks').insert(
          tracks.map((t) => ({ ...t, playlist_id: pl.id }))
        );
        if (te) throw new Error(te.message);
      }
      return pl;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'playlists'] }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('playlists').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'playlists'] }),
  });

  const updatePlaylist = useMutation({
    mutationFn: async (payload: {
      id: string;
      genre: string[]; mood: string[]; place: string[]; era: string[];
      is_ai: boolean; is_active: boolean;
      editor_note?: string | null;
      tracks: { position: number; title: string; artist: string | null; start_sec: number | null; duration_sec: number | null; youtube_video_id: string | null }[];
    }) => {
      const { id, tracks, ...fields } = payload;
      const { error: pe } = await supabase
        .from('playlists')
        .update({ ...fields, track_count: tracks.length })
        .eq('id', id);
      if (pe) throw pe;
      // 트랙 전체 교체
      const { error: de } = await supabase.from('tracks').delete().eq('playlist_id', id);
      if (de) throw de;
      if (tracks.length > 0) {
        const { error: te } = await supabase.from('tracks').insert(
          tracks.map((t) => ({ ...t, playlist_id: id }))
        );
        if (te) throw te;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'playlists'] });
      qc.invalidateQueries({ queryKey: ['playlists'] });
    },
  });

  const deletePlaylist = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('playlists').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'playlists'] }),
  });

  const fetchTracks = async (playlistId: string) => {
    const { data, error } = await supabase
      .from('tracks')
      .select('position, title, artist, start_sec, duration_sec, youtube_video_id')
      .eq('playlist_id', playlistId)
      .order('position');
    if (error) throw new Error(error.message);
    return data as { position: number; title: string; artist: string | null; start_sec: number | null; duration_sec: number | null; youtube_video_id: string | null }[];
  };

  return { playlists, createPlaylist, updatePlaylist, toggleActive, deletePlaylist, fetchTracks };
}
