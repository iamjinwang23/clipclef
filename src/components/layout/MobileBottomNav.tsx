'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import UserAvatar from '@/components/ui/UserAvatar';
import { isInAppBrowser } from '@/lib/browser';
import { toast } from '@/lib/toast';

export default function MobileBottomNav() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // user 가 null 로 바뀌면 avatar/unread 값은 렌더에서 자연히 가려지므로 sync 리셋 불필요.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase.from('profiles').select('avatar_url').eq('id', user.id).single()
      .then(({ data }) => { if (!cancelled) setAvatarUrl(data?.avatar_url ?? undefined); });
    return () => { cancelled = true; };
  }, [user, supabase]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false)
      .then(({ count }) => { if (!cancelled) setUnreadCount(count ?? 0); });

    const channel = supabase
      .channel(`mob-nav-notif:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `recipient_id=eq.${user.id}`,
      }, () => setUnreadCount((c) => c + 1))
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  const handleLogin = async () => {
    if (isInAppBrowser()) {
      toast.info('앱 내 브라우저에서는 Google 로그인이 지원되지 않습니다. Safari 또는 Chrome에서 접속해 주세요.');
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  };

  const isHome = pathname === `/${locale}` || pathname === `/${locale}/`;
  const isSearch = pathname === `/${locale}/search`;
  const isUpload = pathname.includes('/upload');
  const isNotif = pathname.includes('/me/notifications');
  const isProfile = pathname.includes('/me/') && !isNotif;

  // 하단 탭 전용 press 피드백 — opacity(전역)에 더해 scale 추가 (모바일 전용 nav)
  const item = (active: boolean) =>
    `flex items-center justify-center flex-1 h-full transition-[color,transform] duration-100 ease-out active:scale-95 ${
      active ? 'text-[var(--foreground)]' : 'text-[var(--text-secondary)]'
    }`;

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--background)]/80 backdrop-blur-md border-t border-[var(--border)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center h-14">

          {/* 홈 */}
          <Link href={`/${locale}`} className={item(isHome)} aria-label="홈">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={isHome ? '/icons/bottom-nav/Home.svg' : '/icons/bottom-nav/Home_Line.svg'}
              alt=""
              className={`w-7 h-7 invert ${isHome ? '' : 'opacity-60'}`}
            />
          </Link>

          {/* 검색 */}
          <button onClick={() => router.push(`/${locale}/search`)} className={item(isSearch)} aria-label="검색">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={isSearch ? '/icons/bottom-nav/Search.svg' : '/icons/bottom-nav/Search_Line.svg'}
              alt=""
              className={`w-7 h-7 invert ${isSearch ? '' : 'opacity-60'}`}
            />
          </button>

          {/* 만들기 */}
          {user ? (
            <Link href={`/${locale}/upload`} className={item(isUpload)} aria-label="만들기">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/bottom-nav/Plus.svg" alt="" className={`w-7 h-7 invert ${isUpload ? '' : 'opacity-60'}`} />
            </Link>
          ) : (
            <button onClick={handleLogin} className={item(false)} aria-label="만들기">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/bottom-nav/Plus.svg" alt="" className="w-7 h-7 invert opacity-60" />
            </button>
          )}

          {/* 알림 */}
          {user ? (
            <Link href={`/${locale}/me/notifications`} className={item(isNotif)} aria-label="알림">
              <span className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={isNotif ? '/icons/bottom-nav/Bell.svg' : '/icons/bottom-nav/Bell-Line.svg'}
                  alt=""
                  className={`w-7 h-7 invert ${isNotif ? '' : 'opacity-60'}`}
                />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </span>
            </Link>
          ) : (
            <button onClick={handleLogin} className={item(false)} aria-label="알림">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/bottom-nav/Bell-Line.svg" alt="" className="w-7 h-7 invert opacity-60" />
            </button>
          )}

          {/* 프로필 */}
          {user ? (
            <Link href={`/${locale}/me/profile`} className={item(isProfile)} aria-label="프로필">
              <UserAvatar src={avatarUrl} name={user.user_metadata?.full_name as string} size={28} />
            </Link>
          ) : (
            <button onClick={handleLogin} className={item(false)} aria-label="프로필">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="10" r="3" />
                <path strokeLinecap="round" d="M6.5 19a6 6 0 0111 0" />
              </svg>
            </button>
          )}

        </div>
      </nav>

    </>
  );
}
