// Design Ref: §5.3 — 관리자 페이지 (admin-only guard)
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminContent from '@/features/admin/components/AdminContent';

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect(`/${locale}`);
  }

  return <AdminContent uploadedBy={user.id} />;
}
