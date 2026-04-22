// Design Ref: §5.1 — /me/library 페이지 (F4)
// Plan FR-07: 저장한 플리 + 내가 만든 컬렉션 통합 뷰

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LibraryGrid from '@/features/library/components/LibraryGrid';

export default async function MyLibraryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}`);

  return <LibraryGrid />;
}
