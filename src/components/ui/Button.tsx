import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-[var(--foreground)] text-[var(--background)] hover:opacity-80',
  secondary: 'border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]',
  danger:    'bg-red-600 text-white hover:bg-red-500',
  ghost:     'text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={[
        'rounded-lg font-medium transition-colors disabled:opacity-40',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
