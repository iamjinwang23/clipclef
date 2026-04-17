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

  const item = (active: boolean) =>
    `flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors ${
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
          <Link href={`/${locale}`} className={item(isHome)}>
            <svg className="w-5 h-5" fill={isHome ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[10px]">홈</span>
          </Link>

          {/* 검색 */}
          <button onClick={() => router.push(`/${locale}/search`)} className={item(isSearch)}>
            <svg className="w-5 h-5" fill={isSearch ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="m21 21-4.35-4.35" />
            </svg>
            <span className="text-[10px]">검색</span>
          </button>

          {/* 만들기 */}
          {user ? (
            <Link href={`/${locale}/upload`} className={item(isUpload)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[10px]">만들기</span>
            </Link>
          ) : (
            <button onClick={handleLogin} className={item(false)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[10px]">만들기</span>
            </button>
          )}

          {/* 알림 */}
          {user ? (
            <Link href={`/${locale}/me/notifications`} className={item(isNotif)}>
              <span className="relative">
                <svg className="w-5 h-5" fill={isNotif ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={isNotif ? 0 : 1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </span>
              <span className="text-[10px]">알림</span>
            </Link>
          ) : (
            <button onClick={handleLogin} className={item(false)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="text-[10px]">알림</span>
            </button>
          )}

          {/* 프로필 */}
          {user ? (
            <Link href={`/${locale}/me/profile`} className={item(isProfile)}>
              <UserAvatar src={avatarUrl} name={user.user_metadata?.full_name as string} size={22} />
              <span className="text-[10px]">프로필</span>
            </Link>
          ) : (
            <button onClick={handleLogin} className={item(false)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-[10px]">프로필</span>
            </button>
          )}

        </div>
      </nav>

    </>
  );
}
