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
import ArtistCard from '@/features/artist/components/ArtistCard';
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

  // 로딩 / 빈 결과에도 상단 헤더는 유지해 사용자가 무엇을 검색했는지 맥락 제공
  const header = (
    <h1 className="text-xl font-semibold leading-snug">
      <span className="text-[var(--foreground)]">&apos;{query}&apos;</span>
      <span className="text-[var(--text-secondary)]"> 검색 결과</span>
    </h1>
  );

  if (loading && !hasAny) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {header}
        <p className="text-center text-sm text-[var(--subtle)]">검색 중...</p>
      </div>
    );
  }
  if (!hasAny) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {header}
        <p className="text-center text-sm text-[var(--subtle)]">검색 결과가 없습니다</p>
      </div>
    );
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

  // 채널은 전용 랜딩 페이지 /channel/{id} 로 이동 (Link로 처리)

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-10">
      {header}

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
                <Link
                  href={`/${locale}/channel/${encodeURIComponent(c.channel_id)}`}
                  className="flex items-center gap-3 py-3 hover:bg-[var(--muted)] rounded-lg px-2 -mx-2 transition-colors"
                >
                  <ChannelAvatar channelId={c.channel_id} channelName={c.channel_name} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">{c.channel_name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">플레이리스트 {c.count}개</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 아티스트 — 플리 상세 ArtistStrip과 동일한 가로 스트립 + ArtistCard */}
      {data.artists.length > 0 && (
        <section>
          <SectionHeader label="아티스트" />
          <div className="flex gap-4 overflow-x-auto py-1 scrollbar-hide">
            {data.artists.map((a) => (
              <ArtistCard
                key={a.slug}
                name={a.name}
                slug={a.slug}
                imageUrl={a.image_url}
                locale={locale}
              />
            ))}
          </div>
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

// 플리 상세 페이지(ArtistStrip)와 동일한 레이블 스타일로 통일
function SectionHeader({ label }: { label: string }) {
  return (
    <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
      {label}
    </h2>
  );
}
