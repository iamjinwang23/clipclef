'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const ERROR_MESSAGES: Record<string, string> = {
  no_code: '로그인 코드가 없습니다. 다시 시도해 주세요.',
  'disallowed_useragent': '이 브라우저에서는 Google 로그인이 지원되지 않습니다. Safari 또는 Chrome을 사용해 주세요.',
};

export default function AuthErrorToast() {
  const searchParams = useSearchParams();
  const rawErr = searchParams.get('auth_error');
  const decoded = rawErr ? decodeURIComponent(rawErr) : null;
  const [dismissed, setDismissed] = useState(false);
  const message = !decoded || dismissed
    ? null
    : (ERROR_MESSAGES[decoded] ?? `로그인 오류: ${decoded}`);

  // URL에서 auth_error 제거 — 파라미터가 있었을 때만 side-effect 실행
  useEffect(() => {
    if (!decoded) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('auth_error');
    window.history.replaceState({}, '', url.toString());
  }, [decoded]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] max-w-sm w-[calc(100%-2rem)]">
      <div className="flex items-start gap-3 bg-red-950 border border-red-800 text-red-200 text-sm px-4 py-3 rounded-xl shadow-2xl">
        <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <span className="flex-1">{message}</span>
        <button
          onClick={() => setDismissed(true)}
          className="text-red-400 hover:text-red-200 transition-colors leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
