import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

const baseClass =
  'w-full text-sm border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--card)] ' +
  'text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--subtle)] ' +
  'placeholder:text-[var(--subtle)]';

export function Input({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${baseClass} ${className}`} {...props} />;
}

export function Textarea({
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${baseClass} resize-none ${className}`} {...props} />;
}
