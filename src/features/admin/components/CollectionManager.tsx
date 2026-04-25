'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { resizeImage } from '@/lib/image-resize';
import type { CuratedCollection, Playlist } from '@/types';

// ── 큐레이션 항목 플레이리스트 선택 팝업 ────────────────────────────────────────────
function PlaylistPicker({
  currentIds,
  onAdd,
  onClose,
}: {
  collectionId: string;
  currentIds: string[];
  onAdd: (playlist: Playlist) => void;
  onClose: () => void;
}) {
  const [all, setAll] = useState<Playlist[]>([]);
  const supabase = createClient();

  useEffect(() => {
    supabase.from('playlists').select('*').eq('is_active', true).order('created_at', { ascending: false })
      .then(({ data }) => setAll((data ?? []) as Playlist[]));
  }, [supabase]);

  const available = all.filter((p) => !currentIds.includes(p.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl w-full max-w-md max-h-[70vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <p className="text-sm font-semibold">플레이리스트 추가</p>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--foreground)] text-xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-[var(--border)]">
          {available.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-secondary)]">추가 가능한 플레이리스트가 없어요</p>
          ) : (
            available.map((p) => (
              <button
                key={p.id}
                onClick={() => { onAdd(p); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--muted)] transition-colors text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumbnail_url} alt="" className="w-16 h-10 object-cover rounded flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{p.title}</p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">{p.channel_name}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── 단일 큐레이션 카드 ──────────────────────────────────────────────────────
function CollectionCard({
  collection,
  onDelete,
  onUpdate,
}: {
  collection: CuratedCollection & { items: Playlist[] };
  onDelete: () => void;
  onUpdate: (updated: CuratedCollection & { items: Playlist[] }) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [saving, setSaving] = useState(false);
  // editable fields
  const [editTitle, setEditTitle] = useState(collection.title);
  const [editDescription, setEditDescription] = useState(collection.description ?? '');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeBanner, setRemoveBanner] = useState(false);
  const supabase = createClient();

  const hasChanges =
    editTitle.trim() !== collection.title ||
    editDescription !== (collection.description ?? '') ||
    pendingFile !== null ||
    removeBanner;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRemoveBanner(false);
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleRemoveBanner = () => {
    setPendingFile(null);
    setPreviewUrl(null);
    setRemoveBanner(true);
  };

  const handleSave = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      let bannerUrl: string | null | undefined = undefined; // undefined = no change

      if (removeBanner) {
        bannerUrl = null;
      } else if (pendingFile) {
        // 업로드 전 리사이즈(≤1200px, JPEG 82%) — 대역폭·쿼터 절감, 원본이 작으면 그대로
        const compressed = await resizeImage(pendingFile);
        const ext = compressed.name.split('.').pop();
        const path = `${collection.id}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('collection-banners')
          .upload(path, compressed, { upsert: true });
        if (upErr) { alert('이미지 업로드 실패: ' + upErr.message); return; }
        const { data: urlData } = supabase.storage
          .from('collection-banners')
          .getPublicUrl(path);
        bannerUrl = urlData?.publicUrl ?? null;
      }

      const body: Record<string, unknown> = {
        collectionId: collection.id,
        title: editTitle.trim(),
        description: editDescription.trim() || null,
      };
      if (bannerUrl !== undefined) body.banner_image_url = bannerUrl;

      const res = await fetch('/api/admin/collections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert('저장 실패: ' + (err.error ?? res.status));
        return;
      }

      const updated: CuratedCollection & { items: Playlist[] } = {
        ...collection,
        title: editTitle.trim(),
        ...(bannerUrl !== undefined ? { banner_image_url: bannerUrl } : {}),
      };
      onUpdate(updated);
      setEditDescription(updated.description ?? '');
      setPendingFile(null);
      setPreviewUrl(null);
      setRemoveBanner(false);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    setToggling(true);
    await fetch('/api/admin/collections', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectionId: collection.id, is_active: !collection.is_active }),
    });
    onUpdate({ ...collection, is_active: !collection.is_active });
    setToggling(false);
  };

  const removeItem = async (playlistId: string) => {
    await fetch('/api/admin/collections', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectionId: collection.id, playlistId }),
    });
    onUpdate({ ...collection, items: collection.items.filter((p) => p.id !== playlistId) });
  };

  const addItem = async (playlist: Playlist) => {
    const position = collection.items.length;
    const res = await fetch('/api/admin/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectionId: collection.id, playlistId: playlist.id, position }),
    });
    if (res.ok) {
      onUpdate({ ...collection, items: [...collection.items, playlist] });
    }
  };

  // current banner to display (pending preview > saved url > null)
  const displayBanner = removeBanner ? null : (previewUrl ?? collection.banner_image_url);

  return (
    <div className="border border-[var(--border)] rounded-lg">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => setIsOpen(!isOpen)} className="flex-shrink-0">
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <span className="font-medium text-sm flex-1 min-w-0 truncate">{collection.title}</span>
        <span className="text-xs text-gray-400 flex-shrink-0">{collection.items.length}개</span>
        <button
          onClick={toggleActive}
          disabled={toggling}
          className={`text-xs px-2 py-0.5 rounded-full border transition-colors flex-shrink-0 ${
            collection.is_active ? 'border-green-800/50 text-green-400 bg-green-950/20' : 'border-[var(--border)] text-[var(--text-secondary)]'
          }`}
        >
          {collection.is_active ? '활성' : '비활성'}
        </button>
        <button onClick={onDelete} className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0">×</button>
      </div>

      {isOpen && (
        <div className="border-t border-[var(--border)] px-4 py-3 space-y-3">
          {/* 타이틀 수정 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-[var(--text-secondary)] font-medium">타이틀</p>
              <span className="text-[10px] text-[var(--subtle)]">{editTitle.length}/30</span>
            </div>
            <textarea
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              maxLength={30}
              rows={2}
              className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--subtle)] resize-none"
            />
          </div>

          {/* 설명 수정 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-[var(--text-secondary)] font-medium">설명 (선택)</p>
              <span className="text-[10px] text-[var(--subtle)]">{editDescription.length}/30</span>
            </div>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              maxLength={30}
              rows={2}
              placeholder="짧은 설명을 입력하세요"
              className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--subtle)] resize-none"
            />
          </div>

          {/* 배너 이미지 */}
          <div>
            <p className="text-xs text-[var(--text-secondary)] mb-1.5 font-medium">배너 이미지</p>
            {displayBanner ? (
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={displayBanner} alt="배너" className="w-32 h-16 object-cover rounded" />
                <button onClick={handleRemoveBanner} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                  삭제
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-dashed border-[var(--subtle)] rounded-lg cursor-pointer hover:border-[var(--text-secondary)] transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4 4 4" />
                  </svg>
                  이미지 첨부
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                </label>
                <p className="text-[10px] text-[var(--subtle)] leading-relaxed">
                  권장 사이즈: <span className="text-[var(--text-secondary)]">웹 1920×480px · 모바일 750×750px</span><br />
                  권장 포맷: <span className="text-[var(--text-secondary)]">JPG / WebP</span> · 최대 5MB
                </p>
              </div>
            )}
          </div>

          {/* 저장 버튼 */}
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={saving || !editTitle.trim()}
              className="w-full py-2 text-xs font-medium bg-[var(--foreground)] text-[var(--background)] rounded-lg disabled:opacity-40 hover:opacity-80 transition-opacity"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          )}

          {/* 플레이리스트 목록 */}
          {collection.items.length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)]">담긴 플레이리스트가 없어요</p>
          ) : (
            collection.items.map((p) => (
              <div key={p.id} className="flex items-center gap-3 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumbnail_url} alt="" className="w-14 h-9 object-cover rounded flex-shrink-0" />
                <p className="flex-1 text-xs line-clamp-1">{p.title}</p>
                <button
                  onClick={() => removeItem(p.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-lg leading-none"
                >×</button>
              </div>
            ))
          )}
          <button
            onClick={() => setShowPicker(true)}
            className="w-full mt-2 py-1.5 text-xs border border-dashed border-[var(--subtle)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:border-[var(--text-secondary)] transition-colors"
          >
            + 플레이리스트 추가
          </button>
        </div>
      )}

      {showPicker && (
        <PlaylistPicker
          collectionId={collection.id}
          currentIds={collection.items.map((p) => p.id)}
          onAdd={addItem}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────
export default function CollectionManager() {
  const [collections, setCollections] = useState<(CuratedCollection & { items: Playlist[] })[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/collections')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data) setCollections(data);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    const res = await fetch('/api/admin/collections', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim(), position: collections.length }),
    });
    if (res.ok) {
      const created = await res.json();
      setCollections((prev) => [...prev, { ...created, items: [] }]);
      setNewTitle('');
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('큐레이션을 삭제할까요?')) return;
    await fetch('/api/admin/collections', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectionId: id }),
    });
    setCollections((prev) => prev.filter((c) => c.id !== id));
  };

  const handleUpdate = (updated: CuratedCollection & { items: Playlist[] }) => {
    setCollections((prev) => prev.map((c) => c.id === updated.id ? updated : c));
  };

  return (
    <div>
      {/* 새 큐레이션 만들기 */}
      <div className="flex gap-2 mb-4">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          maxLength={30}
          placeholder="큐레이션 이름 (최대 30자)"
          className="flex-1 text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--subtle)]"
        />
        <button
          onClick={handleCreate}
          disabled={!newTitle.trim() || creating}
          className="px-4 py-2 text-sm font-medium bg-[var(--foreground)] text-[var(--background)] rounded-lg disabled:opacity-40 hover:opacity-80 transition-opacity"
        >
          만들기
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">불러오는 중...</p>
      ) : collections.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)] py-4 text-center">아직 큐레이션이 없어요</p>
      ) : (
        <div className="space-y-2">
          {collections.map((c) => (
            <CollectionCard
              key={c.id}
              collection={c}
              onDelete={() => handleDelete(c.id)}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
