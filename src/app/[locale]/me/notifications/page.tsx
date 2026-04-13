// Design Ref: §5.3 — 모바일 알림 페이지 (서버 컴포넌트, SSR)
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import NotificationItem, { type NotificationData } from '@/features/notification/components/NotificationItem';

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}`);

  const { data } = await supabase
    .from('notifications')
    .select('id, type, entity_id, entity_type, is_read, created_at, actor:profiles!actor_id(display_name, avatar_url)')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  // 페이지 접근 시 모두 읽음 처리
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', user.id)
    .eq('is_read', false);

  const notifications = (data ?? []) as unknown as NotificationData[];

  return (
    <div className="max-w-lg mx-auto px-0">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border)]">
        <Link
          href={`/${locale}/me/profile`}
          className="p-1 -ml-1 text-[var(--foreground)] hover:text-[var(--text-secondary)] transition-colors"
          aria-label="뒤로"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-[var(--foreground)]">알림</h1>
      </div>

      {/* 알림 목록 */}
      {notifications.length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--text-secondary)]">알림이 없습니다</p>
      ) : (
        <ul>
          {notifications.map((n) => (
            <li key={n.id} className="border-b border-[var(--border)] last:border-b-0">
              <NotificationItemLink notification={n} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// 모바일 페이지에서는 Link로 감싸서 네비게이션 처리
function NotificationItemLink({ notification, locale }: { notification: NotificationData; locale: string }) {
  const { entity_id, entity_type } = notification;
  let href = `/${locale}/me/profile`;
  if (entity_type === 'playlist' && entity_id) href = `/${locale}/playlist/${entity_id}`;
  else if (entity_type === 'profile' && entity_id) href = `/${locale}/profile/${entity_id}`;

  return (
    <Link href={href} className="block">
      <NotificationItem notification={notification} />
    </Link>
  );
}
