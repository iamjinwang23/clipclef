// Design Ref: §2.2 — Admin 인증 가드 (middleware에서 1차 검증, 여기서 UI 레이어)
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
