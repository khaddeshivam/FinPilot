type Tone = 'neutral' | 'positive' | 'warning' | 'negative';

const tones: Record<Tone, string> = {
  neutral: 'bg-canvas text-muted',
  positive: 'bg-positive/12 text-positive-dark',
  warning: 'bg-warning/12 text-warning',
  negative: 'bg-negative/12 text-negative',
};

export default function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
