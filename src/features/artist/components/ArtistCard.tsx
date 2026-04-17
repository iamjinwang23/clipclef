// Design Ref: §5.1 — ArtistCard: 원형 썸네일 + 이름 + 이동 링크
import Image from 'next/image';
import Link from 'next/link';

interface ArtistCardProps {
  name: string;
  slug: string;
  imageUrl: string | null;
  locale: string;
}

export default function ArtistCard({ name, slug, imageUrl, locale }: ArtistCardProps) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <Link
      href={`/${locale}/artist/${slug}`}
      className="flex flex-col items-center gap-2 group flex-shrink-0 w-22"
    >
      {/* 원형 썸네일 */}
      <div className="relative w-20 h-20 rounded-full overflow-hidden bg-[var(--muted)] flex-shrink-0 ring-2 ring-transparent group-hover:ring-[var(--accent)] transition-all duration-200">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-bold text-[var(--text-secondary)]">
            <span className="text-sm">/</span><span className="text-xl">{initial}</span>
          </div>
        )}
      </div>

      {/* 이름 */}
      <p className="text-xs font-medium text-center text-[var(--foreground)] line-clamp-2 leading-tight group-hover:text-[var(--accent)] transition-colors">
        {name}
      </p>
    </Link>
  );
}
