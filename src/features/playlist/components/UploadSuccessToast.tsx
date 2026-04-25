'use client';
// Design Ref: §6.2 — ?uploaded=1 트리거 → 글로벌 토스트 호출 (자체 DOM 없음)

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@/lib/toast';

export default function UploadSuccessToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (searchParams.get('uploaded') !== '1') return;
    fired.current = true;

    toast.success('플레이리스트가 업로드 되었어요');

    const params = new URLSearchParams(searchParams.toString());
    params.delete('uploaded');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  return null;
}
