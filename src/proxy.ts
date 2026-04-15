// Design Ref: §2.3 — Edge Proxy: Supabase session refresh + i18n locale routing + admin guard
import { createServerClient } from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';

const handleI18n = createIntlMiddleware(routing);

type CookieEntry = { name: string; value: string; options: object };

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pendingCookies: CookieEntry[] = [];

  // 1. Supabase session refresh (must run for all routes per @supabase/ssr docs)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          pendingCookies.push(...toSet);
          // request.cookies도 업데이트 → 서버 컴포넌트가 갱신된 토큰을 읽을 수 있도록
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Admin path protection
  const isAdminPath = /^\/(ko|en)\/admin/.test(pathname);
  if (isAdminPath && (!user || user.email !== process.env.ADMIN_EMAIL)) {
    const locale = pathname.startsWith('/en') ? 'en' : 'ko';
    const redirect = NextResponse.redirect(new URL(`/${locale}`, request.url));
    for (const { name, value, options } of pendingCookies) {
      redirect.cookies.set(name, value, options as Parameters<typeof redirect.cookies.set>[2]);
    }
    return redirect;
  }

  // 3. i18n locale routing
  const response = handleI18n(request);
  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
