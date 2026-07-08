import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastTone = 'error' | 'success' | 'warning';

export interface ToastItem {
  id: string;
  tone: ToastTone;
  title?: string;
  message: string;
}

interface Props {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  /** Fecha automaticamente após N ms (0 desativa). */
  autoDismissMs?: number;
}

const ICONS = {
  error: AlertCircle,
  success: CheckCircle2,
  warning: Info,
} as const;

/**
 * Pilha de toasts renderizada via portal no <body>, para escapar de qualquer
 * ancestral com transform/filter (que quebraria position: fixed) e garantir que
 * o aviso apareça sempre na tela, independentemente de onde o usuário rolou.
 */
export function ToastStack({ toasts, onDismiss, autoDismissMs = 5000 }: Props) {
  useEffect(() => {
    if (!autoDismissMs || toasts.length === 0) return;
    const timers = toasts.map((t) =>
      window.setTimeout(() => onDismiss(t.id), autoDismissMs),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [toasts, autoDismissMs, onDismiss]);

  if (typeof document === 'undefined' || toasts.length === 0) return null;

  return createPortal(
    <div className="app-toast-stack" role="region" aria-label="Avisos">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.tone];
        return (
          <div
            key={toast.id}
            className={`app-toast app-toast--${toast.tone}`}
            role={toast.tone === 'error' ? 'alert' : 'status'}
          >
            <span className="app-toast__icon" aria-hidden>
              <Icon size={18} />
            </span>
            <div className="app-toast__body">
              {toast.title ? <strong>{toast.title}</strong> : null}
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              className="app-toast__close"
              onClick={() => onDismiss(toast.id)}
              aria-label="Fechar aviso"
            >
              <X size={15} aria-hidden />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
