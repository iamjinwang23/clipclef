'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import UserAvatar from '@/components/ui/UserAvatar';
import { isInAppBrowser } from '@/lib/browser';

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
  }, []);

  useEffect(() => {
    if (!user) { setAvatarUrl(undefined); return; }
    supabase.from('profiles').select('avatar_url').eq('id', user.id).single()
      .then(({ data }) => setAvatarUrl(data?.avatar_url ?? undefined));
  }, [user]);

  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false)
      .then(({ count }) => setUnreadCount(count ?? 0));

    const channel = supabase
      .channel(`mob-nav-notif:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `recipient_id=eq.${user.id}`,
      }, () => setUnreadCount((c) => c + 1))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleLogin = async () => {
    if (isInAppBrowser()) {
      alert('앱 내 브라우저에서는 Google 로그인이 지원되지 않습니다.\nSafari 또는 Chrome에서 접속해 주세요.');
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
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--background)]/80 backdrop-blur-md border-t border-[var(--border)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center h-14">

          {/* 홈 */}
          <Link href={`/${locale}`} className={item(isHome)} aria-label="홈">
            <svg className="w-7 h-7" fill={isHome ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h12a1 1 0 001-1V10" />
            </svg>
          </Link>

          {/* 검색 */}
          <button onClick={() => router.push(`/${locale}/search`)} className={item(isSearch)} aria-label="검색">
            <svg className="w-7 h-7" fill={isSearch ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="m21 21-4.35-4.35" />
            </svg>
          </button>

          {/* 만들기 */}
          {user ? (
            <Link href={`/${locale}/upload`} className={item(isUpload)} aria-label="만들기">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </Link>
          ) : (
            <button onClick={handleLogin} className={item(false)} aria-label="만들기">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}

          {/* 알림 */}
          {user ? (
            <Link href={`/${locale}/me/notifications`} className={item(isNotif)} aria-label="알림">
              <span className="relative">
                <svg className="w-7 h-7" fill={isNotif ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={isNotif ? 0 : 1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </span>
            </Link>
          ) : (
            <button onClick={handleLogin} className={item(false)} aria-label="알림">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
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
