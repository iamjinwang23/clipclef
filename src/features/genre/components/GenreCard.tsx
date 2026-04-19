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
      <div className="relative" style={{ width: size, height: size }}>
        {/* 뒤 레이어 — 위로 offset, 좌우로 inset (앨범 겹침 효과) */}
        <div
          className="absolute rounded-md overflow-hidden opacity-80"
          style={{
            left: Math.round(size * 0.06),
            right: Math.round(size * 0.06),
            top: -Math.round(size * 0.05),
            height: Math.round(size * 0.2),
          }}
          aria-hidden
        >
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt=""
              fill
              className="object-cover object-top"
              sizes={`${size}px`}
            />
          ) : (
            <div className="w-full h-full bg-[var(--subtle)]" />
          )}
        </div>

        {/* 앞 레이어 — 실제 이미지 */}
        <div className="absolute inset-0 rounded-md overflow-hidden shadow-lg ring-1 ring-white/5 group-hover:ring-[var(--accent)] transition-all duration-200 bg-[var(--subtle)]">
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
      </div>

      <p className="text-sm font-medium text-[var(--foreground)] leading-snug group-hover:text-[var(--accent)] transition-colors truncate">
        {name}
      </p>
    </Link>
  );
}
