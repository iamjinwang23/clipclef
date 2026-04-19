// Design Ref: home-redesign.design.md §5.4 — 앨범 레이어드 장르 카드
// 정방형 썸네일 + 뒤에 2개 레이어(회전·오프셋·반투명)로 앨범 스택 느낌

import Image from 'next/image';
import Link from 'next/link';

interface GenreCardProps {
  name: string;
  thumbnailUrl: string | null;
  count: number;
  locale: string;
  /** 썸네일 한 변 크기 (px). 기본 128 */
  size?: number;
}

export default function GenreCard({ name, thumbnailUrl, count, locale, size = 128 }: GenreCardProps) {
  const initial = name.charAt(0);

  return (
    <Link
      href={`/${locale}/genres/${encodeURIComponent(name)}`}
      className="flex flex-col items-center gap-3 group flex-shrink-0"
      style={{ width: size + 8 }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        {/* Layer 3 — 가장 뒤 */}
        <div
          className="absolute inset-0 rounded-md bg-[var(--muted)]"
          style={{ transform: 'rotate(-4deg) translateY(4px)', opacity: 0.4 }}
          aria-hidden
        />
        {/* Layer 2 — 중간 */}
        <div
          className="absolute inset-0 rounded-md bg-[var(--muted)]"
          style={{ transform: 'rotate(-2deg) translateY(2px)', opacity: 0.65 }}
          aria-hidden
        />
        {/* Layer 1 — 앞 (실제 이미지) */}
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

      <div className="text-center">
        <p className="text-sm font-medium text-[var(--foreground)] leading-snug group-hover:text-[var(--accent)] transition-colors">
          {name}
        </p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          플레이리스트 {count}개
        </p>
      </div>
    </Link>
  );
}
