import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fp-overlay fixed inset-0 z-50 flex justify-end bg-ink/25">
      <button className="h-full flex-1 cursor-default" aria-label="Close" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="fp-drawer h-full w-full max-w-md overflow-y-auto border-l border-line bg-white p-6 shadow-[-12px_0_40px_rgba(17,19,21,0.08)]"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 id="drawer-title" className="text-sm font-medium text-muted">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted transition-colors hover:bg-canvas hover:text-ink"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}
