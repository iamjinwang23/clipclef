// Design Ref: §5.3 — ArtistHero: 대형 이미지 + 이름 + 리스너 수
import Image from 'next/image';

interface ArtistHeroProps {
  name: string;
  imageUrl: string | null;
}

export default function ArtistHero({ name, imageUrl }: ArtistHeroProps) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="relative w-[calc(100%+2rem)] sm:w-full -mx-4 sm:mx-0 aspect-video rounded-none sm:rounded-xl overflow-hidden bg-[var(--muted)]">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 896px"
          priority
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-7xl font-bold text-[var(--text-secondary)] opacity-30">
            {initial}
          </span>
        </div>
      )}

      {/* 그라디언트 오버레이 + 텍스트 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-5 pt-8">
        <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight tracking-tight">{name}</h1>
        </div>
    </div>
  );
}
