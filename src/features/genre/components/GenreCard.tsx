// Design Ref: home-redesign.design.md §5.4 — 앨범 스택 장르 카드
// 뒤 레이어 1장이 위쪽으로 살짝 peek 하는 스택 (회전 없이 단순 vertical offset)

import Image from 'next/image';
import Link from 'next/link';

interface GenreCardProps {
  name: string;
  thumbnailUrl: string | null;
  count: number;
  locale: string;
  size?: number;
}

export default function GenreCard({ name, thumbnailUrl, count, locale, size = 128 }: GenreCardProps) {
  const initial = name.charAt(0);

  return (
    <Link
      href={`/${locale}/genres/${encodeURIComponent(name)}`}
      className="flex flex-col gap-2 group flex-shrink-0"
      style={{ width: size }}
    >
      <div
        className="relative rounded-lg sm:rounded-xl overflow-hidden bg-[var(--subtle)]"
        style={{ width: size, height: size }}
      >
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={name}
            fill
            className="object-cover"
            sizes={`${size}px`}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center font-bold text-[var(--text-secondary)]"
            style={{ fontSize: Math.round(size * 0.35) }}
          >
            {initial}
          </div>
        )}
      </div>

      <p className="text-sm font-medium line-clamp-2 leading-snug group-hover:text-[var(--accent)] transition-colors">
        {name}
      </p>
    </Link>
  );
}
