'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function UploadSuccessToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (searchParams.get('uploaded') !== '1') return;
    fired.current = true;
    setShow(true);

    const params = new URLSearchParams(searchParams.toString());
    params.delete('uploaded');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });

    const timer = setTimeout(() => setShow(false), 2500);
    return () => clearTimeout(timer);
  }, [searchParams, router, pathname]);

  if (!show) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium border bg-[#1a2a1a] border-green-700 text-green-300">
        <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        플레이리스트가 업로드 되었어요
      </div>
    </div>
  );
}
