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
import { toast } from '@/lib/toast';
import { resizeImage } from '@/lib/image-resize';
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
  const [newCoverFile, setNewCoverFile] = useState<File | null>(null);
  const [newCoverPreview, setNewCoverPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [moveMenu, setMoveMenu] = useState<{ userPlaylistId: string; playlistId: string } | null>(null);
  const moveMenuRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push(`/${locale}`);
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

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewCoverFile(file);
    setNewCoverPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleCoverRemove = () => {
    setNewCoverFile(null);
    if (newCoverPreview) URL.revokeObjectURL(newCoverPreview);
    setNewCoverPreview(null);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      let coverUrl: string | null = null;
      if (newCoverFile) {
        const compressed = await resizeImage(newCoverFile);
        const ext = compressed.name.split('.').pop();
        const path = `user-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('collection-banners')
          .upload(path, compressed, { upsert: true });
        if (upErr) {
          toast.error('이미지 업로드 실패: ' + upErr.message);
          return;
        }
        const { data: urlData } = supabase.storage
          .from('collection-banners')
          .getPublicUrl(path);
        coverUrl = urlData?.publicUrl ?? null;
      }
      await create(newName, coverUrl);
      setNewName('');
      handleCoverRemove();
    } finally {
      setCreating(false);
    }
  };

  const handleRemovePlaylist = async (id: string) => {
    if (!confirm('큐레이션을 삭제할까요?')) return;
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

  const sorted = [...playlists].sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">내 큐레이션</h1>
      </div>

      {/* 새 큐레이션 만들기 */}
      <div className="mb-6 space-y-2">
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="새 큐레이션 이름"
            className="flex-1 text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--subtle)]"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || creating}
            className="px-4 py-2 text-sm font-medium bg-[var(--foreground)] text-[var(--background)] rounded-lg disabled:opacity-40 hover:opacity-80 transition-opacity"
          >
            {creating ? '만드는 중…' : '만들기'}
          </button>
        </div>

        {/* 커버 이미지 (선택) */}
        <div>
          {newCoverPreview ? (
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={newCoverPreview} alt="커버 미리보기" className="w-32 h-16 object-cover rounded" />
              <button onClick={handleCoverRemove} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                삭제
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-dashed border-[var(--subtle)] rounded-lg cursor-pointer hover:border-[var(--text-secondary)] transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4 4 4" />
                </svg>
                커버 이미지 첨부 (선택)
                <input type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
              </label>
              <p className="text-[10px] text-[var(--subtle)] leading-relaxed">
                권장 사이즈: <span className="text-[var(--text-secondary)]">웹 1920×480px · 모바일 750×750px</span> · JPG / WebP · 최대 5MB
              </p>
            </div>
          )}
        </div>
      </div>

      {playlists.length === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--text-secondary)]">아직 만든 큐레이션이 없어요</p>
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
