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
      <body className="min-h-full flex flex-col" style={{ backgroundColor: '#0D0D0D', color: '#F0F0F0' }}>
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <Header />
            <div className="flex-1 flex">
              <DesktopRail />
              <main className="flex-1 min-w-0 pb-[calc(8.5rem+env(safe-area-inset-bottom))] sm:pb-20">{children}</main>
            </div>
            <MobileBottomNav />
            <AuthErrorToast />
            <ToastContainer />
            {/* Design Ref: §1.2 — Persistent Player 단일 마운트 지점. 세션 내 재생성 금지 */}
            <PersistentPlayer />
            <MiniBar />
            <footer className="hidden sm:block pt-20 pb-32 text-sm text-[var(--subtle)]">
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
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
