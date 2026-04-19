'use client';
import { useState } from 'react';

interface UserAvatarProps {
  src: string | null | undefined;
  name: string | null | undefined;
  size?: number; // px, maps to Tailwind arbitrary or inline style
  className?: string;
}

export default function UserAvatar({ src, name, size = 32, className = '' }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const initial = name?.[0]?.toUpperCase() ?? '?';

  return (
    <div
      className={`rounded-full overflow-hidden bg-[var(--muted)] flex-shrink-0 flex items-center justify-center ring-[0.5px] ring-white/20 ${className}`}
      style={{ width: size, height: size }}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="font-medium text-[var(--text-secondary)]"
          style={{ fontSize: Math.max(10, Math.round(size * 0.38)) }}
        >
          {initial}
        </span>
      )}
    </div>
  );
}
