'use client';
// Design Ref: §5.3 — PlaylistCard: CollectionGrid 디자인 통일
// 썸네일 + 호버 재생 오버레이 + 텍스트 스택 (카드 배경 없음)
// Phase 3: 데스크톱 클릭 → 페이지 전환 없이 우측 패널에서 재생 (라우팅 모델 A)
//          모바일 클릭 → 기존 페이지 이동 (BottomNav 패턴 유지)
//          현재 재생 중인 카드 → dim overlay + sound wave (다음 commit)

import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useState } from 'react';
import type { Playlist } from '@/types';
import ChannelAvatar from './ChannelAvatar';
import { usePlayerStore } from '@/features/player/store';
import { createClient } from '@/lib/supabase/client';

// 카드가 실제로 렌더에 쓰는 필드만 타입으로 노출 → over-fetch 방지
export type PlaylistCardData = Pick<
  Playlist,
  | 'id'
  | 'title'
  | 'thumbnail_url'
  | 'channel_id'
  | 'channel_name'
  | 'editor_note'
  | 'is_ai'
  | 'like_count'
  | 'comment_count'
>;

interface PlaylistCardProps {
  playlist: PlaylistCardData;
}

export default function PlaylistCard({ playlist }: PlaylistCardProps) {
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const load = usePlayerStore((s) => s.load);

  const handleClick = async (e: React.MouseEvent) => {
    // 모바일은 기존 페이지 이동 동작 유지
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(min-width: 640px)').matches) return;

    // 데스크톱: 페이지 전환 없이 우측 패널에서 재생
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const [{ data: full }, { data: tracks }] = await Promise.all([
        supabase.from('playlists').select('*').eq('id', playlist.id).single(),
        supabase.from('tracks').select('*').eq('playlist_id', playlist.id).order('position'),
      ]);
      if (full) {
        load(full as Playlist, tracks ?? []);
        // URL 무변 — 라우팅 모델 A. 명시적 공유 시에만 query-param URL 생성 (Phase 3-라)
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group relative">
      <Link href={`/${locale}/playlist/${playlist.id}`} onClick={handleClick}>
        {/* 썸네일 */}
        <div className="relative w-full aspect-video rounded-md sm:rounded-xl overflow-hidden bg-[var(--muted)] mb-2 ring-[0.5px] ring-white/20">
          <Image
            src={playlist.thumbnail_url}
            alt={playlist.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />

          {/* AI 뱃지 */}
          {playlist.is_ai && (
            <div className="absolute top-2 left-2 bg-violet-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              AI
            </div>
          )}

          {/* 호버 재생 아이콘 오버레이 (데스크톱) */}
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

        </div>

        {/* 제목 */}
        <p className="text-sm font-medium line-clamp-2 leading-snug">
          {playlist.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <ChannelAvatar channelId={playlist.channel_id} channelName={playlist.channel_name} size={14} />
          <p className="text-xs text-[var(--text-secondary)] truncate">{playlist.channel_name}</p>
        </div>
        {playlist.editor_note && (
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2 italic leading-relaxed">
            &ldquo;{playlist.editor_note}&rdquo;
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] mt-1">
          <span className="flex items-center gap-0.5">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            {playlist.like_count.toLocaleString()}
          </span>
          <span className="flex items-center gap-0.5">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M13.5 3a8.5 8.5 0 0 1 0 17H13v.99A1.01 1.01 0 0 1 11.989 22c-2.46-.002-4.952-.823-6.843-2.504C3.238 17.798 2.002 15.275 2 12.009V11.5A8.5 8.5 0 0 1 10.5 3zm-5 7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m7 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3"/></svg>
            {playlist.comment_count.toLocaleString()}
          </span>
        </div>
      </Link>
    </div>
  );
}
