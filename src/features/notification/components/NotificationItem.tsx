// Design Ref: §5.1 — 알림 아이템 (드롭다운 + 모바일 페이지 공유)
import UserAvatar from '@/components/ui/UserAvatar';
import { formatRelativeTime } from '../lib/formatRelativeTime';

export interface NotificationData {
  id: string;
  type: 'follow' | 'like' | 'comment' | 'reply';
  actor: { display_name: string | null; avatar_url: string | null };
  entity_id: string | null;
  entity_type: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_LABEL: Record<NotificationData['type'], string> = {
  follow: '님이 팔로우하기 시작했습니다',
  like: '님이 플리에 좋아요를 눌렀습니다',
  comment: '님이 플리에 댓글을 남겼습니다',
  reply: '님이 댓글에 답글을 남겼습니다',
};

interface NotificationItemProps {
  notification: NotificationData;
  onClick?: (id: string, entityId: string | null, entityType: string | null) => void;
}

export default function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const { id, type, actor, entity_id, entity_type, is_read, created_at } = notification;
  const actorName = actor.display_name ?? '알 수 없음';

  return (
    <button
      onClick={() => onClick?.(id, entity_id, entity_type)}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--muted)] ${!is_read ? 'border-l-2 border-blue-400' : 'border-l-2 border-transparent'}`}
    >
      <div className="flex-shrink-0 mt-0.5">
        <UserAvatar src={actor.avatar_url} name={actorName} size={36} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--foreground)] break-words">
          <span className="font-medium">{actorName}</span>
          {TYPE_LABEL[type]}
        </p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{formatRelativeTime(created_at)}</p>
      </div>
    </button>
  );
}
