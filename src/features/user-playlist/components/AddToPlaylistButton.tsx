'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUserPlaylists } from '../hooks/useUserPlaylists';

interface Props {
  playlistId: string;
  isLoggedIn: boolean;
  iconOnly?: boolean;
  responsive?: boolean;
}

export default function AddToPlaylistButton({ playlistId, isLoggedIn, iconOnly = false, responsive = false }: Props) {
  const { playlists, create, addItem, removeItem, getItemIds, fetch } = useUserPlaylists();
  const [open, setOpen] = useState(false);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const [newName, setNewName] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowInput(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 팝오버 열릴 때 각 목록에 담겨 있는지 확인
  useEffect(() => {
    if (!open || playlists.length === 0) return;
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        playlists.map(async (p) => {
          const ids = await getItemIds(p.id);
          return [p.id, ids.includes(playlistId)] as [string, boolean];
        })
      );
      if (!cancelled) setAddedIds(Object.fromEntries(results));
    })();
    return () => { cancelled = true; };
  }, [open, playlists, playlistId, getItemIds]);

  const handleOpen = async () => {
    if (!isLoggedIn) {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/api/auth/callback` },
      });
      return;
    }
    await fetch();
    setOpen(true);
  };

  const handleToggle = async (userPlaylistId: string) => {
    setPending(userPlaylistId);
    try {
      if (addedIds[userPlaylistId]) {
        await removeItem(userPlaylistId, playlistId);
        setAddedIds((prev) => ({ ...prev, [userPlaylistId]: false }));
      } else {
        await addItem(userPlaylistId, playlistId);
        setAddedIds((prev) => ({ ...prev, [userPlaylistId]: true }));
      }
    } finally {
      setPending(null);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setPending('new');
    try {
      const created = await create(newName);
      if (created) {
        await addItem(created.id, playlistId);
        setAddedIds((prev) => ({ ...prev, [created.id]: true }));
      }
      setNewName('');
      setShowInput(false);
    } finally {
      setPending(null);
    }
  };

  const fullBtnClass = 'flex items-center gap-1.5 px-4 py-2 rounded-full border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--subtle)] hover:text-[var(--foreground)] transition-colors';
  const iconBtnClass = 'flex items-center justify-center px-3 py-2 rounded-full border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:border-[var(--subtle)] hover:text-[var(--foreground)] transition-colors';
  const plusIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );

  return (
    <div ref={ref} className="relative">
      {responsive ? (
        <>
          {/* 데스크톱: 텍스트 풀버튼 */}
          <button onClick={handleOpen} title="담기" className={`hidden sm:flex ${fullBtnClass}`}>
            {plusIcon}
            담기
          </button>
          {/* 모바일: 아이콘 전용 */}
          <button onClick={handleOpen} title="담기" className={`sm:hidden ${iconBtnClass}`}>
            {plusIcon}
          </button>
        </>
      ) : (
        <button
          onClick={handleOpen}
          title="담기"
          className={iconOnly ? iconBtnClass : fullBtnClass}
        >
          {plusIcon}
          {!iconOnly && '담기'}
        </button>
      )}

      {open && (
        <div className="absolute left-0 mt-2 w-60 bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-2xl z-50 py-1">
          {playlists.length === 0 && !showInput && (
            <p className="px-4 py-3 text-xs text-[var(--text-secondary)]">아직 만든 플레이리스트이 없어요</p>
          )}

          {playlists.map((p) => {
            const isAdded = addedIds[p.id] ?? false;
            const isLoading = pending === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleToggle(p.id)}
                disabled={isLoading}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-[var(--muted)] transition-colors disabled:opacity-50"
              >
                <span className="truncate text-left">{p.name}</span>
                {isAdded ? (
                  <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-[var(--subtle)] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                )}
              </button>
            );
          })}

          <div className="border-t border-[var(--border)] mt-1 pt-1">
            {showInput ? (
              <div className="px-3 py-2 flex gap-1.5">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="플레이리스트 이름"
                  className="flex-1 text-xs border border-[var(--border)] rounded px-2 py-1.5 bg-[var(--muted)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--subtle)]"
                />
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || pending === 'new'}
                  className="text-xs font-medium px-2 py-1.5 bg-[var(--foreground)] text-[var(--background)] rounded disabled:opacity-40"
                >
                  만들기
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowInput(true)}
                className="w-full text-left px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                새 플레이리스트 만들기
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
