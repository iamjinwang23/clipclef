'use client';
// Design Ref: home-redesign.design.md §5.8 — 장르 상세 헤더
// 정방형 썸네일 + 큰 장르명 + 그라데이션 (채널 상세와 동일 패턴)

import NextImage from 'next/image';
import { useEffect, useState } from 'react';

interface GenreHeroProps {
  name: string;
  thumbnailUrl: string | null;
  playlistCount: number;
}

async function extractVibrantColor(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const SIZE = 24;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < data.length; i += 4) {
          const rr = data[i], gg = data[i + 1], bb = data[i + 2];
          const max = Math.max(rr, gg, bb);
          const min = Math.min(rr, gg, bb);
          const sat = max === 0 ? 0 : (max - min) / max;
          if (sat < 0.25) continue;
          if (max < 40 || min > 220) continue;
          r += rr; g += gg; b += bb; n++;
        }
        if (n < 10) {
          r = g = b = n = 0;
          for (let i = 0; i < data.length; i += 4) {
            r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
          }
        }
        resolve(`rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`);
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export default function GenreHero({ name, thumbnailUrl, playlistCount }: GenreHeroProps) {
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    if (!thumbnailUrl) return;
    let cancelled = false;
    extractVibrantColor(thumbnailUrl).then((c) => {
      if (!cancelled) setColor(c);
    });
    return () => { cancelled = true; };
  }, [thumbnailUrl]);

  const gradient = color
    ? `linear-gradient(180deg, ${color} 0%, transparent 100%)`
    : 'linear-gradient(180deg, var(--card) 0%, transparent 100%)';

  const initial = name.charAt(0);

  return (
    <section className="relative w-full overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none transition-[background] duration-500"
        style={{ background: gradient, opacity: 0.9 }}
        aria-hidden
      />

      <div className="relative max-w-4xl mx-auto px-4 pt-10 pb-8 sm:pt-16 sm:pb-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:gap-6">
          {/* 모바일: 정방형 가운데 상단 */}
          <div className="sm:hidden mx-auto mb-6">
            <Thumbnail name={name} url={thumbnailUrl} size={176} initial={initial} />
          </div>
          {/* 데스크톱: 좌측 */}
          <div className="hidden sm:block flex-shrink-0">
            <Thumbnail name={name} url={thumbnailUrl} size={160} initial={initial} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-4xl sm:text-6xl font-black text-white leading-none tracking-tight break-keep">
              {name}
            </h1>
            <p className="mt-2 sm:mt-3 text-sm text-white/80">
              플레이리스트 {playlistCount}개
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Thumbnail({
  name, url, size, initial,
}: { name: string; url: string | null; size: number; initial: string }) {
  if (url) {
    return (
      <div
        className="relative rounded-md overflow-hidden shadow-lg"
        style={{ width: size, height: size }}
      >
        <NextImage src={url} alt={name} fill className="object-cover" sizes={`${size}px`} />
      </div>
    );
  }
  return (
    <div
      className="rounded-md bg-[var(--subtle)] flex items-center justify-center font-bold text-white/80"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initial}
    </div>
  );
}
