import { redirect } from 'next/navigation';

// / → /ko 리디렉트 (middleware가 처리하지만 fallback으로)
export default function RootPage() {
  redirect('/ko');
}
