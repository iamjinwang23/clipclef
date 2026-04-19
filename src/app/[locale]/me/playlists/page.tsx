'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  DndContext, PointerSensor, TouchSensor, closestCenter,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createClient } from '@/lib/supabase/client';
import { useUserPlaylists } from '@/features/user-playlist/hooks/useUserPlaylists';
import type { Playlist } from '@/types';

// ── 드래그 가능한 항목 컴포넌트 ──────────────────────────────────────────
function SortableItem({
  playlist, locale, userPlaylistId, otherPlaylists,
  moveMenu, setMoveMenu, onRemove, onMove, moveMenuRef,
}: {
  playlist: Playlist;
  locale: string;
  userPlaylistId: string;
  otherPlaylists: { id: string; name: string; is_default: boolean }[];
  moveMenu: { userPlaylistId: string; playlistId: string } | null;
  setMoveMenu: (v: { userPlaylistId: string; playlistId: string } | null) => void;
  onRemove: () => void;
  onMove: (toId: string) => void;
  moveMenuRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: playlist.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const isMoveOpen = moveMenu?.userPlaylistId === userPlaylistId && moveMenu?.playlistId === playlist.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--muted)] group bg-[var(--card)]"
    >
      {/* 드래그 핸들 */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 p-1 text-[var(--subtle)] hover:text-[var(--text-secondary)] cursor-grab active:cursor-grabbing touch-none"
        aria-label="순서 변경"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
        </svg>
      </button>

      {/* 썸네일 + 제목 */}
      <Link href={`/${locale}/playlist/${playlist.id}`} className="flex gap-2.5 items-center flex-1 min-w-0">
        <div className="relative w-16 aspect-video rounded overflow-hidden bg-[var(--muted)] flex-shrink-0">
          <Image src={playlist.thumbnail_url} alt={playlist.title} fill className="object-cover" sizes="64px" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium line-clamp-2 leading-snug">{playlist.title}</p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">{playlist.channel_name}</p>
        </div>
      </Link>

      {/* 액션 버튼 */}
      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity relative">
        {otherPlaylists.length > 0 && (
          <div className="relative" ref={isMoveOpen ? moveMenuRef : undefined}>
            <button
              onClick={() => setMoveMenu(isMoveOpen ? null : { userPlaylistId, playlistId: playlist.id })}
              title="다른 목록으로 이동"
              className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--card)] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
              </svg>
            </button>
            {isMoveOpen && (
              <div className="absolute right-0 top-7 w-44 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg z-50 py-1">
                <p className="px-3 py-1.5 text-[10px] text-[var(--text-secondary)] font-medium uppercase tracking-wide">이동할 목록</p>
                {otherPlaylists.map((target) => (
                  <button
                    key={target.id}
                    onClick={() => onMove(target.id)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--muted)] truncate transition-colors"
                  >
                    {target.name}
                    {target.is_default && <span className="ml-1 text-[var(--text-secondary)]">(기본)</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <button
          onClick={onRemove}
          title="목록에서 제거"
          className="p-1 rounded text-[var(--text-secondary)] hover:text-red-400 hover:bg-[var(--card)] transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────
export default function MyPlaylistsPage() {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const { playlists, create, remove, togglePublic, addItem, removeItem } = useUserPlaylists();
  const [items, setItems] = useState<Record<string, Playlist[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [moveMenu, setMoveMenu] = useState<{ userPlaylistId: string; playlistId: string } | null>(null);
  const moveMenuRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<string | null>(null); // userPlaylistId
  const [exportResult, setExportResult] = useState<Record<string, string>>({}); // id → youtube url
  const [needsYouTubeAuth, setNeedsYouTubeAuth] = useState(false);

  const supabase = createClient();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push(`/${locale}`); return; }
      setUserId(user.id);
    });
  }, [locale, router, supabase.auth]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moveMenuRef.current && !moveMenuRef.current.contains(e.target as Node)) {
        setMoveMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadItems = async (userPlaylistId: string, force = false) => {
    if (items[userPlaylistId] && !force) return;
    const { data } = await supabase
      .from('user_playlist_items')
      .select('playlist_id, playlists(*)')
      .eq('user_playlist_id', userPlaylistId)
      .order('position');
    const loaded = ((data ?? []) as unknown as { playlists: Playlist | null }[])
      .map((r) => r.playlists)
      .filter(Boolean) as Playlist[];
    setItems((prev) => ({ ...prev, [userPlaylistId]: loaded }));
  };

  const handleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); loadItems(id); }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try { await create(newName); setNewName(''); }
    finally { setCreating(false); }
  };

  const handleRemovePlaylist = async (id: string) => {
    if (!confirm('플레이리스트을 삭제할까요?')) return;
    await remove(id);
    setExpanded((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const handleRemoveItem = async (userPlaylistId: string, playlistId: string) => {
    await removeItem(userPlaylistId, playlistId);
    setItems((prev) => ({
      ...prev,
      [userPlaylistId]: prev[userPlaylistId]?.filter((p) => p.id !== playlistId) ?? [],
    }));
  };

  const handleMoveItem = async (fromId: string, toId: string, playlistId: string) => {
    setMoveMenu(null);
    await addItem(toId, playlistId);
    await removeItem(fromId, playlistId);
    setItems((prev) => ({
      ...prev,
      [fromId]: prev[fromId]?.filter((p) => p.id !== playlistId) ?? [],
    }));
    if (expanded.has(toId)) await loadItems(toId, true);
  };

  const handleDragEnd = (userPlaylistId: string) => async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const current = items[userPlaylistId] ?? [];
    const oldIndex = current.findIndex((p) => p.id === active.id);
    const newIndex = current.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(current, oldIndex, newIndex);

    // 즉시 UI 반영
    setItems((prev) => ({ ...prev, [userPlaylistId]: reordered }));

    // DB 순서 업데이트
    await Promise.all(
      reordered.map((p, i) =>
        supabase
          .from('user_playlist_items')
          .update({ position: i })
          .eq('user_playlist_id', userPlaylistId)
          .eq('playlist_id', p.id)
      )
    );
  };

  const handleExportToYouTube = async (pl: { id: string; name: string }) => {
    setExporting(pl.id);
    try {
      const res = await fetch('/api/youtube/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPlaylistId: pl.id, name: pl.name }),
      });
      const data = await res.json();
      if (res.status === 401 && data.error === 'youtube_not_connected') {
        setNeedsYouTubeAuth(true);
        return;
      }
      if (!res.ok) {
        alert(data.error ?? 'YouTube 내보내기에 실패했습니다');
        return;
      }
      setExportResult((prev) => ({ ...prev, [pl.id]: data.url }));
    } finally {
      setExporting(null);
    }
  };

  const handleConnectYouTube = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/${locale}/me/playlists`,
        scopes: 'https://www.googleapis.com/auth/youtube',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
  };

  const sorted = [...playlists].sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">내 플레이리스트</h1>
        {userId && (
          <Link href={`/${locale}/profile/${userId}`} className="text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] underline">
            공개 프로필 보기 →
          </Link>
        )}
      </div>

      {/* 새 플레이리스트 만들기 */}
      <div className="flex gap-2 mb-6">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="새 플레이리스트 이름"
          className="flex-1 text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--subtle)]"
        />
        <button
          onClick={handleCreate}
          disabled={!newName.trim() || creating}
          className="px-4 py-2 text-sm font-medium bg-[var(--foreground)] text-[var(--background)] rounded-lg disabled:opacity-40 hover:opacity-80 transition-opacity"
        >
          만들기
        </button>
      </div>

      {/* YouTube 연결 필요 안내 */}
      {needsYouTubeAuth && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm">
          <span className="flex-1 text-red-400">YouTube 계정 연결이 필요합니다. Google 재인증 후 다시 시도하세요.</span>
          <button
            onClick={handleConnectYouTube}
            className="flex-shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 transition-colors"
          >
            YouTube 연결
          </button>
          <button onClick={() => setNeedsYouTubeAuth(false)} className="text-red-500 hover:text-red-400 text-lg leading-none">×</button>
        </div>
      )}

      {playlists.length === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--text-secondary)]">아직 만든 플레이리스트이 없어요</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((pl) => {
            const isOpen = expanded.has(pl.id);
            const otherPlaylists = sorted.filter((x) => x.id !== pl.id);
            return (
              <div key={pl.id} className="border border-[var(--border)] rounded-lg">
                {/* 헤더 */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button onClick={() => handleExpand(pl.id)} className="flex-1 text-left flex items-center gap-2">
                    <svg
                      className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${isOpen ? 'rotate-90' : ''}`}
                      fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="font-medium text-sm">{pl.name}</span>
                    {pl.is_default && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--text-secondary)]">기본</span>
                    )}
                    {items[pl.id] && (
                      <span className="text-xs text-[var(--text-secondary)]">{items[pl.id].length}개</span>
                    )}
                  </button>
                  {exportResult[pl.id] ? (
                    <a
                      href={exportResult[pl.id]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-0.5 rounded-full border border-red-800/50 text-red-400 hover:bg-red-950/30 transition-colors"
                    >
                      YouTube ↗
                    </a>
                  ) : (
                    <button
                      onClick={() => handleExportToYouTube(pl)}
                      disabled={exporting === pl.id}
                      title="YouTube 계정에 플레이리스트으로 저장"
                      className="text-xs px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-40"
                    >
                      {exporting === pl.id ? '내보내는 중…' : 'YouTube로 저장'}
                    </button>
                  )}
                  <button
                    onClick={() => togglePublic(pl.id, !pl.is_public)}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      pl.is_public ? 'border-green-800/50 text-green-400 bg-green-950/30' : 'border-[var(--border)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {pl.is_public ? '공개' : '비공개'}
                  </button>
                  {!pl.is_default && (
                    <button onClick={() => handleRemovePlaylist(pl.id)} className="text-[var(--subtle)] hover:text-red-400 transition-colors text-lg leading-none">
                      ×
                    </button>
                  )}
                </div>

                {/* 항목 목록 (드래그 가능) */}
                {isOpen && (
                  <div className="border-t border-[var(--border)] px-3 py-3">
                    {!items[pl.id] ? (
                      <p className="text-xs text-[var(--text-secondary)] py-2 px-1">불러오는 중...</p>
                    ) : items[pl.id].length === 0 ? (
                      <p className="text-xs text-[var(--text-secondary)] py-2 px-1">담긴 플레이리스트가 없어요</p>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd(pl.id)}
                      >
                        <SortableContext
                          items={items[pl.id].map((p) => p.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-0.5">
                            {items[pl.id].map((p) => (
                              <SortableItem
                                key={p.id}
                                playlist={p}
                                locale={locale}
                                userPlaylistId={pl.id}
                                otherPlaylists={otherPlaylists}
                                moveMenu={moveMenu}
                                setMoveMenu={setMoveMenu}
                                onRemove={() => handleRemoveItem(pl.id, p.id)}
                                onMove={(toId) => handleMoveItem(pl.id, toId, p.id)}
                                moveMenuRef={moveMenuRef}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
