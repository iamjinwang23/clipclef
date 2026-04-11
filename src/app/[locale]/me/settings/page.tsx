// 기본 정보 설정 페이지 — /me/profile 설정 메뉴에서 접근
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ProfileForm from '../profile/ProfileForm';

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}`);

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', user.id)
    .single();

  const displayName = profile?.display_name ?? '';
  const avatarUrl = profile?.avatar_url ?? (user.user_metadata?.avatar_url as string | undefined) ?? '';

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link
        href={`/${locale}/me/profile`}
        className="text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] inline-flex items-center gap-1 mb-6"
      >
        ← 프로필로
      </Link>
      <h1 className="text-xl font-semibold mb-6">기본 정보</h1>
      <ProfileForm
        userId={user.id}
        email={user.email ?? ''}
        initialDisplayName={displayName}
        avatarUrl={avatarUrl}
      />
    </div>
  );
}
