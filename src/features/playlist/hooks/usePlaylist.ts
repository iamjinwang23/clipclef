import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Playlist, Track } from '@/types';

export function usePlaylist(id: string) {
  const supabase = createClient();

  return useQuery<{ playlist: Playlist; tracks: Track[] }>({
    queryKey: ['playlist', id],
    queryFn: async () => {
      const [{ data: playlist, error: pe }, { data: tracks, error: te }] = await Promise.all([
        supabase.from('playlists').select('*').eq('id', id).single(),
        supabase.from('tracks').select('*').eq('playlist_id', id).order('position'),
      ]);
      if (pe) throw new Error(pe.message);
      if (te) throw new Error(te.message);
      return { playlist: playlist as Playlist, tracks: (tracks ?? []) as Track[] };
    },
  });
}
