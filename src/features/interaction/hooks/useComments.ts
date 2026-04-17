'use client';
// Design Ref: §5 — nested 쿼리로 최상위 댓글 + replies 한 번에 조회

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Comment } from '@/types';

export function useComments(playlistId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: ['comments', playlistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles(display_name, avatar_url, is_verified),
          replies:comments!comments_parent_id_fkey(
            *,
            profiles(display_name, avatar_url, is_verified)
          )
        `)
        .eq('playlist_id', playlistId)
        .is('parent_id', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as Comment[]).map((c) => ({
        ...c,
        replies: (c.replies ?? []).sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
      }));
    },
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다');
      const { error } = await supabase
        .from('comments')
        .insert({ playlist_id: playlistId, user_id: user.id, content });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', playlistId] }),
  });

  const addReply = useMutation({
    mutationFn: async ({ parentId, content }: { parentId: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다');
      const { error } = await supabase
        .from('comments')
        .insert({ playlist_id: playlistId, user_id: user.id, parent_id: parentId, content });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', playlistId] }),
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', playlistId] }),
  });

  return { comments, isLoading, addComment, addReply, deleteComment };
}
