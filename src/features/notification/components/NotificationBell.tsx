'use client';
// Design Ref: §5.2 — 벨 아이콘 + Realtime 구독 + 드롭다운(웹) / 페이지 이동(모바일)

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import NotificationItem, { type NotificationData } from './NotificationItem';

interface NotificationBellProps {
  userId: string;
  locale: string;
}

export default function NotificationBell({ userId, locale }: NotificationBellProps) {
  const router = useRouter();
  const supabase = createClient();

  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 초기 unread count 로드
  useEffect(() => {
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false)
      .then(({ count }) => setUnreadCount(count ?? 0));
  }, [userId, supabase]);

  // Realtime 구독 — 새 알림 INSERT 감지
  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
        () => setUnreadCount((c) => c + 1),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, supabase]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchNotifications = async () => {
    setLoadingList(true);
    setError(false);
    const { data, error: fetchError } = await supabase
      .from('notifications')
      .select('id, type, entity_id, entity_type, is_read, created_at, actor:profiles!actor_id(display_name, avatar_url)')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (fetchError) { setError(true); setLoadingList(false); return; }
    setNotifications((data ?? []) as unknown as NotificationData[]);
    setLoadingList(false);

    // 읽음 처리 (실패해도 UI는 업데이트)
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);
    setUnreadCount(0);
  };

  const handleBellClick = () => {
    if (window.innerWidth < 640) {
      router.push(`/${locale}/me/notifications`);
      return;
    }
    if (!open) fetchNotifications();
    setOpen((v) => !v);
  };

  const handleItemClick = (_id: string, entityId: string | null, entityType: string | null) => {
    setOpen(false);
    if (entityType === 'playlist' && entityId) {
      router.push(`/${locale}/playlist/${entityId}`);
    } else if (entityType === 'profile' && entityId) {
      router.push(`/${locale}/profile/${entityId}`);
    }
  };

  return (
    <div ref={dropdownRef} className="relative flex-shrink-0">
      <button
        onClick={handleBellClick}
        className="relative p-2 rounded-full text-white hover:bg-white/10 transition-colors"
        aria-label="알림"
      >
        {/* 벨 아이콘 */}
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {/* 빨간 점 */}
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {/* 드롭다운 — 데스크톱 전용 */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <p className="text-sm font-medium text-[var(--foreground)]">알림</p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loadingList && (
              <p className="text-sm text-[var(--text-secondary)] text-center py-8">불러오는 중...</p>
            )}
            {!loadingList && error && (
              <p className="text-sm text-[var(--text-secondary)] text-center py-8">알림을 불러오지 못했습니다</p>
            )}
            {!loadingList && !error && notifications.length === 0 && (
              <p className="text-sm text-[var(--text-secondary)] text-center py-8">알림이 없어요</p>
            )}
            {!loadingList && !error && notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} onClick={handleItemClick} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
