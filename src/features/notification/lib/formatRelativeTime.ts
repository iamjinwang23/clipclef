// Design Ref: §5.3 — 상대 시간 표기 (인스타그램 스타일)
export function formatRelativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)      return '방금 전';
  if (diff < 3600)    return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400)   return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800)  return `${Math.floor(diff / 86400)}일 전`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}주 전`;
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
