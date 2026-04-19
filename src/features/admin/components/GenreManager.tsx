'use client';
// Design Ref: home-redesign.design.md §5.10 — 관리자 장르 관리
// 목록 + 신규 추가 + 썸네일 업로드(공용 collection-banners 버킷 재사용)
// + position 조정 + is_active 토글 + 삭제

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import type { GenreRow } from '@/types';

const BUCKET = 'collection-banners';

interface RowProps {
  genre: GenreRow;
  onChange: (next: GenreRow) => void;
  onDelete: () => void;
}

function GenreRowItem({ genre, onChange, onDelete }: RowProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pos, setPos] = useState(genre.position);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `genre-${genre.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
      if (upErr) { alert('업로드 실패: ' + upErr.message); return; }
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const url = urlData?.publicUrl ?? null;

      const res = await fetch(`/api/admin/genres?id=${genre.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thumbnail_url: url }),
      });
      if (!res.ok) { alert('저장 실패'); return; }
      const updated = await res.json();
      onChange(updated);
    } finally { setUploading(false); }
  };

  const handleRemoveThumbnail = async () => {
    const res = await fetch(`/api/admin/genres?id=${genre.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thumbnail_url: null }),
    });
    if (!res.ok) { alert('저장 실패'); return; }
    onChange(await res.json());
  };

  const handleToggleActive = async () => {
    const res = await fetch(`/api/admin/genres?id=${genre.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !genre.is_active }),
    });
    if (!res.ok) return;
    onChange(await res.json());
  };

  const handlePositionBlur = async () => {
    if (pos === genre.position) return;
    const res = await fetch(`/api/admin/genres?id=${genre.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position: pos }),
    });
    if (!res.ok) { setPos(genre.position); return; }
    onChange(await res.json());
  };

  const handleDelete = async () => {
    if (!confirm(`"${genre.name}" 장르를 삭제할까요?`)) return;
    const res = await fetch(`/api/admin/genres?id=${genre.id}`, { method: 'DELETE' });
    if (!res.ok) { alert('삭제 실패'); return; }
    onDelete();
  };

  return (
    <tr className="border-t border-[var(--border)]">
      <td className="py-2 px-3 w-20">
        <input
          type="number"
          value={pos}
          onChange={(e) => setPos(Number(e.target.value) || 0)}
          onBlur={handlePositionBlur}
          className="w-14 text-xs bg-transparent px-2 py-1 rounded border border-[var(--border)] focus:outline-none focus:ring-1 focus:ring-[var(--subtle)] text-[var(--text-secondary)] tabular-nums"
        />
      </td>
      <td className="py-2 px-3 w-16">
        <div className="relative w-12 h-12 rounded-md overflow-hidden bg-[var(--muted)] flex-shrink-0">
          {genre.thumbnail_url ? (
            <Image src={genre.thumbnail_url} alt={genre.name} fill className="object-cover" sizes="48px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-[var(--text-secondary)]">
              {genre.name.charAt(0)}
            </div>
          )}
        </div>
      </td>
      <td className="py-2 px-3 text-sm font-medium text-[var(--foreground)]">{genre.name}</td>
      <td className="py-2 px-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] disabled:opacity-50"
          >
            {uploading ? '업로드 중…' : (genre.thumbnail_url ? '변경' : '업로드')}
          </button>
          {genre.thumbnail_url && (
            <button
              type="button"
              onClick={handleRemoveThumbnail}
              className="text-xs text-red-400 hover:text-red-300"
            >
              제거
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      </td>
      <td className="py-2 px-3">
        <button
          type="button"
          onClick={handleToggleActive}
          className={`text-xs px-2 py-1 rounded border transition-colors ${
            genre.is_active
              ? 'border-[var(--border)] text-[var(--foreground)]'
              : 'border-red-400/30 text-red-400'
          }`}
        >
          {genre.is_active ? '활성' : '비활성'}
        </button>
      </td>
      <td className="py-2 px-3 text-right">
        <button
          type="button"
          onClick={handleDelete}
          className="text-xs text-red-400 hover:text-red-300"
        >
          삭제
        </button>
      </td>
    </tr>
  );
}

export default function GenreManager() {
  const [list, setList] = useState<GenreRow[] | null>(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch('/api/admin/genres')
      .then((r) => r.json())
      .then((data) => setList(Array.isArray(data) ? data : []));
  }, []);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/genres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) { alert('생성 실패'); return; }
      const created: GenreRow = await res.json();
      setList((prev) => [...(prev ?? []), created].sort((a, b) => a.position - b.position));
      setNewName('');
    } finally { setCreating(false); }
  };

  return (
    <div>
      <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">
        장르 관리
      </h2>

      {/* 신규 추가 */}
      <div className="flex gap-2 mb-6">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          placeholder="새 장르 이름"
          className="flex-1 text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--subtle)]"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || !newName.trim()}
          className="px-4 py-2 text-sm font-medium bg-[var(--foreground)] text-[var(--background)] rounded-lg disabled:opacity-40 hover:opacity-80 transition-opacity"
        >
          {creating ? '추가 중…' : '추가'}
        </button>
      </div>

      {/* 목록 */}
      {list === null ? (
        <p className="text-sm text-[var(--text-secondary)] py-4 text-center">불러오는 중…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)] py-4 text-center">등록된 장르가 없어요</p>
      ) : (
        <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--card)]">
          <table className="w-full text-xs">
            <thead className="bg-[var(--muted)]">
              <tr className="text-left text-[var(--text-secondary)]">
                <th className="py-2 px-3 w-20">순서</th>
                <th className="py-2 px-3 w-16">썸네일</th>
                <th className="py-2 px-3">이름</th>
                <th className="py-2 px-3">이미지 관리</th>
                <th className="py-2 px-3">상태</th>
                <th className="py-2 px-3 w-16 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((g) => (
                <GenreRowItem
                  key={g.id}
                  genre={g}
                  onChange={(next) =>
                    setList((prev) =>
                      (prev ?? [])
                        .map((x) => (x.id === next.id ? next : x))
                        .sort((a, b) => a.position - b.position)
                    )
                  }
                  onDelete={() =>
                    setList((prev) => (prev ?? []).filter((x) => x.id !== g.id))
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
