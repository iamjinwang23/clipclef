'use client';
// Design Ref: §3.2 — 상태 소유자. CollectionGrid + CollectionPlayer 조율
// curation-route-unify: user 소스 큐레이션은 상단에 올린이 헤더(Avatar + name + Follow chip)

import { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { createBrowserClient } from '@supabase/ssr';
import type { Playlist, Track } from '@/types';
import type { YTPlayer } from '@/types/youtube';
import CollectionGrid from './CollectionGrid';
import CollectionPlayer from './CollectionPlayer';
import UserAvatar from '@/components/ui/UserAvatar';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import UserFollowChip from '@/features/search/components/UserFollowChip';

interface Creator {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

interface CollectionPageClientProps {
  playlists: Playlist[];
  locale: string;
  collectionTitle: string;
  collectionDescription: string | null;
  itemCount: number;
  bannerImageUrl: string | null;
  creator?: Creator | null;
  currentUserId?: string | null;
  initialFollowing?: boolean;
}

export default function CollectionPageClient({
  playlists,
  locale,
  collectionTitle,
  collectionDescription,
  itemCount,
  bannerImageUrl,
  creator = null,
  currentUserId = null,
  initialFollowing = false,
}: CollectionPageClientProps) {
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTracklistOpen, setIsTracklistOpen] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [activeTrackIndex, setActiveTrackIndex] = useState<number | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  const fetchTracks = useCallback(async (playlistId: string) => {
    setTracksLoading(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data } = await supabase
        .from('tracks')
        .select('*')
        .eq('playlist_id', playlistId)
        .order('position');
      setTracks(data ?? []);
    } finally {
      setTracksLoading(false);
    }
  }, []);

  // Plan SC-01: 재생 시작
  const handlePlay = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsPlaying(true);
    setIsTracklistOpen(false);
    setActiveTrackIndex(null);
    fetchTracks(playlists[index].id);
  }, [playlists, fetchTracks]);

  // Plan SC-02: 다음 플레이리스트
  const handleNext = useCallback(() => {
    if (currentIndex === null || currentIndex >= playlists.length - 1) return;
    const next = currentIndex + 1;
    setCurrentIndex(next);
    setIsPlaying(true);
    setIsTracklistOpen(false);
    setActiveTrackIndex(null);
    fetchTracks(playlists[next].id);
  }, [currentIndex, playlists, fetchTracks]);

  // Plan SC-03: 이전 플레이리스트
  const handlePrev = useCallback(() => {
    if (currentIndex === null || currentIndex <= 0) return;
    const prev = currentIndex - 1;
    setCurrentIndex(prev);
    setIsPlaying(true);
    setIsTracklistOpen(false);
    setActiveTrackIndex(null);
    fetchTracks(playlists[prev].id);
  }, [currentIndex, playlists, fetchTracks]);

  // 재생/일시정지 토글
  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // Plan SC-04: 트랙리스트 토글
  const handleToggleTracklist = useCallback(() => {
    setIsTracklistOpen((prev) => !prev);
  }, []);

  // Plan SC-05: 트랙 seek
  const handleSeek = useCallback((sec: number, trackIndex: number) => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(sec, true);
    playerRef.current.playVideo?.();
    setIsPlaying(true);
    setActiveTrackIndex(trackIndex);
  }, []);

  const registerPlayer = useCallback((player: YTPlayer | null) => {
    playerRef.current = player;
  }, []);

  // 타이틀 영역 플레이 버튼 핸들러
  const handleTitlePlay = useCallback(() => {
    if (currentIndex !== null) {
      handleTogglePlay();
    } else {
      handlePlay(0);
    }
  }, [currentIndex, handleTogglePlay, handlePlay]);

  const showPause = currentIndex !== null && isPlaying;

  return (
    <div className={currentIndex !== null ? 'pb-20' : ''}>
      {/* 올린이 헤더 — user 소스 큐레이션 전용 */}
      {creator && (
        <div className="flex items-center gap-3 mb-4 mt-2">
          <UserAvatar src={creator.avatar_url} name={creator.display_name} size={36} />
          <div className="flex-1 min-w-0">
            <a
              href={`/${locale}/profile/${creator.id}`}
              className="text-sm font-semibold inline-flex items-center gap-1 hover:underline"
            >
              <span className="truncate">{creator.display_name ?? '익명'}</span>
              {creator.is_verified && <VerifiedBadge size={14} />}
            </a>
          </div>
          <UserFollowChip
            userId={creator.id}
            initialFollowing={initialFollowing}
            currentUserId={currentUserId}
          />
        </div>
      )}

      {/* 히어로: 배너 이미지 + 그라디언트 + 타이틀 오버레이 */}
      <div className="relative -mx-4 w-[calc(100%+2rem)] sm:mx-0 sm:w-full aspect-square sm:aspect-[16/6] sm:rounded-xl overflow-hidden bg-[var(--muted)] mb-6">
        {bannerImageUrl && (
          <Image
            src={bannerImageUrl}
            alt={collectionTitle}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 640px) 100vw, 896px"
          />
        )}
        {!bannerImageUrl && (
          <div className="absolute inset-0 flex flex-col justify-end px-4 sm:px-6 pb-5">
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-widest mb-1">
              큐레이션 · 플레이리스트 {itemCount}개
            </p>
            <h1 className="text-2xl font-bold leading-snug whitespace-pre-line">{collectionTitle}</h1>
            {collectionDescription && (
              <p className="text-sm text-[var(--text-secondary)] mt-1 whitespace-pre-line">{collectionDescription}</p>
            )}
          </div>
        )}
        {bannerImageUrl && (
          <>
            {/* 하단 그라디언트 오버레이 */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0D0D0D 0%, rgba(13,13,13,0.7) 40%, transparent 100%)' }} />

            {/* 타이틀 + 플레이 버튼 */}
            <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-5 pt-10 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-1">
                  큐레이션 · 플레이리스트 {itemCount}개
                </p>
                <h1 className="text-2xl font-bold leading-snug whitespace-pre-line text-white">{collectionTitle}</h1>
                {collectionDescription && (
                  <p className="text-sm text-white/70 mt-1 whitespace-pre-line">{collectionDescription}</p>
                )}
              </div>

              {/* 흰색 원 + 검정 아이콘 */}
              <button
                onClick={handleTitlePlay}
                className="flex-shrink-0 w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform duration-150"
                aria-label={showPause ? '일시정지' : '처음부터 재생'}
              >
                {showPause ? (
                  <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      <CollectionGrid
        playlists={playlists}
        currentIndex={currentIndex}
        locale={locale}
        onPlay={handlePlay}
      />

      <CollectionPlayer
        playlists={playlists}
        currentIndex={currentIndex}
        isPlaying={isPlaying}
        isTracklistOpen={isTracklistOpen}
        tracks={tracks}
        tracksLoading={tracksLoading}
        activeTrackIndex={activeTrackIndex}
        onTogglePlay={handleTogglePlay}
        onPrev={handlePrev}
        onNext={handleNext}
        onToggleTracklist={handleToggleTracklist}
        onSeek={handleSeek}
        registerPlayer={registerPlayer}
      />
    </div>
  );
}
