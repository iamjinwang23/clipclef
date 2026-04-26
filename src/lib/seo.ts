// SEO 공통 상수: sitemap, robots, generateMetadata 에서 공용 사용
const PROD_URL = 'https://clipclef.vercel.app';

// VERCEL_ENV: 'production' | 'preview' | 'development'
// production 외에는 noindex 처리되므로 SITE_URL 도 런타임 호스트를 따라가게 함.
function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_ENV === 'production') return PROD_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return PROD_URL;
}

export const SITE_URL = resolveSiteUrl();
export const SITE_NAME = 'clip/clef';
export const SITE_DESCRIPTION = '유튜브 플레이리스트 큐레이션 아카이브';
export const OG_DEFAULT = '/og-default.png';
export const LOCALES = ['ko', 'en'] as const;
export const DEFAULT_LOCALE = 'ko';
export const IS_PRODUCTION = process.env.VERCEL_ENV === 'production';
