import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export default function Input({ label, hint, id, className = '', ...props }: InputProps) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>}
      <input
        id={id}
        className={`h-10 w-full rounded-[12px] border border-line bg-white px-3 text-sm text-ink placeholder:text-muted/70 transition-colors duration-150 focus:border-ink/30 focus:outline-none ${className}`}
        {...props}
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
