'use client';
// Design Ref: §3.1 — 데스크톱 좌측 thin rail (64px). 모바일에서는 hidden, BottomNav 사용.
// 메뉴 구성 (위→아래): 로고 → (gap) → 홈 → 알림 → 만들기 → 프로필 → (push) → 설정(자리만)

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import UserAvatar from '@/components/ui/UserAvatar';
import { isInAppBrowser } from '@/lib/browser';
import { toast } from '@/lib/toast';

export default function DesktopRail() {
  const locale = useLocale();
  const pathname = usePathname();
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

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase.from('profiles').select('avatar_url').eq('id', user.id).single()
      .then(({ data }) => { if (!cancelled) setAvatarUrl(data?.avatar_url ?? undefined); });
    return () => { cancelled = true; };
  }, [user, supabase]);

  // Design Ref: §9 — channel 명을 BottomNav 와 분리해 리소스 충돌 방지
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
      .channel(`rail-nav-notif:${user.id}`)
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

  // Design Ref: §4 — active path matching
  const isHome = pathname === `/${locale}` || pathname === `/${locale}/`;
  const isNotif = pathname.includes('/me/notifications');
  const isUpload = pathname.includes('/upload');
  const isProfile = pathname.includes('/me/') && !isNotif;

  return (
    <aside
      className="hidden md:flex flex-col w-16 h-screen bg-[var(--background)] border-r border-[var(--border)] z-30 pb-3 flex-shrink-0"
      aria-label="주 메뉴"
    >
      {/* 로고 — 헤더 검색창과 같은 라인(h-16)에서 수직 가운데 정렬 */}
      <div className="h-16 flex items-center justify-center flex-shrink-0">
        <Link href={`/${locale}`} aria-label="홈으로" className="flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mobile_logo.svg" alt="ClipClef" className="h-5 w-auto" />
        </Link>
      </div>

      {/* 메인 메뉴 그룹 — 로고 아래 약간의 gap, 아이콘 간 여백 ↑ */}
      <nav className="flex flex-col items-center gap-3 pt-4">
        {/* 홈 */}
        <RailItem href={`/${locale}`} active={isHome} ariaLabel="홈">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={isHome ? '/icons/bottom-nav/Home.svg' : '/icons/bottom-nav/Home_Line.svg'}
            alt=""
            className={`w-7 h-7 invert ${isHome ? '' : 'opacity-60'}`}
          />
        </RailItem>

        {/* 알림 */}
        {user ? (
          <RailItem href={`/${locale}/me/notifications`} active={isNotif} ariaLabel="알림">
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
          </RailItem>
        ) : (
          <RailButton onClick={handleLogin} ariaLabel="알림">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/bottom-nav/Bell-Line.svg" alt="" className="w-7 h-7 invert opacity-60" />
          </RailButton>
        )}

        {/* 만들기 */}
        {user ? (
          <RailItem href={`/${locale}/upload`} active={isUpload} ariaLabel="만들기">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/bottom-nav/Plus.svg" alt="" className={`w-7 h-7 invert ${isUpload ? '' : 'opacity-60'}`} />
          </RailItem>
        ) : (
          <RailButton onClick={handleLogin} ariaLabel="만들기">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/bottom-nav/Plus.svg" alt="" className="w-7 h-7 invert opacity-60" />
          </RailButton>
        )}

        {/* 프로필 */}
        {user ? (
          <RailItem href={`/${locale}/me/profile`} active={isProfile} ariaLabel="프로필">
            <UserAvatar src={avatarUrl} name={user.user_metadata?.full_name as string} size={28} />
          </RailItem>
        ) : (
          <RailButton onClick={handleLogin} ariaLabel="프로필">
            <svg className="w-7 h-7 text-[var(--text-secondary)] opacity-60" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="10" r="3" />
              <path strokeLinecap="round" d="M6.5 19a6 6 0 0111 0" />
            </svg>
          </RailButton>
        )}
      </nav>

      {/* 설정 — 하단 자리만 (Phase 1 OOS) */}
      <div className="mt-auto flex justify-center pb-2">
        <button
          onClick={() => toast.info('준비 중입니다')}
          className="p-2.5 opacity-40 cursor-not-allowed"
          aria-label="설정 (준비 중)"
          disabled
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Settings.svg" alt="" className="w-7 h-7 invert opacity-60" />
        </button>
      </div>
    </aside>
  );
}

// ─── 서브컴포넌트 ────────────────────────────────────────────────────────────
function RailItem({
  href,
  active,
  ariaLabel,
  children,
}: {
  href: string;
  active: boolean;
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      aria-current={active ? 'page' : undefined}
      title={ariaLabel}
      className="flex items-center justify-center w-12 h-12 rounded-lg transition-[transform] duration-100 ease-out active:scale-95"
    >
      {children}
    </Link>
  );
}

function RailButton({
  onClick,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="flex items-center justify-center w-12 h-12 rounded-lg transition-[transform] duration-100 ease-out active:scale-95"
    >
      {children}
    </button>
  );
}
