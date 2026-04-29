'use client';
// 프로필/큐레이션 등에서 사용하는 컴팩트 플리 썸네일 카드.
// PlaylistCard 와 동일한 클릭 인터셉트 로직 (데스크톱 = 패널 재생, 모바일 = 페이지 이동) +
// 재생 중 dim + sound wave 오버레이.

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { usePlayerStore } from '@/features/player/store';
import { createClient } from '@/lib/supabase/client';
import type { Playlist } from '@/types';

interface Props {
  id: string;
  title: string;
  thumbnailUrl: string;
  channelName: string;
  href: string;
}

export default function PlaylistThumbCard({ id, title, thumbnailUrl, channelName, href }: Props) {
  const [loading, setLoading] = useState(false);
  const load = usePlayerStore((s) => s.load);
  const currentPlaylistId = usePlayerStore((s) => s.playlistId);
  const status = usePlayerStore((s) => s.status);
  const isCurrent = currentPlaylistId === id;
  const isPlaying = isCurrent && status === 'playing';

  const handleClick = async (e: React.MouseEvent) => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(min-width: 1024px)').matches) return;
    e.preventDefault();

    if (isCurrent) {
      const s = usePlayerStore.getState();
      if (s.status === 'playing') s.pause();
      else s.play();
      return;
    }

    if (loading) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const [{ data: full }, { data: tracks }] = await Promise.all([
        supabase.from('playlists').select('*').eq('id', id).single(),
        supabase.from('tracks').select('*').eq('playlist_id', id).order('position'),
      ]);
      if (full) load(full as Playlist, tracks ?? []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Link href={href} onClick={handleClick} className="group block">
      <div className="relative aspect-video rounded-lg overflow-hidden bg-[var(--muted)] mb-1.5">
        <Image
          src={thumbnailUrl}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 50vw, 33vw"
          unoptimized
        />

        {/* 재생 중 dim + sound wave (PlaylistCard 와 동일 패턴) */}
        {isCurrent && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center pointer-events-none">
            {isPlaying ? (
              <div className="flex items-end gap-1 h-7" aria-label="재생 중">
                <span className="w-1 h-full bg-white rounded-full sound-wave-bar-1" />
                <span className="w-1 h-full bg-white rounded-full sound-wave-bar-2" />
                <span className="w-1 h-full bg-white rounded-full sound-wave-bar-3" />
              </div>
            ) : (
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24" aria-label="일시정지됨">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            )}
          </div>
        )}

        {/* 호버 ▶ — 재생 중이 아닐 때만 (loading spinner 포함) */}
        {!isCurrent && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              {loading ? (
                <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </div>
          </div>
        )}
      </div>
      <p className="text-xs font-medium line-clamp-2 leading-snug">{title}</p>
      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">{channelName}</p>
    </Link>
  );
}
