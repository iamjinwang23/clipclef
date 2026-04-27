'use client';
// Phase 2-3: 데스크톱 우측 now-playing 패널.
// - 데스크톱(`>=sm`) 전용. 모바일은 기존 MiniBar / ExpandedView 패턴 유지.
// - 패널이 마운트되면 panelActive=true → in-page ExpandedView 가 슬롯 등록 양보.
// - 슬롯 메커니즘: ExpandedView 와 동일한 IntersectionObserver/ResizeObserver/scroll 측정.
// - C2 패널 콘텐츠: 구버전 /playlist/[id] UI 를 그대로 가져옴 — UploaderCard(영상 위), 메타+에디터 노트,
//   4 액션(좋아요·저장·공유·유튜브) 좌우 스와이프, 트랙 리스트, 태그, ArtistStrip, 댓글.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { usePlayerStore } from '@/features/player/store';
import type { Track } from '@/types';
import { createClient } from '@/lib/supabase/client';
import UploaderCard from '@/features/interaction/components/UploaderCard';
import LikeButton from '@/features/interaction/components/LikeButton';
import SaveButton from '@/features/interaction/components/SaveButton';
import ChannelAvatar from '@/features/playlist/components/ChannelAvatar';
import ArtistStrip from '@/features/artist/components/ArtistStrip';
import CommentForm from '@/features/interaction/components/CommentForm';
import CommentList from '@/features/interaction/components/CommentList';
import { toArtistSlug, extractMainArtist } from '@/lib/artist-apis';
import { toast } from '@/lib/toast';
import { SITE_URL } from '@/lib/seo';

const PANEL_WIDTH_KEY = 'clipclef_panel_width';
const PANEL_WIDTH_MIN = 280;
const PANEL_WIDTH_MAX = 540;
const PANEL_WIDTH_DEFAULT = 380;

