import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PlaylistForm from '@/features/admin/components/PlaylistForm';

export default async function UploadPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}`);

  return (
    <div className="px-6 sm:px-16 lg:px-24 py-10 sm:py-14">
      <h1 className="text-2xl sm:text-3xl font-semibold mb-8 sm:mb-10">플레이리스트 올리기</h1>
      <PlaylistForm uploadedBy={user.id} locale={locale} />
    </div>
  );
}
