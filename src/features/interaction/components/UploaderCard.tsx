'use client';
// 플리 상세 — 업로더 정보 + 팔로우 버튼
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useFollow } from '../hooks/useFollow';
import UserAvatar from '@/components/ui/UserAvatar';
import VerifiedBadge from '@/components/ui/VerifiedBadge';

interface UploaderCardProps {
  uploadedBy: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified?: boolean;
}

export default function UploaderCard({ uploadedBy, displayName, avatarUrl, isVerified }: UploaderCardProps) {
  const locale = useLocale();
  const { isFollowing, followerCount, toggle, loading, isSelf, isLoggedIn } = useFollow(uploadedBy);
  const name = displayName ?? '알 수 없음';

  return (
    <div className="flex items-center justify-between py-2">
      <Link href={`/${locale}/profile/${uploadedBy}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <UserAvatar src={avatarUrl} name={name} size={36} />
        <div>
          <span className="flex items-center gap-1">
              <p className="text-sm font-medium text-[var(--foreground)]">{name}</p>
              {isVerified && <VerifiedBadge size={14} />}
            </span>
          <p className="text-xs text-[var(--subtle)]">팔로워 {followerCount}명</p>
        </div>
      </Link>

      {!isSelf && isLoggedIn && (
        <button
          onClick={toggle}
          disabled={loading}
          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors disabled:opacity-40 ${
            isFollowing
              ? 'border-[var(--border)] text-[var(--text-secondary)] hover:border-red-400 hover:text-red-400'
              : 'bg-[var(--foreground)] text-[var(--background)] border-transparent hover:opacity-80'
          }`}
        >
          {isFollowing ? '팔로잉' : '팔로우'}
        </button>
      )}
    </div>
  );
}
