'use client';
// 수평 스크롤 레일 공용 — 좌/우 가장자리에 그라데이션 fade.
// 시작 위치에서는 왼쪽 그라데이션 숨김, 스크롤 시작하면 슥 fade-in (Suno 장르 탭 연출).

import { useEffect, useRef, useState } from 'react';

interface ScrollRailProps {
  children: React.ReactNode;
  /** 내부 flex 컨테이너에 합쳐질 추가 클래스 */
  className?: string;
  /** CSS scroll-snap 적용 */
  snap?: boolean;
  /** 그라데이션 폭 (px). 기본 48. */
  fadeWidth?: number;
}

export default function ScrollRail({
  children,
  className = '',
  snap = false,
  fadeWidth = 48,
}: ScrollRailProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const updateEdges = () => {
    const el = ref.current;
    if (!el) return;
    // 4px 버퍼로 경계 떨림 방지
    setShowLeft(el.scrollLeft > 4);
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateEdges();
    window.addEventListener('resize', updateEdges);
    return () => window.removeEventListener('resize', updateEdges);
  }, []);

  return (
    <div className="relative">
      {/* 좌측 페이드 — 시작점에서는 숨김, 스크롤 시작하면 fade-in */}
      <div
        className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 bg-gradient-to-r from-[var(--background)] to-transparent transition-opacity duration-200"
        style={{ width: fadeWidth, opacity: showLeft ? 1 : 0 }}
        aria-hidden
      />
      {/* 우측 페이드 — 끝에 도달하면 숨김 */}
      <div
        className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 bg-gradient-to-l from-[var(--background)] to-transparent transition-opacity duration-200"
        style={{ width: fadeWidth, opacity: showRight ? 1 : 0 }}
        aria-hidden
      />

      <div
        ref={ref}
        onScroll={updateEdges}
        className={`flex gap-4 overflow-x-auto scrollbar-hide py-1 ${className}`}
        style={snap ? { scrollSnapType: 'x proximity' } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
