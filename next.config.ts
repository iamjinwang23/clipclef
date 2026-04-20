import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    // Vercel Hobby 플랜 Image Optimization 쿼터(월 1,000건) 초과로 /_next/image 가
    // 402(OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED)를 반환 → Supabase/theaudiodb/youtube
    // 전부 깨짐. Supabase/YouTube CDN이 이미 reasonable-sized 이미지를 서빙하므로
    // 전역 비활성화해도 체감 UX 영향 미미.
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'yt3.googleusercontent.com' },
      { protocol: 'https', hostname: 'yt3.ggpht.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'assets.fanart.tv' },
      { protocol: 'https', hostname: 'www.theaudiodb.com' },
      { protocol: 'https', hostname: 'cdn.theaudiodb.com' },
      { protocol: 'https', hostname: 'r2.theaudiodb.com' },
    ],
  },
};

export default withNextIntl(nextConfig);
