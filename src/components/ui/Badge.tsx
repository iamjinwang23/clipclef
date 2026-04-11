type Variant = 'default' | 'active' | 'ai' | 'verified';

interface BadgeProps {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  default:  'bg-[var(--muted)] text-[var(--text-secondary)]',
  active:   'bg-[var(--foreground)] text-[var(--background)]',
  ai:       'bg-purple-950/60 text-purple-300 border border-purple-800/40',
  verified: 'bg-blue-950/60 text-blue-300 border border-blue-800/40',
};

export default function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
