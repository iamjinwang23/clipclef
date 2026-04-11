'use client';
// Design Ref: §5.4 — 관리자 플레이리스트 목록 테이블
import { useTranslations } from 'next-intl';
import { useAdminPlaylists } from '../hooks/useAdminPlaylists';
import type { Playlist } from '@/types';

interface PlaylistTableProps {
  onEdit: (playlist: Playlist) => void;
}

export default function PlaylistTable({ onEdit }: PlaylistTableProps) {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const { playlists, toggleActive, deletePlaylist } = useAdminPlaylists();

  if (playlists.isLoading) {
    return <div className="py-6 text-sm text-[var(--text-secondary)]">{tCommon('loading')}</div>;
  }

  const items = playlists.data ?? [];

  if (items.length === 0) {
    return <p className="py-6 text-sm text-[var(--text-secondary)]">{t('empty')}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <colgroup>
          <col className="w-[45%]" />
          <col className="w-[25%]" />
          <col className="w-14" />
          <col className="w-16" />
          <col className="w-20" />
        </colgroup>
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left py-2 pr-3 text-xs font-medium text-[var(--text-secondary)]">플레이리스트</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">채널</th>
            <th className="text-right py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">좋아요</th>
            <th className="text-center py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">공개</th>
            <th className="py-2 pl-3 text-xs font-medium text-[var(--text-secondary)]" />
          </tr>
        </thead>
        <tbody>
          {items.map((pl) => (
            <tr key={pl.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)] transition-colors">
              <td className="py-3 pr-3 max-w-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pl.thumbnail_url} alt="" className="w-12 h-8 object-cover rounded" />
                    {pl.is_ai && (
                      <span className="absolute top-0.5 left-0.5 bg-violet-600 text-white text-[9px] font-bold px-1 py-px rounded leading-none">
                        AI
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-sm truncate">{pl.title}</p>
                </div>
              </td>
              <td className="py-3 px-3 text-xs text-[var(--text-secondary)] truncate max-w-0">{pl.channel_name}</td>
              <td className="py-3 px-3 text-right tabular-nums text-xs text-[var(--text-secondary)]">{pl.like_count}</td>
              <td className="py-3 px-3 text-center">
                <button
                  onClick={() => toggleActive.mutate({ id: pl.id, is_active: !pl.is_active })}
                  className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                    pl.is_active ? 'bg-green-950/30 text-green-400 border border-green-800/50' : 'bg-[var(--muted)] text-[var(--text-secondary)]'
                  }`}
                >
                  {pl.is_active ? '공개' : '비공개'}
                </button>
              </td>
              <td className="py-3 pl-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onEdit(pl)}
                    className="text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => { if (confirm('삭제하시겠습니까?')) deletePlaylist.mutate(pl.id); }}
                    className="text-xs text-[var(--subtle)] hover:text-red-400 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
