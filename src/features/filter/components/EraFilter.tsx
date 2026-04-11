'use client';
// Design Ref: §5.4 — 시대 드롭다운 필터 (장르/분위기/장소와 동일 형식)

import { useTranslations } from 'next-intl';
import { useFilterStore } from '../store';
import FilterChip from './FilterChip';
import { ERA_OPTIONS } from '@/types';

export default function EraFilter() {
  const t = useTranslations('filter');
  const { era, toggleEra } = useFilterStore();

  return (
    <FilterChip
      label={t('era')}
      options={ERA_OPTIONS}
      selected={era}
      onToggle={toggleEra}
    />
  );
}
