'use client';
// Design Ref: §5.3 — dedicated results page at /search?q=
// Plan SC 5, 6: 5 sections (videos/users/channels/artists/tags), empty sections hidden,
// tag chip click applies the tag filter then navigates home.

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import PlaylistCard from '@/features/playlist/components/PlaylistCard';
import ChannelAvatar from '@/features/playlist/components/ChannelAvatar';
import { useSearch } from '../hooks/useSearch';
import { useBatchFollow } from '../hooks/useBatchFollow';
import { RESULTS_LIMITS, type TagCategory } from '../types';
import { useFilterStore } from '@/features/filter/store';
import UserFollowChip from './UserFollowChip';

interface SearchResultsProps {
  query: string;
}

export default function SearchResults({ query }: SearchResultsProps) {
  const locale = useLocale();
  const router = useRouter();
  const { data, loading } = useSearch(query, RESULTS_LIMITS);

  const userIds = useMemo(() => data.users.map((u) => u.id), [data.users]);
  const { map: followMap, meId } = useBatchFollow(userIds);

  const filterStore = useFilterStore();

  const hasAny =
    data.videos.length + data.users.length + data.channels.length + data.artists.length + data.tags.length > 0;

  if (loading && !hasAny) {
    return <p className="px-4 py-10 text-center text-sm text-[var(--subtle)]">검색 중...</p>;
  }
  if (!hasAny) {
    return <p className="px-4 py-10 text-center text-sm text-[var(--subtle)]">검색 결과가 없습니다</p>;
  }

  const handleTagClick = (category: TagCategory, label: string) => {
    // Plan SC 6: apply tag → home
    filterStore.reset();
    if (category === 'genre') filterStore.setGenre([label]);
    else if (category === 'mood') filterStore.setMood([label]);
    else if (category === 'place') filterStore.setPlace([label]);
    else if (category === 'era') filterStore.setEra([label]);
    router.push(`/${locale}`);
  };

  const handleChannelClick = (channelId: string) => {
    filterStore.setChannelId(channelId);
    router.push(`/${locale}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-10">
      {/* 영상 */}
      {data.videos.length > 0 && (
        <section>
          <SectionHeader label="영상" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.videos.map((p) => (
              <PlaylistCard key={p.id} playlist={p} />
            ))}
          </div>
        </section>
      )}

      {/* 사용자 */}
      {data.users.length > 0 && (
        <section>
          <SectionHeader label="사용자" />
          <ul className="divide-y divide-[var(--border)]">
            {data.users.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/${locale}/profile/${u.id}`}
                  className="flex items-center gap-3 py-3 hover:bg-[var(--muted)] rounded-lg px-2 -mx-2 transition-colors"
                >
                  <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-[var(--muted)]">
                    {u.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-[var(--text-secondary)]">
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
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 채널 */}
      {data.channels.length > 0 && (
        <section>
          <SectionHeader label="채널" />
          <ul className="divide-y divide-[var(--border)]">
            {data.channels.map((c) => (
              <li key={c.channel_id}>
                <button
                  type="button"
                  onClick={() => handleChannelClick(c.channel_id)}
                  className="w-full flex items-center gap-3 py-3 hover:bg-[var(--muted)] rounded-lg px-2 -mx-2 transition-colors text-left"
                >
                  <ChannelAvatar channelId={c.channel_id} channelName={c.channel_name} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">{c.channel_name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">플리 {c.count}개</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 아티스트 */}
      {data.artists.length > 0 && (
        <section>
          <SectionHeader label="아티스트" />
          <ul className="divide-y divide-[var(--border)]">
            {data.artists.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/${locale}/artist/${a.slug}`}
                  className="flex items-center gap-3 py-3 hover:bg-[var(--muted)] rounded-lg px-2 -mx-2 transition-colors"
                >
                  <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-[var(--muted)]">
                    {a.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.image_url} alt={a.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-[var(--text-secondary)]">
                        {a.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-[var(--foreground)] truncate">{a.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 태그 */}
      {data.tags.length > 0 && (
        <section>
          <SectionHeader label="태그" />
          <div className="flex flex-wrap gap-1.5">
            {data.tags.map((t) => (
              <button
                key={`${t.category}:${t.label}`}
                type="button"
                onClick={() => handleTagClick(t.category, t.label)}
                className="text-sm px-2.5 py-1 bg-[var(--muted)] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--border)] rounded-full transition-colors"
              >
                #{t.label} <span className="text-[var(--subtle)]">{t.count}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">{label}</h2>
  );
}
