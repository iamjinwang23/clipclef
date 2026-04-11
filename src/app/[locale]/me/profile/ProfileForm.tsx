'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import UserAvatar from '@/components/ui/UserAvatar';

interface ProfileFormProps {
  userId: string;
  email: string;
  initialDisplayName: string;
  avatarUrl: string;
}

export default function ProfileForm({ userId, email, initialDisplayName, avatarUrl }: ProfileFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    await supabase.from('profiles').update({ display_name: displayName }).eq('id', userId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = async () => {
    if (!confirm('계정을 탈퇴하면 모든 데이터가 삭제됩니다. 정말 탈퇴하시겠습니까?')) return;
    setDeleting(true);
    const supabase = createClient();
    // 댓글, 좋아요, 컬렉션 삭제 (프로필은 cascade 삭제됨)
    await supabase.from('comments').delete().eq('user_id', userId);
    await supabase.from('likes').delete().eq('user_id', userId);
    await supabase.from('collections').delete().eq('user_id', userId);
    await supabase.from('profiles').delete().eq('id', userId);
    await supabase.auth.signOut();
    router.push('/ko');
    router.refresh();
  };

  return (
    <div className="space-y-8">
      {/* 아바타 + 이메일 */}
      <div className="flex items-center gap-4">
        <UserAvatar src={avatarUrl} name={displayName} size={56} />
        <div>
          <p className="text-sm font-medium">{displayName || '이름 없음'}</p>
          <p className="text-xs text-[var(--text-secondary)]">{email}</p>
        </div>
      </div>

      {/* 닉네임 수정 */}
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">닉네임</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={30}
            className="w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--subtle)]"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 text-sm font-medium bg-[var(--foreground)] text-[var(--background)] rounded-lg disabled:opacity-40 hover:opacity-80 transition-opacity"
        >
          {saved ? '저장됨' : saving ? '저장 중...' : '저장'}
        </button>
      </form>

      {/* 탈퇴 */}
      <div className="pt-6 border-t border-[var(--border)]">
        <p className="text-sm font-medium text-[var(--foreground)] mb-2">계정 탈퇴</p>
        <p className="text-xs text-[var(--text-secondary)] mb-3">탈퇴 시 모든 댓글, 좋아요, 컬렉션 데이터가 삭제됩니다.</p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-red-400 hover:text-red-300 underline disabled:opacity-40"
        >
          {deleting ? '처리 중...' : '탈퇴하기'}
        </button>
      </div>
    </div>
  );
}
