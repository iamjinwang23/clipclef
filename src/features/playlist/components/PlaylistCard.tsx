'use client';
// Design Ref: §5.3 — PlaylistCard: CollectionGrid 디자인 통일
// 썸네일 + 호버 재생 오버레이 + 텍스트 스택 (카드 배경 없음)

import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import type { Playlist } from '@/types';

interface PlaylistCardProps {
  playlist: Playlist;
}

export default function PlaylistCard({ playlist }: PlaylistCardProps) {
  const locale = useLocale();

  return (
    <div className="group relative">
      <Link href={`/${locale}/playlist/${playlist.id}`}>
        {/* 썸네일 */}
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[var(--muted)] mb-2">
          <Image
            src={playlist.thumbnail_url}
            alt={playlist.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
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
              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>

          {/* 모바일: 항상 표시되는 작은 재생 버튼 (우하단) */}
          <div className="absolute bottom-2 right-2 sm:hidden w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* 제목 */}
        <p className="text-sm font-medium line-clamp-2 leading-snug group-hover:text-[var(--text-secondary)] transition-colors">
          {playlist.title}
        </p>
        <p className="text-xs text-[var(--subtle)] mt-0.5 truncate">{playlist.channel_name}</p>
        {playlist.editor_note && (
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2 italic leading-relaxed">
            "{playlist.editor_note}"
          </p>
        )}
      </Link>
    </div>
  );
}
