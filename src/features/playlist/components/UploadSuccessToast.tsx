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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-[var(--foreground)] text-[var(--background)] text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
      플레이리스트가 업로드 되었어요
    </div>
  );
}
