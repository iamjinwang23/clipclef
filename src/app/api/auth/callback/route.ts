// Design Ref: §4.1 — Supabase OAuth callback
import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/ko';

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/ko?auth_error=${encodeURIComponent(error.message)}`);
    }

    // YouTube scope가 포함된 로그인이면 provider_token을 DB에 저장
    const session = data.session;
    if (session?.provider_token && session.user) {
      const serviceClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const expiresAt = session.expires_at
        ? new Date(session.expires_at * 1000).toISOString()
        : null;
      await serviceClient.from('user_tokens').upsert({
        user_id: session.user.id,
        provider: 'google',
        access_token: session.provider_token,
        refresh_token: session.provider_refresh_token ?? null,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      });
    }

    return response;
  }

  return NextResponse.redirect(`${origin}/ko?auth_error=no_code`);
}
