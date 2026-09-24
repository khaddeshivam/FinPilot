import type { Severity } from '../../features/insights/api/insightsApi';
import Badge from '../ui/Badge';

const tone: Record<Severity, 'neutral' | 'warning' | 'negative'> = {
  INFO: 'neutral',
  WARNING: 'warning',
  CRITICAL: 'negative',
};

export default function InsightCard({
  message,
  severity,
}: {
  message: string;
  severity: Severity;
}) {
  return (
    <div className="rounded-2xl border border-line bg-canvas/60 px-4 py-3">
      <Badge tone={tone[severity]}>{severity === 'INFO' ? 'Note' : severity === 'WARNING' ? 'Watch' : 'Urgent'}</Badge>
      <p className="mt-2 text-sm leading-relaxed text-ink">{message}</p>
    </div>
  );
}
