// Design Ref: §2.2 — [locale] root layout with next-intl + TanStack Query providers
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { routing } from '@/i18n/routing';
import QueryProvider from './QueryProvider';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import AuthErrorToast from '@/components/layout/AuthErrorToast';
import '../globals.css';

export const metadata: Metadata = {
  title: 'clip/clef',
  description: '유튜브 플레이리스트 큐레이션 아카이브',
};

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
            <main className="flex-1 pb-14 sm:pb-0">{children}</main>
            <MobileBottomNav />
            <AuthErrorToast />
            <footer className="hidden sm:block pt-20 pb-10 text-sm text-[var(--subtle)]">
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
