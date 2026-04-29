'use client';

// Design Ref: §5.1 — MiniBar (상시 노출, view === 'mini')
// Plan SC: R1 — playerStore 구독만. 직접 iframe 조작 금지
// Plan SC: F3 — 플레이어 바 안 1-click 저장 (저장 UI 승격)

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { usePlayerStore } from '../store';
import { useCollection } from '@/features/interaction/hooks/useCollection';
import LoginModal from '@/features/interaction/components/LoginModal';

export default function MiniBar() {
  const locale = useLocale();
  const view = usePlayerStore((s) => s.view);
  const status = usePlayerStore((s) => s.status);
  const playlist = usePlayerStore((s) => s.playlist);
  const tracks = usePlayerStore((s) => s.tracks);
  const currentTrackIndex = usePlayerStore((s) => s.currentTrackIndex);
  const play = usePlayerStore((s) => s.play);
  const pause = usePlayerStore((s) => s.pause);

  // hidden 상태거나 플리 미로드 시 렌더 안 함
  // expanded 시에는 MiniBar 숨김 (ExpandedView가 대형 컨트롤 제공)
  const shouldRender = view === 'mini' && !!playlist;

  return (
    <>
      {shouldRender && (
        <MiniBarInner
          playlistId={playlist.id}
          locale={locale}
          thumbnailUrl={playlist.thumbnail_url}
          title={playlist.title}
          subtitle={tracks[currentTrackIndex]?.title ?? playlist.channel_name}
          isPlaying={status === 'playing'}
          isLoading={status === 'loading'}
          onPlay={play}
          onPause={pause}
        />
      )}
    </>
  );
}

interface InnerProps {
  playlistId: string;
  locale: string;
  thumbnailUrl: string | null | undefined;
  title: string;
  subtitle: string | null | undefined;
  isPlaying: boolean;
  isLoading: boolean;
  onPlay: () => void;
  onPause: () => void;
}

function MiniBarInner({
  playlistId,
  locale,
  thumbnailUrl,
  title,
  subtitle,
  isPlaying,
  isLoading,
  onPlay,
  onPause,
}: InnerProps) {
  const { saved, loading: saveLoading, toggle } = useCollection(playlistId);
  const [showLogin, setShowLogin] = useState(false);

  // 재생 진행률 — useScrobble 이 1Hz 로 store 갱신, transition 으로 부드럽게 보간
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  // 점프 감지: progressPct 가 한번에 크게 변하면 트랙 이동/seek 으로 간주 → 순간이동.
  // 자연 재생에선 1초당 (1/duration*100)% 증가하므로 임계값 1.5%면 충분(영상 길이가
  // 70초 이상일 때 자연 증가는 1.5% 미만). 점프 감지된 렌더만 transition 죽이고
  // 다음 tick 부터는 다시 1s linear.
  const prevPctRef = useRef(progressPct);
  const isJumping = Math.abs(progressPct - prevPctRef.current) > 1.5;
  useEffect(() => {
    prevPctRef.current = progressPct;
  }, [progressPct]);

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await toggle();
    if (!ok) setShowLogin(true);
  };

  return (
    <>
      <div
        role="region"
        aria-label="현재 재생 중"
        className="
          lg:hidden
          fixed left-0 right-0 z-40
          bottom-[calc(3.5rem+env(safe-area-inset-bottom))]
          bg-[var(--card)]/95 backdrop-blur-md
          border-t border-[var(--border)]
        "
      >
        {/* 재생 진행률 — 미니바 상단 2px. seek/pause 시엔 즉시 반영, 재생 중엔 1s linear 보간 */}
        <div
          className="absolute -top-0.5 left-0 right-0 h-0.5 pointer-events-none"
          aria-hidden="true"
        >
          <div
            className="h-full bg-[#e72b2d]"
            style={{
              width: `${progressPct}%`,
              transition: !isJumping && isPlaying ? 'width 1s linear' : 'none',
            }}
          />
        </div>
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-16 flex items-center gap-3">
          {/* 썸네일 + 제목 (클릭 시 상세로) */}
          <Link
            href={`/${locale}/playlist/${playlistId}`}
            className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
          >
            <div className="relative w-12 h-12 rounded overflow-hidden bg-[var(--muted)] flex-shrink-0">
              {thumbnailUrl && (
                <Image
                  src={thumbnailUrl}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-cover"
                  unoptimized
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{title}</p>
              {subtitle && (
                <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </Link>

          {/* 재생 컨트롤 */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={isPlaying ? onPause : onPlay}
              disabled={isLoading}
              aria-label={isPlaying ? '일시정지' : '재생'}
              className="
                w-10 h-10 rounded-full flex items-center justify-center
                hover:bg-[var(--muted)] transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {isPlaying ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M7 4.5l12 7.5-12 7.5V4.5z" />
                </svg>
              )}
            </button>

            {/* 저장 버튼 — useCollection 기본 저장함 토글 */}
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={saveLoading}
              aria-label={saved ? '저장됨' : '라이브러리에 저장'}
              title={saved ? '저장됨' : '라이브러리에 저장'}
              className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-colors
                ${saved ? 'text-[var(--foreground)]' : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'}
                hover:bg-[var(--muted)]
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {saved ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17 3H7a2 2 0 00-2 2v16l7-3 7 3V5a2 2 0 00-2-2z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M17 3H7a2 2 0 00-2 2v16l7-3 7 3V5a2 2 0 00-2-2z" />
                </svg>
              )}
            </button>

          </div>
        </div>
      </div>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
