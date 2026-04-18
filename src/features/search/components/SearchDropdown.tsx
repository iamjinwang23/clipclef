'use client';
// Design Ref: §5.1 — shared quick-search dropdown used by Header, SearchOverlay, and /search input mode
// Order: artists → users → channels → videos (Plan SC 1)

import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useSearch } from '../hooks/useSearch';
import { useBatchFollow } from '../hooks/useBatchFollow';
import { DROPDOWN_LIMITS, type SearchLimits } from '../types';
import ChannelAvatar from '@/features/playlist/components/ChannelAvatar';
import UserFollowChip from './UserFollowChip';

// Small inline debounce hook — avoids a project-wide util file for one use site
function useDebouncedValue<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

interface SearchDropdownProps {
  query: string;
  /** When the user clicks a result, close the dropdown (e.g. set focused=false on Header). */
  onSelect?: () => void;
  /** "전체 결과 보기" click: e.g. router.push('/search?q=...') */
  onViewAll?: (query: string) => void;
  limits?: SearchLimits;
  /** Optional footer CTA label; defaults to 전체 결과 보기. */
  viewAllLabel?: string;
}

export default function SearchDropdown({
  query,
  onSelect,
  onViewAll,
  limits,
  viewAllLabel,
}: SearchDropdownProps) {
  const locale = useLocale();
  const debounced = useDebouncedValue(query.trim(), 300);
  const { data, loading } = useSearch(debounced, limits ?? DROPDOWN_LIMITS);

  const userIds = useMemo(() => data.users.map((u) => u.id), [data.users]);
  const { map: followMap, meId } = useBatchFollow(userIds);

  if (!debounced) return null;

  const { artists, users, channels, videos } = data;
  const hasAny = artists.length + users.length + channels.length + videos.length > 0;

  return (
    <div className="p-2">
      {loading && hasAny === false && (
        <p className="text-xs text-[var(--subtle)] px-2 py-1.5">검색 중...</p>
      )}
      {!loading && !hasAny && (
        <p className="text-sm text-[var(--subtle)] text-center py-4">검색 결과가 없습니다</p>
      )}

      {/* 1) 아티스트 */}
      {artists.length > 0 && (
        <Section label="아티스트">
          {artists.map((a) => (
            <Link
              key={a.slug}
              href={`/${locale}/artist/${a.slug}`}
              onClick={onSelect}
              className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[var(--muted)]">
                {a.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.image_url} alt={a.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[var(--text-secondary)]">
                    {a.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-sm font-medium text-[var(--foreground)] truncate">{a.name}</span>
              {/* Plan SC 2: removed 우측 "아티스트" label */}
            </Link>
          ))}
        </Section>
      )}

      {/* 2) 사용자 */}
      {users.length > 0 && (
        <Section label="사용자">
          {users.map((u) => (
            <Link
              key={u.id}
              href={`/${locale}/profile/${u.id}`}
              onClick={onSelect}
              className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[var(--muted)]">
                {u.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[var(--text-secondary)]">
                    {(u.display_name ?? '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="flex-1 min-w-0 text-sm font-medium text-[var(--foreground)] truncate">
                {u.display_name ?? '이름 없음'}
              </span>
              <UserFollowChip
                userId={u.id}
                initialFollowing={followMap.get(u.id) ?? false}
                currentUserId={meId}
              />
            </Link>
          ))}
        </Section>
      )}

      {/* 3) 채널 — 전용 채널 랜딩 페이지로 이동 */}
      {channels.length > 0 && (
        <Section label="채널">
          {channels.map((c) => (
            <Link
              key={c.channel_id}
              href={`/${locale}/channel/${encodeURIComponent(c.channel_id)}`}
              onClick={onSelect}
              className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
            >
              <ChannelAvatar channelId={c.channel_id} channelName={c.channel_name} size={32} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--foreground)] truncate">{c.channel_name}</p>
                <p className="text-xs text-[var(--text-secondary)]">플레이리스트 {c.count}개</p>
              </div>
            </Link>
          ))}
        </Section>
      )}

      {/* 4) 영상 */}
      {videos.length > 0 && (
        <Section label="플레이리스트">
          {videos.map((p) => (
            <Link
              key={p.id}
              href={`/${locale}/playlist/${p.id}`}
              onClick={onSelect}
              className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
            >
              {p.thumbnail_url && (
                <div className="relative w-14 h-8 rounded flex-shrink-0 overflow-hidden">
                  <Image src={p.thumbnail_url} alt="" fill className="object-cover" sizes="56px" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate text-[var(--foreground)]">{p.title}</p>
                <p className="text-xs text-[var(--text-secondary)] truncate">{p.channel_name}</p>
              </div>
            </Link>
          ))}
        </Section>
      )}

      {/* 전체 결과 보기 */}
      {hasAny && onViewAll && (
        <button
          type="button"
          onClick={() => onViewAll(debounced)}
          className="w-full text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] py-2.5 text-center border-t border-[var(--border)] mt-1"
        >
          {viewAllLabel ?? `'${debounced}' 전체 결과 보기 →`}
        </button>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2 last:mb-0">
      <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1 px-2">
        {label}
      </p>
      <div>{children}</div>
    </div>
  );
}
