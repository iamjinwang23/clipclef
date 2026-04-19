// Design Ref: §5.3 — ArtistHero
// 모바일: 168×168 정방형 썸네일 + 이름/이니셜 아래 배치
// 데스크톱(sm+): 기존 aspect-video 풀-블리드 배너 + 하단 scrim + 이름

import Image from 'next/image';

interface ArtistHeroProps {
  name: string;
  imageUrl: string | null;
}

export default function ArtistHero({ name, imageUrl }: ArtistHeroProps) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <>
      {/* 모바일 전용 — 168 정방형 */}
      <div className="sm:hidden flex flex-col items-center pt-6 pb-2">
        <div
          className="relative rounded-md overflow-hidden bg-[var(--muted)]"
          style={{ width: 168, height: 168 }}
        >
          {imageUrl ? (
            <Image src={imageUrl} alt={name} fill className="object-cover" sizes="168px" priority />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-5xl font-bold text-[var(--text-secondary)] opacity-30">
                {initial}
              </span>
            </div>
          )}
        </div>
        <h1 className="mt-4 text-3xl font-black text-white leading-tight tracking-tight text-center break-keep">
          {name}
        </h1>
      </div>

      {/* 데스크톱 전용 — 기존 aspect-video 배너 */}
      <div className="hidden sm:block">
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[var(--muted)]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="object-cover"
              sizes="896px"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-7xl font-bold text-[var(--text-secondary)] opacity-30">
                {initial}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-5 pt-8">
            <h1 className="text-6xl font-black text-white leading-tight tracking-tight">{name}</h1>
          </div>
        </div>
      </div>
    </>
  );
}
