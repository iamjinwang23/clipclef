'use client';
// Design Ref: §5 — 글로벌 토스트 렌더러 (RootLayout에서 1회 마운트)

import { useToastStore, type Toast } from '@/lib/toast/store';

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] pointer-events-none flex flex-col gap-2 items-center">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const styles =
    toast.type === 'success'
      ? 'bg-[#1a2a1a] border-green-700 text-green-300'
      : toast.type === 'error'
      ? 'bg-red-950 border-red-800 text-red-200'
      : 'bg-[var(--muted)] border-[var(--border)] text-[var(--foreground)]';

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium border animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-[calc(100vw-2rem)] ${styles}`}
    >
      <ToastIcon type={toast.type} />
      <span className="flex-1">{toast.message}</span>
    </div>
  );
}

function ToastIcon({ type }: { type: Toast['type'] }) {
  if (type === 'success') {
    return (
      <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (type === 'error') {
    return (
      <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
