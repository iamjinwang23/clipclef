'use client';

// Design Ref: §4.2 — POST /api/user-playlists/publish
// PATCH/DELETE 핸들러도 함께 export (LibraryGrid 등 재사용)

import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface PublishPayload {
  title: string;
  caption?: string | null;
  cover_url?: string | null;
  playlist_ids: string[];
}

export function usePublish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PublishPayload) => {
      const res = await fetch('/api/user-playlists/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? '발행 실패');
      }
      return (await res.json()).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library'] });
      qc.invalidateQueries({ queryKey: ['mixed-shelf'] });
    },
  });
}

export function useUpdateUserPlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: Partial<PublishPayload> & { id: string }) => {
      const res = await fetch(`/api/user-playlists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? '수정 실패');
      }
      return (await res.json()).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library'] });
      qc.invalidateQueries({ queryKey: ['mixed-shelf'] });
    },
  });
}

export function useDeleteUserPlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/user-playlists/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error?.message ?? '삭제 실패');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library'] });
      qc.invalidateQueries({ queryKey: ['mixed-shelf'] });
    },
  });
}
