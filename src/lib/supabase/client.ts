// Design Ref: §2.2 — Browser Supabase client (Client Components)
// 싱글톤: 같은 window 에서는 하나의 클라이언트 인스턴스만 사용.
// → 여러 훅에서 `const supabase = createClient()` 해도 ref 가 안정 → useEffect deps 에 포함해도 re-run 없음.
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let instance: SupabaseClient | null = null;

export function createClient() {
  if (!instance) {
    instance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return instance;
}
