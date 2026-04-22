'use client';

// Design Ref: §5.1 — 홈 § 2 에디토리얼·컬렉션 섹션 (F6 혼합 선반)
// 관리자 curated + 유저 published user_playlists를 published_at DESC 혼합

import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { useMixedShelf } from '../hooks/useMixedShelf';
import ScrollRail from '@/components/ui/ScrollRail';
import UserAvatar from '@/components/ui/UserAvatar';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import type { MixedShelfItem } from '@/app/api/mixed-shelf/route';

interface MixedShelfProps {
  limit?: number;
}

export default function MixedShelf({ limit = 12 }: MixedShelfProps) {
  const { data, isLoading } = useMixedShelf(limit);

  if (isLoading) {
    return (
      <ScrollRail>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-[220px] flex-shrink-0 animate-pulse">
            <div className="aspect-video rounded-lg bg-[var(--muted)] mb-2" />
            <div className="h-3.5 bg-[var(--muted)] rounded w-4/5 mb-1.5" />
            <div className="h-3 bg-[var(--muted)] rounded w-3/5" />
          </div>
        ))}
      </ScrollRail>
    );
  }

  const items = data ?? [];
  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-[var(--text-secondary)]">
        첫 에디토리얼을 기다리고 있어요
      </div>
    );
  }

  return (
    <ScrollRail>
      {items.map((item) => (
        <MixedShelfCard key={`${item.source}-${item.id}`} item={item} />
      ))}
    </ScrollRail>
  );
}

function MixedShelfCard({ item }: { item: MixedShelfItem }) {
  const locale = useLocale();
  const href =
    item.source === 'curated'
      ? `/${locale}/collection/${item.id}`
      : item.creator
      ? `/${locale}/profile/${item.creator.id}`
      : `/${locale}/me/library`;

  return (
    <Link
      href={href}
      className="group w-[220px] flex-shrink-0"
    >
      {/* 커버 */}
      <div className="relative aspect-video rounded-lg overflow-hidden bg-[var(--muted)] mb-2 ring-[0.5px] ring-white/20">
        {item.cover_url ? (
          <Image
            src={item.cover_url}
            alt={item.title}
            fill
            sizes="220px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--subtle)] to-[var(--muted)] flex items-center justify-center">
            <span className="text-[var(--text-secondary)] text-sm">
              {item.source === 'curated' ? '에디토리얼' : '컬렉션'}
            </span>
          </div>
        )}
        {/* 소스 배지 */}
        <div className="absolute top-2 left-2">
          <span className={`
            inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide
            ${item.source === 'curated'
              ? 'bg-[var(--foreground)] text-[var(--background)]'
              : 'bg-black/60 text-white backdrop-blur-sm'}
          `}>
            {item.source === 'curated' ? '에디토리얼' : '컬렉션'}
          </span>
        </div>
      </div>

      {/* 제목 + 메타 */}
      <h3 className="text-sm font-semibold leading-snug line-clamp-2 mb-1 group-hover:text-[var(--foreground)] transition-colors">
        {item.title}
      </h3>
      {item.caption && (
        <p className="text-xs text-[var(--text-secondary)] line-clamp-1 mb-1.5">
          {item.caption}
        </p>
      )}

      {/* 소스별 footer */}
      {item.source === 'user' && item.creator ? (
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
          <UserAvatar
            src={item.creator.avatar_url}
            name={item.creator.display_name}
            size={14}
          />
          <span className="truncate">{item.creator.display_name ?? '익명'}</span>
          {item.creator.is_verified && <VerifiedBadge size={10} />}
        </div>
      ) : (
        <div className="text-xs text-[var(--text-secondary)]">
          clip/clef 큐레이션
        </div>
      )}
    </Link>
  );
}
