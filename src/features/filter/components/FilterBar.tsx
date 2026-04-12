'use client';
// Design Ref: §5.3 — FilterBar: 4종 필터 + 정렬 컨테이너
// mobile: 필터 스와이프 + 우측 gradient fade + 정렬 아이콘버튼

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useFilterStore } from '../store';
import FilterChip from './FilterChip';
import EraFilter from './EraFilter';
import { GENRE_OPTIONS, MOOD_OPTIONS, PLACE_OPTIONS } from '@/types';
import type { SortOption } from '@/types';

function SortIconButton() {
  const t = useTranslations('filter.sort');
  const { sort, setSort } = useFilterStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleBlur = () => setTimeout(() => setOpen(false), 150);

  const options: { value: SortOption; label: string }[] = [
    { value: 'latest', label: t('latest') },
    { value: 'likes', label: t('likes') },
    { value: 'views', label: t('views') },
  ];

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={handleBlur}
        title={t('label')}
        style={{ touchAction: 'manipulation' }}
        className={`p-1.5 rounded-lg border transition-colors ${
          sort !== 'latest'
            ? 'border-[var(--foreground)] text-[var(--foreground)]'
            : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:border-[var(--subtle)]'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M7 12h10M11 18h2" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-28 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg z-50 py-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setSort(opt.value); setOpen(false); }}
              style={{ touchAction: 'manipulation' }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                sort === opt.value
                  ? 'text-[var(--foreground)] font-medium'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--muted)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SortSelectDesktop() {
  const { sort, setSort } = useFilterStore();
  const t = useTranslations('filter.sort');
  const options: { value: SortOption; label: string }[] = [
    { value: 'latest', label: t('latest') },
    { value: 'likes', label: t('likes') },
    { value: 'views', label: t('views') },
  ];
  return (
    <select
      value={sort}
      onChange={(e) => setSort(e.target.value as SortOption)}
      className="text-sm border border-[var(--border)] rounded-lg px-2 py-1 bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--subtle)]"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

export default function FilterBar() {
  const t = useTranslations('filter');
  const { genre, mood, place, era, toggleGenre, toggleMood, togglePlace, toggleEra, reset } =
    useFilterStore();

  const activeFilters: { value: string; onRemove: () => void }[] = [
    ...genre.map((v) => ({ value: v, onRemove: () => toggleGenre(v) })),
    ...mood.map((v) => ({ value: v, onRemove: () => toggleMood(v) })),
    ...place.map((v) => ({ value: v, onRemove: () => togglePlace(v) })),
    ...era.map((v) => ({ value: v, onRemove: () => toggleEra(v) })),
  ];

  return (
    <div className="bg-[var(--background)]">
      <div className="max-w-6xl mx-auto px-4 pt-3 pb-2 space-y-2">
        {/* 필터 + 정렬 단일 행 */}
        <div className="flex items-center gap-2">
          {/* 필터 칩 스크롤 영역 (그라데이션 마스크) */}
          <div className="relative flex-1 min-w-0">
            <div
              className="flex items-center gap-2 overflow-x-auto scrollbar-hide"
              style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
            >
              <FilterChip label={t('genre')} options={GENRE_OPTIONS} selected={genre} onToggle={toggleGenre} />
              <FilterChip label={t('mood')} options={MOOD_OPTIONS} selected={mood} onToggle={toggleMood} />
              <FilterChip label={t('place')} options={PLACE_OPTIONS} selected={place} onToggle={togglePlace} />
              <EraFilter />
              {/* 스크롤 끝 여백 — 모바일 전용 */}
              <div className="sm:hidden w-10 flex-shrink-0" aria-hidden />
            </div>

            {/* 우측 그라데이션 페이드 — 모바일 전용 */}
            <div
              className="sm:hidden absolute right-0 top-0 bottom-0 w-10 pointer-events-none"
              style={{ background: 'linear-gradient(to right, transparent, var(--background))' }}
            />
          </div>

          {/* 정렬 아이콘 버튼 — 모바일 전용 */}
          <div className="sm:hidden">
            <SortIconButton />
          </div>

          {/* 정렬 — 데스크톱 전용 (아이콘 + select) */}
          <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
            <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M7 12h10M11 18h2" />
            </svg>
            <SortSelectDesktop />
          </div>
        </div>

        {/* 선택된 필터 태그 */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {activeFilters.map(({ value, onRemove }) => (
              <span
                key={value}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[var(--muted)] text-[var(--foreground)]"
              >
                {value}
                <button onClick={onRemove} className="hover:text-[var(--foreground)] leading-none" aria-label={`Remove ${value}`}>
                  ×
                </button>
              </span>
            ))}
            <button onClick={reset} className="text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] ml-1">
              {t('reset')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
