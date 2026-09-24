type Tone = 'neutral' | 'positive' | 'warning' | 'negative';

const tones: Record<Tone, string> = {
  neutral: 'bg-ink',
  positive: 'bg-positive',
  warning: 'bg-warning',
  negative: 'bg-negative',
};

export default function Progress({
  value,
  tone = 'neutral',
}: {
  value: number;
  tone?: Tone;
}) {
  const width = Math.min(Math.max(value, 0), 100);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
      <div
        className={`h-full rounded-full transition-[width] duration-200 ${tones[tone]}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
