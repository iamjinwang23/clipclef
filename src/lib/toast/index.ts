// Design Ref: §4 — Public toast helper API
// 사용 예: toast.success('저장됐어요'), toast.error('실패', { durationMs: 6000 })

import { useToastStore } from './store';

interface ToastOptions {
  durationMs?: number;
}

export const toast = {
  success: (message: string, opts?: ToastOptions): string =>
    useToastStore.getState().push({ message, type: 'success', durationMs: opts?.durationMs }),
  error: (message: string, opts?: ToastOptions): string =>
    useToastStore.getState().push({ message, type: 'error', durationMs: opts?.durationMs }),
  info: (message: string, opts?: ToastOptions): string =>
    useToastStore.getState().push({ message, type: 'info', durationMs: opts?.durationMs }),
  dismiss: (id: string): void => useToastStore.getState().dismiss(id),
  clear: (): void => useToastStore.getState().clear(),
};

export type { Toast, ToastType } from './store';
