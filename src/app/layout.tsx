import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ClipClef',
  description: '유튜브 플레이리스트 큐레이션 아카이브',
};

// Root layout: [locale] 레이아웃이 html/body를 렌더링
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
