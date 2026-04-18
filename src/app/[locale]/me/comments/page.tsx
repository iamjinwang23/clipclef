// Design Ref: §5.3 — 내 댓글 페이지
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

interface CommentRow {
  id: string;
  content: string;
  created_at: string;
  playlists: { id: string; title: string; thumbnail_url: string } | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default async function MyCommentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}`);

  const { data } = await supabase
    .from('comments')
    .select('id, content, created_at, playlists(id, title, thumbnail_url)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const comments = (data ?? []) as unknown as CommentRow[];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold mb-6">내 댓글</h1>
      {comments.length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--text-secondary)]">작성한 댓글이 없어요</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id}>
              <Link
                href={`/${locale}/playlist/${c.playlists?.id}`}
                className="block p-4 border border-[var(--border)] rounded-xl hover:bg-[var(--muted)] transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  {c.playlists?.thumbnail_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.playlists.thumbnail_url} alt="" className="w-10 h-7 object-cover rounded flex-shrink-0" />
                  )}
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{c.playlists?.title ?? '삭제된 영상'}</p>
                  <span className="text-xs text-[var(--text-secondary)] ml-auto whitespace-nowrap">{formatDate(c.created_at)}</span>
                </div>
                <p className="text-sm text-[var(--foreground)]">{c.content}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
