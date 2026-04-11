'use client';
// 관리자 회원 관리 탭
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';
import UserAvatar from '@/components/ui/UserAvatar';
import VerifiedBadge from '@/components/ui/VerifiedBadge';

export default function AdminMembers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('profiles')
      .select('id, display_name, avatar_url, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProfiles((data as Profile[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <section>
      <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-4">
        가입 회원 ({profiles.length}명)
      </h2>
      <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--card)]">
        {loading ? (
          <p className="py-8 text-center text-xs text-[var(--text-secondary)]">불러오는 중...</p>
        ) : profiles.length === 0 ? (
          <p className="py-8 text-center text-xs text-[var(--text-secondary)]">회원이 없습니다</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)]">
              <tr>
                <th className="py-2 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">회원</th>
                <th className="py-2 px-4 text-left text-xs font-medium text-[var(--text-secondary)]">가입일</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-t border-[var(--border)]">
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar src={p.avatar_url} name={p.display_name} size={28} />
                      <span className="flex items-center gap-1 text-sm">
                        {p.display_name ?? '이름 없음'}
                        {p.is_verified && <VerifiedBadge size={12} />}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-xs text-[var(--text-secondary)]">
                    {new Date(p.created_at).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
