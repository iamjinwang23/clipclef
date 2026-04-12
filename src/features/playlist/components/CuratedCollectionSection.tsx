'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { CuratedCollection, Playlist } from '@/types';
import { useParams } from 'next/navigation';

export default function CuratedCollectionSection() {
  const [collections, setCollections] = useState<(CuratedCollection & { items: Playlist[] })[]>([]);
  const [activeRealIndex, setActiveRealIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const { locale } = useParams<{ locale: string }>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isJumping = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    fetch('/api/collections')
      .then((r) => r.json())
      .then((data: (CuratedCollection & { items: Playlist[] })[]) => setCollections(data))
      .catch(() => {});
  }, []);

  const n = collections.length;
  const displayItems = n > 0 ? [collections[n - 1], ...collections, collections[0]] : [];

  // 초기 스크롤
  useEffect(() => {
    if (n === 0) return;
    const container = scrollRef.current;
    const firstReal = cardRefs.current[1];
    if (!container || !firstReal) return;
    container.scrollLeft = firstReal.offsetLeft;
  }, [n]);

  const updateActive = useCallback(() => {
    const container = scrollRef.current;
    if (!container || isJumping.current) return;
    const containerCenter = container.scrollLeft + container.clientWidth / 2;
    let closestDisplay = 1;
    let closestDist = Infinity;
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const cardCenter = el.offsetLeft + el.offsetWidth / 2;
      const dist = Math.abs(cardCenter - containerCenter);
      if (dist < closestDist) { closestDist = dist; closestDisplay = i; }
    });
    setActiveRealIndex((closestDisplay - 1 + n) % n);
  }, [n]);

  const scrollToNext = useCallback(() => {
    const nextReal = (activeRealIndex + 1) % n;
    const nextCard = cardRefs.current[nextReal + 1];
    const container = scrollRef.current;
    if (nextCard && container) {
      container.scrollTo({ left: nextCard.offsetLeft, behavior: 'smooth' });
    }
  }, [activeRealIndex, n]);

  useEffect(() => {
    if (!isPlaying || n === 0) return;
    const id = setInterval(scrollToNext, 7000);
    return () => clearInterval(id);
  }, [isPlaying, scrollToNext, n]);

  const handleScrollEnd = useCallback(() => {
    const container = scrollRef.current;
    if (!container || n === 0) return;
    const containerCenter = container.scrollLeft + container.clientWidth / 2;
    let closestDisplay = 1;
    let closestDist = Infinity;
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const cardCenter = el.offsetLeft + el.offsetWidth / 2;
      const dist = Math.abs(cardCenter - containerCenter);
      if (dist < closestDist) { closestDist = dist; closestDisplay = i; }
    });
    if (closestDisplay === 0) {
      const realCard = cardRefs.current[n];
      if (realCard) { isJumping.current = true; container.scrollLeft = realCard.offsetLeft; setTimeout(() => { isJumping.current = false; }, 50); }
    } else if (closestDisplay === n + 1) {
      const realCard = cardRefs.current[1];
      if (realCard) { isJumping.current = true; container.scrollLeft = realCard.offsetLeft; setTimeout(() => { isJumping.current = false; }, 50); }
    }
  }, [n]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.addEventListener('scroll', updateActive, { passive: true });
    container.addEventListener('scrollend', handleScrollEnd, { passive: true });
    updateActive();
    return () => {
      container.removeEventListener('scroll', updateActive);
      container.removeEventListener('scrollend', handleScrollEnd);
    };
  }, [collections, updateActive, handleScrollEnd]);

  if (collections.length === 0) return null;

  // 모바일/데스크톱 모두 100vw, 패딩 없음
  const dotsBtnClass = (i: number) =>
    `rounded-full transition-all duration-300 ${i === activeRealIndex ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'}`;

  return (
    <section className="pt-0 pb-0">
      <div className="relative">
        {/* 캐러셀 */}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto gap-0"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {displayItems.map((col, i) => {
            const realIndex = (i - 1 + n) % n;
            const isActive = realIndex === activeRealIndex && (i >= 1 && i <= n);
            const thumbUrl = col.banner_image_url ?? col.items[0]?.thumbnail_url;

            return (
              <div
                key={`${col.id}-${i}`}
                ref={(el) => { cardRefs.current[i] = el; }}
                className={`
                  group relative flex-shrink-0 overflow-hidden
                  transition-opacity duration-500
                  ${isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                `}
                style={{
                  scrollSnapAlign: 'start',
                  width: '100vw',
                  // 모바일: 3:2, 데스크톱: 고정 높이 480px
                  ...(isMobile ? { aspectRatio: '1 / 1' } : { height: '480px' }),
                }}
              >
                <Link href={`/${locale}/collection/${col.id}`} className="absolute inset-0 block" tabIndex={isActive ? 0 : -1}>

                  {thumbUrl ? (
                    <Image
                      src={thumbUrl}
                      alt={col.title}
                      fill
                      className="object-cover transition-transform duration-700 scale-100 group-hover:scale-105"
                      sizes="100vw"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[var(--subtle)]" />
                  )}

                  {/* Scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                  {/* 미니 썸네일 스택 */}
                  {col.items.length >= 3 && (
                    <div className="absolute top-4 right-4 flex flex-col gap-1.5">
                      {col.items.slice(1, 3).map((p, j) => (
                        <div key={j} className="relative w-16 h-10 rounded-xl overflow-hidden shadow-xl opacity-75">
                          <Image src={p.thumbnail_url} alt="" fill className="object-cover" sizes="64px" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 라벨 */}
                  <div className={`absolute left-0 right-0 ${isMobile ? 'bottom-0 pb-10' : 'bottom-16'}`}>
                    <div className="max-w-6xl mx-auto px-4 pr-24">
                      <p className="text-[11px] font-semibold text-white/50 uppercase tracking-widest mb-2">
                        큐레이션 콜렉션
                      </p>
                      <h3 className={`font-black text-white leading-tight line-clamp-2 mb-2 tracking-tight ${isMobile ? 'text-xl' : 'text-4xl'}`}>
                        {col.title}
                      </h3>
                      {col.description && (
                        <p className="text-sm text-white/75 leading-snug line-clamp-2 italic">
                          {col.description}
                        </p>
                      )}
                    </div>
                  </div>

                </Link>
              </div>
            );
          })}
        </div>

        {/* 페이지네이션 — 모바일: 하단 중앙 / 데스크톱: 우측 하단 */}
        <div className={`absolute z-10 flex items-center gap-1.5 ${
          isMobile ? 'bottom-3 left-1/2 -translate-x-1/2' : 'bottom-5 right-6'
        }`}>
          {collections.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                const realCard = cardRefs.current[i + 1];
                const container = scrollRef.current;
                if (realCard && container) container.scrollTo({ left: realCard.offsetLeft, behavior: 'smooth' });
              }}
              className={dotsBtnClass(i)}
            />
          ))}
          <button
            onClick={() => setIsPlaying((v) => !v)}
            className="ml-2 text-white/50 hover:text-white transition-colors"
            aria-label={isPlaying ? '정지' : '재생'}
          >
            {isPlaying ? (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="4" width="4" height="16" rx="1" />
                <rect x="15" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4l14 8-14 8V4z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
