// Design Ref: §5.1 — ArtistCard: 원형 썸네일 + 이름 + 이동 링크
import Image from 'next/image';
import Link from 'next/link';

interface ArtistCardProps {
  name: string;
  slug: string;
  imageUrl: string | null;
  locale: string;
  /** 썸네일 지름(px). 기본 80. 홈 아티스트 섹션은 96 권장. */
  size?: number;
}

export default function ArtistCard({ name, slug, imageUrl, locale, size = 80 }: ArtistCardProps) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <Link
      href={`/${locale}/artist/${slug}`}
      className="flex flex-col items-center gap-2 group flex-shrink-0"
      style={{ width: size }}
    >
      {/* 원형 썸네일 */}
      <div
        className="relative rounded-full overflow-hidden bg-[var(--muted)] flex-shrink-0 ring-2 ring-transparent group-hover:ring-[var(--accent)] transition-all duration-200"
        style={{ width: size, height: size }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover"
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
