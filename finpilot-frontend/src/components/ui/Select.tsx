import type { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export default function Select({ label, className = '', children, ...props }: SelectProps) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>}
      <select
        className={`h-10 w-full rounded-[12px] border border-line bg-white px-3 text-sm text-ink transition-colors duration-150 focus:border-ink/30 focus:outline-none ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
