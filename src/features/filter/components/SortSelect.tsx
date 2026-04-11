'use client';

import { useTranslations } from 'next-intl';
import { useFilterStore } from '../store';
import type { SortOption } from '@/types';

export default function SortSelect() {
  const t = useTranslations('filter.sort');
  const { sort, setSort } = useFilterStore();

  const options: { value: SortOption; label: string }[] = [
    { value: 'latest', label: t('latest') },
    { value: 'likes', label: t('likes') },
    { value: 'views', label: t('views') },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--text-secondary)]">{t('label')}</span>
      <select
        value={sort}
        onChange={(e) => setSort(e.target.value as SortOption)}
        className="text-sm border border-[var(--border)] rounded-lg px-2 py-1 bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--subtle)]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
