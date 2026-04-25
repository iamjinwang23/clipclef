'use client';

// Design Ref: §5.1 — 홈 § 2 큐레이션 섹션 (F6 혼합 선반)
// 관리자 curated + 유저 published user_playlists를 published_at DESC 혼합
// 카드 구조: 올린이 헤더(상단) → 썸네일 → 제목/카피 — Instagram 스타일

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
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-5 h-5 rounded-full bg-[var(--muted)]" />
              <div className="h-3 w-20 bg-[var(--muted)] rounded" />
            </div>
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
        첫 큐레이션을 기다리고 있어요
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
  // 큐레이션 라우팅 통일 (curation-route-unify): admin/user 둘 다 큐레이션 상세 페이지로
  const href = `/${locale}/collection/${item.id}`;

  return (
    <Link href={href} className="group w-[220px] flex-shrink-0 block">
      {/* 상단 올린이 헤더 (Instagram 스타일) */}
      <CreatorHeader item={item} />

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
              큐레이션
            </span>
          </div>
        )}
      </div>

      {/* 제목 + 카피 */}
      <h3 className="text-sm font-semibold leading-snug line-clamp-2 mb-1 group-hover:text-[var(--foreground)] transition-colors">
        {item.title}
      </h3>
      {item.caption && (
        <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
          {item.caption}
        </p>
      )}
    </Link>
  );
}

function CreatorHeader({ item }: { item: MixedShelfItem }) {
  if (item.source === 'curated') {
    // 브랜드 표시 — clip/clef 큐레이션 (출처는 아바타+이름으로 식별)
    return (
      <div className="flex items-center gap-1.5 mb-2">
        <div
          className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center bg-[var(--foreground)] text-[var(--background)] text-[10px] font-bold ring-[0.5px] ring-white/20"
          aria-hidden="true"
        >
          c
        </div>
        <span className="text-xs font-semibold text-[var(--foreground)] truncate">
          clip/clef
        </span>
      </div>
    );
  }

  // user 소스 — 발행자 프로필
  if (!item.creator) {
    return <div className="h-5 mb-2" aria-hidden="true" />;
  }

  return (
    <div className="flex items-center gap-1.5 mb-2">
      <UserAvatar
        src={item.creator.avatar_url}
        name={item.creator.display_name}
        size={20}
      />
      <span className="text-xs font-semibold truncate">
        {item.creator.display_name ?? '익명'}
      </span>
      {item.creator.is_verified && <VerifiedBadge size={12} />}
    </div>
  );
}
