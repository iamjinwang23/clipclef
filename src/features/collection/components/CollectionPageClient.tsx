'use client';
// Design Ref: §3.2 — 상태 소유자. CollectionGrid + CollectionPlayer 조율

import { useState, useCallback, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { Playlist, Track } from '@/types';
import CollectionGrid from './CollectionGrid';
import CollectionPlayer from './CollectionPlayer';

interface CollectionPageClientProps {
  playlists: Playlist[];
  locale: string;
  collectionTitle: string;
  collectionDescription: string | null;
  itemCount: number;
}

export default function CollectionPageClient({
  playlists,
  locale,
  collectionTitle,
  collectionDescription,
  itemCount,
}: CollectionPageClientProps) {
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTracklistOpen, setIsTracklistOpen] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [activeTrackIndex, setActiveTrackIndex] = useState<number | null>(null);
  const playerRef = useRef<any>(null);

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

  // Plan SC-02: 다음 플리
  const handleNext = useCallback(() => {
    if (currentIndex === null || currentIndex >= playlists.length - 1) return;
    const next = currentIndex + 1;
    setCurrentIndex(next);
    setIsPlaying(true);
    setIsTracklistOpen(false);
    setActiveTrackIndex(null);
    fetchTracks(playlists[next].id);
  }, [currentIndex, playlists, fetchTracks]);

  // Plan SC-03: 이전 플리
  const handlePrev = useCallback(() => {
    if (currentIndex === null || currentIndex <= 0) return;
    const prev = currentIndex - 1;
    setCurrentIndex(prev);
    setIsPlaying(true);
    setIsTracklistOpen(false);
    setActiveTrackIndex(null);
    fetchTracks(playlists[prev].id);
  }, [currentIndex, playlists, fetchTracks]);

  // Plan SC-06: 종료
  const handleStop = useCallback(() => {
    setCurrentIndex(null);
    setIsPlaying(false);
    setIsTracklistOpen(false);
    setTracks([]);
    setActiveTrackIndex(null);
    playerRef.current?.stopVideo?.();
  }, []);

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

  const registerPlayer = useCallback((player: any) => {
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
      {/* 타이틀 + Spotify 스타일 플레이 버튼 */}
      <div className="flex items-center justify-between pt-5 pb-4">
        <div className="min-w-0 pr-4">
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-widest mb-1">
            큐레이션 컬렉션 · 플리 {itemCount}개
          </p>
          <h1 className="text-2xl font-bold leading-snug whitespace-pre-line">{collectionTitle}</h1>
          {collectionDescription && (
            <p className="text-sm text-[var(--text-secondary)] mt-1 whitespace-pre-line">{collectionDescription}</p>
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
