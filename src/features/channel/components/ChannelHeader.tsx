'use client';
// 채널 상세 헤더 — Spotify 스타일 (좌: 원형 아바타, 우: 큰 이름)
// 배경은 아바타 이미지에서 추출한 dominant vibrant color로 상단→투명 그라데이션
// 그라데이션은 이 헤더 영역 안에서만 보이고 페이지 나머지로 번지지 않음

import { useEffect, useState } from 'react';
import ChannelAvatar from '@/features/playlist/components/ChannelAvatar';
import { useChannelThumbnail } from '@/features/playlist/hooks/useChannelThumbnail';

interface ChannelHeaderProps {
  channelId: string;
  channelName: string;
  playlistCount: number;
}

/** 이미지에서 채도 높은 픽셀만 골라 평균 RGB를 반환. CORS 실패 시 null. */
async function extractVibrantColor(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
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
          // 회색·흰색·검정 픽셀 제외 → 채도 있는 색만 평균
          if (sat < 0.25) continue;
          if (max < 40 || min > 220) continue;
          r += rr; g += gg; b += bb; n++;
        }
        if (n < 10) {
          // 채도 있는 픽셀이 거의 없으면 전체 평균으로 폴백
          r = g = b = n = 0;
          for (let i = 0; i < data.length; i += 4) {
            r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
          }
        }
        resolve(`rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export default function ChannelHeader({ channelId, channelName, playlistCount }: ChannelHeaderProps) {
  const { data: thumbnailUrl } = useChannelThumbnail(channelId);
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

  return (
    <section className="relative -mx-4 px-4 overflow-hidden">
      {/* 그라데이션: 이 헤더 높이까지만, 내려가며 투명 */}
      <div
        className="absolute inset-0 pointer-events-none transition-[background] duration-500"
        style={{ background: gradient, opacity: 0.9 }}
        aria-hidden
      />

      {/* 콘텐츠 — 좌측 아바타 + 우측 이름/카운트 */}
      <div className="relative flex items-end gap-5 sm:gap-6 pt-10 pb-8 sm:pt-16 sm:pb-10">
        <div className="flex-shrink-0">
          <div className="sm:hidden">
            <ChannelAvatar channelId={channelId} channelName={channelName} size={96} />
          </div>
          <div className="hidden sm:block">
            <ChannelAvatar channelId={channelId} channelName={channelName} size={144} />
          </div>
        </div>
        <div className="min-w-0 flex-1 pb-1">
          <h1 className="text-4xl sm:text-6xl font-black text-white leading-none tracking-tight break-keep">
            {channelName}
          </h1>
          <p className="mt-2 sm:mt-3 text-sm text-white/80">
            플레이리스트 {playlistCount}개
          </p>
        </div>
      </div>
    </section>
  );
}
