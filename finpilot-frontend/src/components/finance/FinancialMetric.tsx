export default function FinancialMetric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'positive' | 'negative';
}) {
  const hintClass =
    tone === 'positive' ? 'text-positive-dark' : tone === 'negative' ? 'text-negative' : 'text-muted';
  return (
    <div className="rounded-[22px] border border-line bg-surface px-5 py-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="mt-2 font-mono text-[28px] font-semibold tracking-tight text-ink sm:text-[30px]">{value}</p>
      {hint && <p className={`mt-1.5 text-[12px] ${hintClass}`}>{hint}</p>}
    </div>
  );
}
