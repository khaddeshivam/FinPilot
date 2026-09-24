import type { ButtonHTMLAttributes } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
}

export default function IconButton({ label, active, className = '', ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink/80 transition-colors duration-150 hover:bg-canvas hover:text-ink ${active ? 'bg-canvas' : ''} ${className}`}
      {...props}
    />
  );
}
