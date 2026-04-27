'use client';
// Spotify-style full-bleed 프로필 헤더 — avatar에서 vibrant color 추출 → 상단 그라데이션
// /me/profile, /profile/[userId] 양쪽에서 사용 (헤더 parity 유지)

import { useEffect, useState, type ReactNode } from 'react';
import UserAvatar from './UserAvatar';
import VerifiedBadge from './VerifiedBadge';

interface ProfileHeroHeaderProps {
  avatarUrl: string | null | undefined;
  displayName: string;
  isVerified?: boolean;
  followerCount: number;
  followingCount: number;
  /** 우측 상단 액션 슬롯 — ProfileSettingsMenu 또는 UserFollowChip */
  trailing?: ReactNode;
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
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export default function ProfileHeroHeader({
  avatarUrl,
  displayName,
  isVerified = false,
  followerCount,
  followingCount,
  trailing,
}: ProfileHeroHeaderProps) {
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    if (!avatarUrl) return;
    let cancelled = false;
    extractVibrantColor(avatarUrl).then((c) => {
      if (!cancelled) setColor(c);
    });
    return () => { cancelled = true; };
  }, [avatarUrl]);

  const gradient = color
    ? `linear-gradient(180deg, ${color} 0%, transparent 100%)`
    : 'linear-gradient(180deg, var(--card) 0%, transparent 100%)';

  return (
    <section className="relative w-full">
      <div
        className="absolute inset-0 pointer-events-none transition-[background] duration-500"
        style={{ background: gradient, opacity: 0.9 }}
        aria-hidden
      />

      <div className="relative max-w-3xl mx-auto px-4 pt-10 pb-8 sm:pt-16 sm:pb-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:gap-6">
          <div className="sm:hidden mx-auto mb-6">
            <UserAvatar src={avatarUrl} name={displayName} size={168} />
          </div>
          <div className="hidden sm:block flex-shrink-0">
            <UserAvatar src={avatarUrl} name={displayName} size={144} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl sm:text-6xl font-black text-white leading-none tracking-tight break-keep flex items-center gap-2 min-w-0">
                <span className="truncate">{displayName}</span>
                {isVerified && <VerifiedBadge size={28} />}
              </h1>
              {trailing && <div className="ml-auto flex-shrink-0">{trailing}</div>}
            </div>
            <div className="mt-2 sm:mt-3 flex gap-4 text-sm text-white/80">
              <span>
                팔로워 <strong className="text-white">{followerCount}</strong>
              </span>
              <span>
                팔로잉 <strong className="text-white">{followingCount}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
