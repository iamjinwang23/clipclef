// Design Ref: §5.1 — ArtistCard: 원형 썸네일 + 이름 + 이동 링크
import Image from 'next/image';
import Link from 'next/link';
import { toHttpsUrl } from '@/lib/artist-apis';

interface ArtistCardProps {
  name: string;
  slug: string;
  imageUrl: string | null;
  locale: string;
  /** 썸네일 지름(px). sm(≥640px)에서 사용. 기본 80. 홈 아티스트 섹션은 96 권장. */
  size?: number;
  /** 모바일(<640px)에서 사용할 썸네일 지름(px). 미지정 시 size와 동일. */
  sizeMobile?: number;
}

export default function ArtistCard({
  name,
  slug,
  imageUrl,
  locale,
  size = 80,
  sizeMobile,
}: ArtistCardProps) {
  const initial = name.charAt(0).toUpperCase();
  // 기존 DB에 저장된 http:// URL을 https://로 정규화 (remotePatterns는 https만 허용)
  const safeImageUrl = toHttpsUrl(imageUrl);

  const sizeMb = sizeMobile ?? size;
  // sm 이상에서만 CSS var를 덮어쓰는 방식으로 반응형 크기 지원 (Tailwind arbitrary value + CSS custom property)
  const sizeStyle = {
    '--ac-size': `${sizeMb}px`,
    '--ac-size-sm': `${size}px`,
  } as React.CSSProperties;

  return (
    <Link
      href={`/${locale}/artist/${slug}`}
      className="flex flex-col items-center gap-2 group flex-shrink-0 w-[var(--ac-size)] sm:w-[var(--ac-size-sm)]"
      style={sizeStyle}
    >
      {/* 원형 썸네일 */}
      <div className="relative rounded-full overflow-hidden bg-[var(--muted)] flex-shrink-0 ring-[0.5px] ring-white/20 w-[var(--ac-size)] h-[var(--ac-size)] sm:w-[var(--ac-size-sm)] sm:h-[var(--ac-size-sm)]">
        {safeImageUrl ? (
          <Image
            src={safeImageUrl}
            alt={name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            sizes={`${size}px`}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center font-bold text-[var(--text-secondary)]"
            style={{ fontSize: Math.round(size * 0.3) }}
          >
            {initial}
          </div>
        )}
      </div>

      {/* 이름 */}
      <p className="text-sm font-medium text-center line-clamp-2 leading-snug group-hover:text-[var(--accent)] transition-colors">
        {name}
      </p>
    </Link>
  );
}
