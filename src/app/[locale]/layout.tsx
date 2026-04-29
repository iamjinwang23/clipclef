// Design Ref: §2.2 — [locale] root layout with next-intl + TanStack Query providers
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { routing } from '@/i18n/routing';
import QueryProvider from './QueryProvider';
import Header from '@/components/layout/Header';
import DesktopRail from '@/components/layout/DesktopRail';
import RightNowPlayingPanel from '@/components/layout/RightNowPlayingPanel';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import AuthErrorToast from '@/components/layout/AuthErrorToast';
import ToastContainer from '@/components/layout/ToastContainer';
import PersistentPlayer from '@/features/player/components/PersistentPlayer';
import MiniBar from '@/features/player/components/MiniBar';
import { LOCALES, OG_DEFAULT, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/seo';
import '../globals.css';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const languages: Record<string, string> = {};
  for (const lc of LOCALES) languages[lc] = `${SITE_URL}/${lc}`;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: SITE_NAME,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    alternates: {
      canonical: `/${locale}`,
      languages,
    },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      url: `${SITE_URL}/${locale}`,
      locale: locale === 'ko' ? 'ko_KR' : 'en_US',
      images: [{ url: OG_DEFAULT, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: 'summary_large_image',
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: [OG_DEFAULT],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
  };
}

export const viewport = {
  colorScheme: 'dark',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'ko' | 'en')) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} className="h-full" style={{ colorScheme: 'dark', backgroundColor: '#0D0D0D' }}>
      {/* Mobile/tablet (<lg): 일반 vertical scroll. Desktop (lg+): 컬럼별 독립 스크롤 (rail + 4-zone). lg 미만은 viewport 가 좁아 4-zone 이 답답해짐 → 모바일 UX 로 전환. */}
      <body
        className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row"
        style={{ backgroundColor: '#0D0D0D', color: '#F0F0F0' }}
      >
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            {/* 데스크톱 좌측 rail — 풀-높이, 헤더 위에 오는 첫 컬럼 */}
            <DesktopRail />

            {/* 가운데 컬럼: header + scrollable area (main + footer) */}
            <div className="flex-1 flex flex-col min-w-0 lg:overflow-hidden">
              <Header />
              {/* 스크롤 컨테이너 — lg+ 는 lg:flex lg:flex-col 로 footer mt-auto 가능. main 은 일반 block 으로 children 격리 */}
              <div className="flex-1 lg:overflow-y-auto min-w-0 lg:flex lg:flex-col">
                <main className="pb-[calc(8.5rem+env(safe-area-inset-bottom))] lg:pb-0">
                  {children}
                </main>
                <footer className="hidden sm:block lg:mt-auto pt-20 pb-32 text-sm text-[var(--subtle)]">
                  <div className="max-w-6xl mx-auto px-4 flex flex-col gap-3">
                    <div className="flex items-center gap-5">
                      <Link href={`/${locale}`} className="flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.svg" alt="ClipClef" className="h-4.5 w-auto opacity-40" />
                      </Link>
                      <Link href={`/${locale}/terms`} className="hover:text-[var(--foreground)] transition-colors">
                        Agreement
                      </Link>
                      <Link href={`/${locale}/privacy`} className="hover:text-[var(--foreground)] transition-colors">
                        Privacy
                      </Link>
                      <a
                        href={`mailto:${process.env.ADMIN_EMAIL}`}
                        className="hover:text-[var(--foreground)] transition-colors"
                      >
                        Contact
                      </a>
                    </div>
                    <p>2026 ©clip/clef, all rights reserved.</p>
                  </div>
                </footer>
              </div>
            </div>

            {/* 데스크톱 우측 now-playing 패널 — Phase 2 */}
            <RightNowPlayingPanel />

            {/* Fixed elements — body flex 영향 받지 않음 */}
            <MobileBottomNav />
            <AuthErrorToast />
            <ToastContainer />
            {/* Design Ref: §1.2 — Persistent Player 단일 마운트 지점. 세션 내 재생성 금지 */}
            <PersistentPlayer />
            <MiniBar />
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
