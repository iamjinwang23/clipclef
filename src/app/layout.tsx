import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'clip/clef',
  description: '취향을 클립하고, 취향을 듣다 — 유튜브 플리 큐레이션',
};

// Root layout: [locale] 레이아웃이 html/body를 렌더링
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
