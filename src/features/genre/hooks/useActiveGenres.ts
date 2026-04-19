'use client';
// DB `genres` 테이블의 활성 장르 이름만 반환 — FilterBar/PlaylistForm 등 태그 UI 공용.
// `/api/genres` 는 is_active=true + position 오름차순으로 반환됨.

import { useQuery } from '@tanstack/react-query';

export function useActiveGenres() {
  return useQuery<string[]>({
    queryKey: ['genres-names'],
    queryFn: async () => {
      const res = await fetch('/api/genres');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? (data as Array<{ name: string }>).map((g) => g.name) : [];
    },
    staleTime: 1000 * 60 * 30,
  });
}
