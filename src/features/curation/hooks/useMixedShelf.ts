'use client';

// Design Ref: §4.2 — useMixedShelf (react-query 기반 혼합 선반 fetch)

import { useQuery } from '@tanstack/react-query';
import type { MixedShelfItem } from '@/app/api/mixed-shelf/route';

export function useMixedShelf(limit: number = 12) {
  return useQuery<MixedShelfItem[]>({
    queryKey: ['mixed-shelf', limit],
    queryFn: async () => {
      const res = await fetch(`/api/mixed-shelf?limit=${limit}`);
      if (!res.ok) throw new Error('mixed-shelf fetch 실패');
      const json = await res.json();
      return json.data as MixedShelfItem[];
    },
    staleTime: 30_000,
  });
}
