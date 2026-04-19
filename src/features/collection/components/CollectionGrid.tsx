'use client';
// Design Ref: §3.3 — 플레이리스트 카드 그리드 + 재생 버튼 + 강조 표시

import Image from 'next/image';
import Link from 'next/link';
import type { Playlist } from '@/types';
import ChannelAvatar from '@/features/playlist/components/ChannelAvatar';

interface CollectionGridProps {
  playlists: Playlist[];
  currentIndex: number | null;
  locale: string;
  onPlay: (index: number) => void;
}

export default function CollectionGrid({ playlists, currentIndex, locale, onPlay }: CollectionGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {playlists.map((playlist, index) => {
        const isActive = currentIndex === index;

        return (
          <div key={playlist.id} className="group relative">
            {/* 링크 — 썸네일 + 텍스트 */}
            <Link href={`/${locale}/playlist/${playlist.id}`}>
              {/* 썸네일 */}
              <div
                className={`relative w-full aspect-video rounded-md sm:rounded-xl overflow-hidden bg-[var(--muted)] mb-2 transition-all duration-200 ${
                  isActive ? 'ring-2 ring-[var(--accent)]' : ''
                }`}
              >
                <Image
                  src={playlist.thumbnail_url}
                  alt={playlist.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 50vw, 33vw"
                />

                {/* 재생 중 뱃지 */}
                {isActive && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    재생 중
                  </div>
                )}

                {/* 호버/탭 시 재생 버튼 오버레이 */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onPlay(index);
                  }}
                  className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
                    isActive
                      ? 'opacity-0'
                      : 'opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100'
                  }`}
                  aria-label={`${playlist.title} 재생`}
                >
                  <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors">
                    <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </button>

                {/* 모바일: 항상 표시되는 작은 재생 버튼 (우하단) */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onPlay(index);
                  }}
                  className={`absolute bottom-2 right-2 sm:hidden w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center transition-opacity duration-200 ${
                    isActive ? 'opacity-0' : 'opacity-100'
                  }`}
                  aria-label={`${playlist.title} 재생`}
                >
                  <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </div>

              {/* 제목 */}
              <p
                className={`text-sm font-medium line-clamp-2 leading-snug ${
                  isActive ? 'text-[var(--accent)]' : ''
                }`}
              >
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
            </Link>
          </div>
        );
      })}
    </div>
  );
}
