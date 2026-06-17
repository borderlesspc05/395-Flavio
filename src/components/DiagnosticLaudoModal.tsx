import { useEffect } from 'react';
import { X } from 'lucide-react';

interface DiagnosticLaudoModalProps {
  open: boolean;
  title?: string;
  content: string;
  onClose: () => void;
}

export function DiagnosticLaudoModal({
  open,
  title = 'Laudo de diagnóstico',
  content,
  onClose,
}: DiagnosticLaudoModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="diagnostic-laudo-backdrop" role="presentation" onClick={onClose}>
      <div
        className="diagnostic-laudo-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="diagnostic-laudo-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="diagnostic-laudo-header">
          <h2 id="diagnostic-laudo-title">{title}</h2>
          <button type="button" className="diagnostic-laudo-close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <div className="diagnostic-laudo-body">
          <pre>{content}</pre>
        </div>
      </div>
    </div>
  );
}