function formatDuration(sec: number | null) {
  if (!sec) return '--:--';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface UploaderInfo {
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

export default function RightNowPlayingPanel() {
  const locale = useLocale();
  const slotRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const playlist = usePlayerStore((s) => s.playlist);
  const tracks = usePlayerStore((s) => s.tracks);
  const currentTrackIndex = usePlayerStore((s) => s.currentTrackIndex);
  const playlistId = usePlayerStore((s) => s.playlistId);
  const seekToTrack = usePlayerStore((s) => s.seekToTrack);

  // 모바일에서는 패널 자체 mount 안 함 — panelActive 충돌 방지. lazy init + change listener
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(min-width: 640px)').matches;
  });
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // 폭 (drag resize + localStorage persist) — lazy init, SSR 시 default
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return PANEL_WIDTH_DEFAULT;
    const saved = localStorage.getItem(PANEL_WIDTH_KEY);
    if (!saved) return PANEL_WIDTH_DEFAULT;
    const n = parseInt(saved, 10);
    if (!Number.isFinite(n)) return PANEL_WIDTH_DEFAULT;
    return Math.min(PANEL_WIDTH_MAX, Math.max(PANEL_WIDTH_MIN, n));
  });

  // 업로더 + 로그인 정보 — playlistId 변화 시 fetch
  const [uploader, setUploader] = useState<UploaderInfo | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setIsLoggedIn(!!data.user);
    });

    const uploaderId = playlist?.uploaded_by;
    if (!uploaderId) {
      // 다음 tick 으로 미뤄 effect body 직접 setState 방지 (cascading render 회피)
      Promise.resolve().then(() => { if (!cancelled) setUploader(null); });
      return () => { cancelled = true; };
    }
    supabase
      .from('profiles')
      .select('display_name, avatar_url, is_verified')
      .eq('id', uploaderId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setUploader((data as UploaderInfo) ?? null);
      });
    return () => { cancelled = true; };
  }, [playlist?.uploaded_by, playlist?.id]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    let latest = startW;
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX;
      latest = Math.min(PANEL_WIDTH_MAX, Math.max(PANEL_WIDTH_MIN, startW + delta));
      setWidth(latest);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
      try { localStorage.setItem(PANEL_WIDTH_KEY, String(latest)); } catch {}
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // panelActive 플래그
  useEffect(() => {
    usePlayerStore.getState().setPanelActive(true);
    return () => {
      usePlayerStore.getState().setPanelActive(false);
      const state = usePlayerStore.getState();
      if (state.view !== 'hidden') state.setView('mini');
      state.setExpandedRect(null);
    };
  }, []);

  // 슬롯 측정 — panel 내부 overflow-y-auto 컨테이너 스크롤도 listen
  useEffect(() => {
    const el = slotRef.current;
    const scrollEl = scrollContainerRef.current;
    if (!el) return;
    if (!playlist) return;

    let raf: number | null = null;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      usePlayerStore.getState().setExpandedRect({
        top: r.top, left: r.left, width: r.width, height: r.height,
      });
    };
    const scheduleMeasure = () => {
      if (raf != null) return;
      raf = requestAnimationFrame(() => { raf = null; measure(); });
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        const current = usePlayerStore.getState().view;
        if (current === 'hidden') return;
        if (entry.isIntersecting) {
          usePlayerStore.getState().setView('expanded');
          measure();
        } else {
          usePlayerStore.getState().setView('mini');
        }
      },
      { threshold: 0.1 }
    );
    io.observe(el);
    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(el);
    // 패널 내부 스크롤 + 윈도우 스크롤/리사이즈 모두 listen
    if (scrollEl) scrollEl.addEventListener('scroll', scheduleMeasure, { passive: true });
    window.addEventListener('scroll', scheduleMeasure, { passive: true });
    window.addEventListener('resize', scheduleMeasure);
    scheduleMeasure();
    return () => {
      io.disconnect();
      ro.disconnect();
      if (scrollEl) scrollEl.removeEventListener('scroll', scheduleMeasure);
      window.removeEventListener('scroll', scheduleMeasure);
      window.removeEventListener('resize', scheduleMeasure);
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [playlist, playlistId]);

  // 공유 — 현 플리 URL 클립보드 복사
  const handleShare = async () => {
    if (!playlist) return;
    const url = `${SITE_URL}/${locale}/playlist/${playlist.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.info('링크가 클립보드에 복사되었습니다');
    } catch {
      toast.info('복사에 실패했습니다');
    }
  };

  // 현재 플리에서 아티스트 slug 추출 (구버전 동일)
  const artistSlugs = (() => {
    if (!tracks.length) return [];
    const map = new Map<string, { name: string; slug: string }>();
    for (const t of tracks) {
      if (!t.artist) continue;
      const slug = toArtistSlug(t.artist);
      if (slug && !map.has(slug)) {
        map.set(slug, { name: extractMainArtist(t.artist), slug });
      }
    }
    return [...map.values()];
  })();

  const allTags = playlist
    ? [...playlist.genre, ...playlist.mood, ...playlist.place, ...playlist.era]
    : [];

  // 모바일에서는 panel mount 자체 안 함 — panelActive 충돌 방지 (ExpandedView 가 정상 작동)
  if (!isDesktop) return null;

  return (
    <aside
      className="flex flex-col h-screen bg-[var(--card)] border-l border-[var(--border)] flex-shrink-0 relative"
      style={{ width }}
      aria-label="현재 재생 패널"
    >
      {/* 좌측 drag 핸들 */}
      <div
        onMouseDown={handleResizeStart}
        role="separator"
        aria-orientation="vertical"
        aria-label="패널 폭 조정"
        className="absolute top-0 left-0 bottom-0 w-1 -translate-x-1/2 cursor-col-resize z-10 hover:bg-[var(--foreground)]/30 transition-colors"
      />

      {playlist ? (
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          {/* 업로더 프로필 — 영상 위 */}
          {playlist.uploaded_by && (
            <div className="px-4 pt-4">
              <UploaderCard
                uploadedBy={playlist.uploaded_by}
                displayName={uploader?.display_name ?? null}
                avatarUrl={uploader?.avatar_url ?? null}
                isVerified={uploader?.is_verified ?? false}
              />
            </div>
          )}

          {/* 비디오 슬롯 */}
          <div
            ref={slotRef}
            className="relative w-full aspect-video bg-black mt-3"
            data-player-slot={playlistId ?? ''}
            aria-hidden="true"
          />

          {/* 제목 + 채널 */}
          <div className="px-4 mt-3">
            <div className="flex items-start gap-2 mb-1">
              {playlist.is_ai && (
                <span className="mt-0.5 flex-shrink-0 bg-violet-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  AI
                </span>
              )}
              <h1 className="text-base font-semibold leading-snug break-keep">{playlist.title}</h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <Link
                href={`/${locale}/channel/${encodeURIComponent(playlist.channel_id)}`}
                className="flex items-center gap-1.5 hover:text-[var(--foreground)] transition-colors"
              >
                <ChannelAvatar channelId={playlist.channel_id} channelName={playlist.channel_name} size={16} />
                <span className="truncate">{playlist.channel_name}</span>
              </Link>
              <span>· {Math.max(1, playlist.track_count)}개 트랙</span>
            </div>
          </div>

          {/* 에디터 노트 */}
          {playlist.editor_note && (
            <blockquote className="mx-4 mt-3 border-l-2 border-[var(--subtle)] pl-3 py-1">
              <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed">{playlist.editor_note}</p>
            </blockquote>
          )}

          {/* 4 액션 — 좌우 스와이프 (overflow-x-auto, scrollbar-hide). 각 항목 flex-shrink-0 보장 */}
          <div className="mt-3 px-4">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
              <div className="flex-shrink-0">
                <LikeButton playlistId={playlist.id} initialCount={playlist.like_count} />
              </div>
              <div className="flex-shrink-0">
                <SaveButton playlistId={playlist.id} isLoggedIn={isLoggedIn} responsive={false} />
              </div>
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 h-9 px-4 rounded-full border border-[var(--border)] text-sm font-medium hover:bg-[var(--muted)] transition-colors flex-shrink-0 whitespace-nowrap"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                  <polyline points="16 6 12 2 8 6" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="12" y1="2" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                공유
              </button>
              <a
                href={`https://www.youtube.com/watch?v=${playlist.youtube_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 h-9 px-4 rounded-full border border-[var(--border)] text-sm font-medium hover:bg-[var(--muted)] transition-colors flex-shrink-0 whitespace-nowrap"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                </svg>
                YouTube
              </a>
            </div>
          </div>

          {/* 트랙 리스트 */}
          {tracks.length > 0 && (
            <div className="mt-4">
              <h3 className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide px-4 pb-2">
                트랙 {tracks.length}개
              </h3>
              <ul>
                {tracks.map((track: Track, index) => {
                  const isActive = currentTrackIndex === index;
                  return (
                    <li
                      key={track.id}
                      onClick={() => seekToTrack(index)}
                      className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${
                        isActive ? 'bg-[var(--muted)]' : 'hover:bg-[var(--muted)]'
                      }`}
                    >
                      <span className={`w-5 text-right text-xs tabular-nums flex-shrink-0 ${
                        isActive ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                      }`}>
                        {isActive ? '▶' : track.position}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{track.title}</p>
                        {track.artist && (
                          <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                            {track.artist}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-[var(--text-secondary)] tabular-nums flex-shrink-0">
                        {formatDuration(track.duration_sec)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* 태그 */}
          {allTags.length > 0 && (
            <div className="px-4 mt-6 flex flex-wrap gap-1.5">
              {allTags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-0.5 bg-[var(--muted)] text-[var(--text-secondary)] rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* 아티스트 카드 */}
          {artistSlugs.length > 0 && (
            <div className="px-4 mt-4">
              <ArtistStrip artists={artistSlugs} locale={locale} fadeFrom="var(--card)" />
            </div>
          )}

          {/* 댓글 */}
          <section className="px-4 mt-8 pb-10">
            <h2 className="text-sm font-semibold text-white mb-3">
              댓글 {playlist.comment_count}개
            </h2>
            <div className="mb-4">
              <CommentForm playlistId={playlist.id} isLoggedIn={isLoggedIn} />
            </div>
            <CommentList playlistId={playlist.id} isLoggedIn={isLoggedIn} />
          </section>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-[var(--text-secondary)]">
          재생 중인 항목이 없습니다
        </div>
      )}
    </aside>
  );
}
