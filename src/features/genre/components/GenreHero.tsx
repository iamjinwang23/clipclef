// Design Ref: home-redesign.design.md §5.8 — 장르 상세 헤더
// 아티스트 Hero와 동일한 패턴: aspect-video 배너(썸네일) + 하단 블랙 그라데이션 + 장르명

import Image from 'next/image';

interface GenreHeroProps {
  name: string;
  thumbnailUrl: string | null;
  playlistCount: number;
}

export default function GenreHero({ name, thumbnailUrl, playlistCount }: GenreHeroProps) {
  const initial = name.charAt(0);

  return (
    <div className="relative w-[calc(100%+2rem)] sm:w-full -mx-4 sm:mx-0 aspect-video rounded-none sm:rounded-xl overflow-hidden bg-[var(--muted)]">
      {thumbnailUrl ? (
        <Image
          src={thumbnailUrl}
          alt={name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 896px"
          priority
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-8xl font-bold text-[var(--text-secondary)] opacity-30">
            {initial}
          </span>
        </div>
      )}

      {/* 블랙 그라데이션 오버레이 + 텍스트 (아티스트와 동일) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-5 pt-8">
        <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight tracking-tight break-keep">
          {name}
        </h1>
        <p className="mt-2 text-sm text-white/80">
          플레이리스트 {playlistCount}개
        </p>
      </div>
    </div>
  );
}
