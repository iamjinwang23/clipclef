'use client';
// Design Ref: §6.2 — ?auth_error=... 트리거 → 글로벌 토스트 호출 (자체 DOM 없음)

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from '@/lib/toast';

const ERROR_MESSAGES: Record<string, string> = {
  no_code: '로그인 코드가 없습니다. 다시 시도해 주세요.',
  disallowed_useragent: '이 브라우저에서는 Google 로그인이 지원되지 않습니다. Safari 또는 Chrome을 사용해 주세요.',
};

export default function AuthErrorToast() {
  const searchParams = useSearchParams();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    const rawErr = searchParams.get('auth_error');
    if (!rawErr) return;
    fired.current = true;

    const decoded = decodeURIComponent(rawErr);
    const message = ERROR_MESSAGES[decoded] ?? `로그인 오류: ${decoded}`;
    toast.error(message);

    // URL 정리
    const url = new URL(window.location.href);
    url.searchParams.delete('auth_error');
    window.history.replaceState({}, '', url.toString());
  }, [searchParams]);

  return null;
}
