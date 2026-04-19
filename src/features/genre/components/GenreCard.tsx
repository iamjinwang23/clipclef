// Design Ref: home-redesign.design.md §5.4 — 장르 카드 (flat single thumb)
// 크기: 두 가지 사용처가 있으므로 CSS 변수 --g-size 지원.
//   - 홈 레일: 부모에서 [--g-size:128px] sm:[--g-size:168px] 로 반응형 제어
//   - /genres 그리드: 기존 size prop 유지 (고정)

import Image from 'next/image';
import Link from 'next/link';

interface GenreCardProps {
  name: string;
  thumbnailUrl: string | null;
  locale: string;
  /** 고정 크기(px). 미지정 시 --g-size CSS 변수 사용(기본 128). */
  size?: number;
}

export default function GenreCard({ name, thumbnailUrl, locale, size }: GenreCardProps) {
  const initial = name.charAt(0);
  const boxStyle = size
    ? { width: size, height: size }
    : { width: 'var(--g-size, 128px)', height: 'var(--g-size, 128px)' };
  const wrapStyle = size
    ? { width: size }
    : { width: 'var(--g-size, 128px)' };
  const fontSize = size ? Math.round(size * 0.35) : 'calc(var(--g-size, 128px) * 0.35)';
  const sizesAttr = size ? `${size}px` : '(max-width: 640px) 128px, 168px';

  return (
    <Link
      href={`/${locale}/genres/${encodeURIComponent(name)}`}
      className="flex flex-col gap-2 group flex-shrink-0"
      style={wrapStyle}
    >
      <div
        className="relative rounded-lg sm:rounded-xl overflow-hidden bg-[var(--subtle)]"
        style={boxStyle}
      >
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={name}
            fill
            className="object-cover"
            sizes={sizesAttr}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center font-bold text-[var(--text-secondary)]"
            style={{ fontSize }}
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
