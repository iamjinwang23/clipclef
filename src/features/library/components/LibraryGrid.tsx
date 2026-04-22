'use client';

// Design Ref: §5.1 — /me/library 페이지 그리드
// Plan FR-07: 저장한 플리 + 내가 만든 컬렉션 + 발행 필터 탭

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useLibrary } from '../hooks/useLibrary';
import PlaylistCard from '@/features/playlist/components/PlaylistCard';
import PublishFlow from '@/features/curation/components/PublishFlow';

type Tab = 'saved' | 'my-collections' | 'published';

export default function LibraryGrid() {
  const locale = useLocale();
  const { data, isLoading } = useLibrary();
  const [tab, setTab] = useState<Tab>('saved');
  const [publishOpen, setPublishOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="py-10 text-center text-sm text-[var(--text-secondary)]">
        불러오는 중…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-10 text-center text-sm text-[var(--text-secondary)]">
        로그인이 필요합니다
      </div>
    );
  }

  const savedCount = data.savedPlaylists.length;
  // 기본 저장함(is_default)은 "내가 만든 컬렉션"에서 제외 — 저장한 플리 탭이 그 역할
  const myCollections = data.userPlaylists.filter((up) => !up.is_default);
  const myCollectionsCount = myCollections.length;
  const publishedCount = data.publishedCount;

  // Plan FR-08: 저장 3+ 일 때 발행 CTA 노출 (M5 PublishFlow 연결)
  const canPublish = savedCount >= 3;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-6">내 라이브러리</h1>

      {/* 탭 */}
      <div className="flex gap-2 mb-6 border-b border-[var(--border)]">
        <TabButton active={tab === 'saved'} onClick={() => setTab('saved')}>
          저장한 플리 <CountBadge>{savedCount}</CountBadge>
        </TabButton>
        <TabButton active={tab === 'my-collections'} onClick={() => setTab('my-collections')}>
          내가 만든 컬렉션 <CountBadge>{myCollectionsCount}</CountBadge>
        </TabButton>
        <TabButton active={tab === 'published'} onClick={() => setTab('published')}>
          발행한 것 <CountBadge>{publishedCount}</CountBadge>
        </TabButton>
      </div>

      {/* Publish CTA — 저장 3+ 시 노출 */}
      {tab === 'saved' && canPublish && (
        <div className="mb-6 p-4 rounded-xl bg-[var(--muted)] border border-[var(--border)] flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              이 플리들을 묶어서 컬렉션으로 발행해보세요
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              내 취향을 다른 사람들과 공유할 수 있어요
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPublishOpen(true)}
            className="
              flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium
              bg-[var(--foreground)] text-[var(--background)]
              hover:opacity-90 transition-opacity
            "
          >
            묶어서 발행 →
          </button>
        </div>
      )}

      {/* 탭 컨텐츠 */}
      {tab === 'saved' && (
        <>
          {savedCount === 0 ? (
            <EmptyState message="아직 저장한 플리가 없어요. 홈에서 마음에 드는 플리를 저장해보세요." />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {data.savedPlaylists.map((p) => (
                <PlaylistCard key={p.id} playlist={p} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'my-collections' && (
        <>
          {myCollectionsCount === 0 ? (
            <EmptyState message="아직 만든 컬렉션이 없어요. 저장한 플리 3개 이상이 되면 묶어서 발행할 수 있어요." />
          ) : (
            <div className="space-y-3">
              {myCollections.map((up) => (
                <Link
                  key={up.id}
                  href={`/${locale}/me/playlists`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--muted)] transition-colors border border-[var(--border)]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{up.name}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {up.published_at ? '발행됨' : '비공개'}
                      {up.caption ? ` · ${up.caption}` : ''}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'published' && (
        <>
          {publishedCount === 0 ? (
            <EmptyState message="아직 발행한 컬렉션이 없어요." />
          ) : (
            <div className="space-y-3">
              {myCollections
                .filter((up) => up.published_at !== null)
                .map((up) => (
                  <Link
                    key={up.id}
                    href={`/${locale}/me/playlists`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--muted)] transition-colors border border-[var(--border)]"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{up.name}</p>
                      {up.caption && (
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">
                          {up.caption}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </>
      )}

      {/* 발행 모달 */}
      <PublishFlow
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        savedPlaylists={data.savedPlaylists}
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        px-3 py-2 text-sm font-medium transition-colors
        border-b-2 -mb-px
        ${
          active
            ? 'border-[var(--foreground)] text-[var(--foreground)]'
            : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--foreground)]'
        }
      `}
    >
      {children}
    </button>
  );
}

function CountBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1 text-xs text-[var(--subtle)] tabular-nums">{children}</span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center text-sm text-[var(--text-secondary)]">
      {message}
    </div>
  );
}
