import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'clip/clef',
  description: '취향을 모으고, 취향으로 듣다',
};

// Root layout: [locale] 레이아웃이 html/body를 렌더링
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
