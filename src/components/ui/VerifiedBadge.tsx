// Instagram-style verified checkmark badge
export default function VerifiedBadge({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="인증된 계정"
      className="flex-shrink-0"
    >
      <circle cx="12" cy="12" r="12" fill="#3B82F6" />
      <path
        d="M7 12.5l3.5 3.5 6.5-7"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
