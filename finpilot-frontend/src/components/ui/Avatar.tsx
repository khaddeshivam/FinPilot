import { initials } from '../../lib/format';

export default function Avatar({ name, size = 36 }: { name?: string; size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
