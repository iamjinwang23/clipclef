// Design Ref: home-redesign.design.md §5.1 — shared section wrapper (label + "자세히 보기 →")
// 각 홈 섹션이 동일한 타이포그래피·간격·자세히-보기 규칙을 따르도록 통일

import Link from 'next/link';

interface HomeSectionProps {
  /** 섹션 레이블 — 플리 상세 제목과 동일한 폰트/사이즈 */
  label: string;
  /** 자세히 보기 → 목적지. undefined 면 CTA 미노출 */
  href?: string;
  children: React.ReactNode;
}

export default function HomeSection({ label, href, children }: HomeSectionProps) {
  return (
    <section className="max-w-6xl mx-auto px-4 mt-8 first:mt-4">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xl font-bold leading-snug text-[var(--foreground)]">
          {label}
        </h2>
        {href && (
          <Link
            href={href}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
          >
            더 보기
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
