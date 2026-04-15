// Supabase SSR — 세션 갱신 미들웨어
// 서버 컴포넌트에서 getUser()가 만료된 토큰을 갱신할 수 있도록
// 매 요청마다 쿠키 기반으로 세션을 refresh하고 response에 반영한다.
import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // request에도 반영 (이후 핸들러가 읽을 수 있도록)
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // 새로운 response를 만들어 갱신된 쿠키를 브라우저로 전달
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: createServerClient와 getUser() 사이에 로직 추가 금지
  // 토큰이 만료된 경우 여기서 refresh token으로 갱신 후 쿠키에 반영된다.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    // 정적 파일 / 이미지 최적화 경로 제외, 나머지 모든 요청에 적용
    '/((?!_next/static|_next/image|favicon.ico|icon\\.svg|logo\\.svg|mobile_logo\\.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
