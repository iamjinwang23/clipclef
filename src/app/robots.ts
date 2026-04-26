import type { MetadataRoute } from 'next';
import { IS_PRODUCTION, SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  // 프리뷰/개발 배포는 색인 차단 (production 만 검색 노출)
  if (!IS_PRODUCTION) {
    return {
      rules: { userAgent: '*', disallow: '/' },
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // 인증/관리자/비공개 영역은 크롤러 제외
        disallow: ['/api/', '/admin/', '/me/', '/auth/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
