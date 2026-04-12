'use client';
// Design Ref: §5.3 — 장르/분위기/장소 드롭다운 칩

import { useState, useRef, useEffect } from 'react';

interface FilterChipProps {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}

export default function FilterChip({ label, options, selected, onToggle }: FilterChipProps) {
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // 외부 클릭(+ 터치) + 스크롤 시 닫기
  useEffect(() => {
    const close = () => setOpen(false);
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside, { passive: true });
    window.addEventListener('scroll', close, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      window.removeEventListener('scroll', close);
    };
  }, []);

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen((v) => !v);
  };

  const count = selected.length;

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        ref={btnRef}
        onClick={handleOpen}
        style={{ touchAction: 'manipulation' }}
        className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
          count > 0
            ? 'bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]'
            : 'bg-transparent text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--subtle)] hover:text-[var(--foreground)]'
        }`}
      >
        {label}
        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 8L1 3h10L6 8z" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed z-[200] bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl p-2 w-max min-w-[9rem] max-w-[14rem]"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onToggle(opt); }}
              style={{ touchAction: 'manipulation' }}
              className={`w-full text-left text-sm px-3 py-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors text-[var(--foreground)] ${
                selected.includes(opt) ? 'font-medium' : ''
              }`}
            >
              <span className="mr-2">{selected.includes(opt) ? '✓' : ' '}</span>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
