import Button from './Button';

export default function EmptyState({
  title,
  body,
  action,
  onAction,
}: {
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="px-2 py-8 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted">{body}</p>
      {action && onAction && (
        <div className="mt-4">
          <Button size="sm" onClick={onAction}>
            {action}
          </Button>
        </div>
      )}
    </div>
  );
}
