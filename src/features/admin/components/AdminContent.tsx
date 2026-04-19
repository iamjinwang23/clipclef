'use client';
// 관리자 페이지 — 탭 기반 네비게이션

import { useState } from 'react';
import { useAdminPlaylists } from '../hooks/useAdminPlaylists';
import PlaylistForm from './PlaylistForm';
import PlaylistTable from './PlaylistTable';
import CollectionManager from './CollectionManager';
import GenreManager from './GenreManager';
import AdminMembers from './AdminMembers';
import type { Playlist } from '@/types';

interface TrackRow {
  position: number;
  title: string;
  artist: string;
  start_sec: number | null;
  duration_sec: number | null;
  youtube_video_id: string | null;
}

interface EditTarget {
  playlist: Playlist;
  tracks: TrackRow[];
}

type Tab = 'playlists' | 'collections' | 'genres' | 'members' | 'reports' | 'dashboard';

const TABS: { id: Tab; label: string }[] = [
  { id: 'playlists',   label: '플레이리스트 관리' },
  { id: 'collections', label: '큐레이션 관리' },
  { id: 'genres',      label: '장르 관리' },
  { id: 'members',     label: '회원 관리' },
  { id: 'reports',     label: '신고 관리' },
  { id: 'dashboard',   label: '방문자 대시보드' },
];

export default function AdminContent({ uploadedBy }: { uploadedBy?: string }) {
  const { fetchTracks } = useAdminPlaylists();
  const [activeTab, setActiveTab] = useState<Tab>('playlists');
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);

  const handleEdit = async (playlist: Playlist) => {
    setIsLoadingTracks(true);
    try {
      const raw = await fetchTracks(playlist.id);
      const tracks = raw.map((t) => ({ ...t, artist: t.artist ?? '' }));
      setEditTarget({ playlist, tracks });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsLoadingTracks(false);
    }
  };

  const handleComplete = () => setEditTarget(null);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold mb-6">관리자</h1>

      {/* 탭 네비게이션 */}
      <div className="flex gap-1 mb-8 overflow-x-auto border-b border-[var(--border)] pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setEditTarget(null); }}
            className={`flex-shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-[var(--foreground)] text-[var(--foreground)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--foreground)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'playlists' && (
        <>
          <section className="mb-10">
            <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">
              {editTarget ? `수정: ${editTarget.playlist.title}` : '플레이리스트 등록'}
            </h2>
            <div className="border border-[var(--border)] rounded-xl p-6 bg-[var(--card)]">
              <PlaylistForm
                key={editTarget?.playlist.id ?? 'new'}
                editTarget={editTarget ?? undefined}
                onComplete={handleComplete}
                uploadedBy={uploadedBy}
              />
            </div>
          </section>
          <section>
            <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">
              등록된 플레이리스트
            </h2>
            <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--card)]">
              <PlaylistTable onEdit={handleEdit} />
              {isLoadingTracks && (
                <div className="py-2 text-center text-xs text-[var(--text-secondary)]">트랙 불러오는 중...</div>
              )}
            </div>
          </section>
        </>
      )}

      {activeTab === 'collections' && (
        <section>
          <div className="border border-[var(--border)] rounded-xl p-6 bg-[var(--card)]">
            <CollectionManager />
          </div>
        </section>
      )}

      {activeTab === 'genres' && (
        <section>
          <div className="border border-[var(--border)] rounded-xl p-6 bg-[var(--card)]">
            <GenreManager />
          </div>
        </section>
      )}

      {activeTab === 'members' && <AdminMembers />}

      {activeTab === 'reports' && (
        <Placeholder title="신고 관리" desc="신고 내역 관리 기능은 준비 중입니다." />
      )}

      {activeTab === 'dashboard' && (
        <Placeholder title="방문자 대시보드" desc="방문자 통계 기능은 준비 중입니다." />
      )}
    </div>
  );
}

function Placeholder({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="border border-[var(--border)] rounded-xl p-10 text-center bg-[var(--card)]">
      <p className="text-sm font-medium text-[var(--foreground)] mb-1">{title}</p>
      <p className="text-xs text-[var(--text-secondary)]">{desc}</p>
    </div>
  );
}
