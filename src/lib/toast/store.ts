// Design Ref: §3 — Zustand toast store (single source of truth)
// 자동 dismiss는 push 시 setTimeout 등록. 수동 dismiss로 일찍 제거되어도 timer는 no-op로 끝남.

import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  durationMs: number;
  createdAt: number;
}

interface ToastStore {
  toasts: Toast[];
  push: (input: { message: string; type: ToastType; durationMs?: number }) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 2500,
  error: 4000,
  info: 3500,
};

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  push: ({ message, type, durationMs }) => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ms = durationMs ?? DEFAULT_DURATION[type];
    const toast: Toast = { id, message, type, durationMs: ms, createdAt: Date.now() };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    if (ms > 0) {
      setTimeout(() => get().dismiss(id), ms);
    }
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));
