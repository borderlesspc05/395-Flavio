import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type ModalSize = 'default' | 'compact';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: ModalSize;
  /** When true, backdrop click and Escape are ignored (e.g. while saving). */
  dismissLocked?: boolean;
}

/**
 * Accessible modal rendered via portal on document.body so position:fixed
 * is not broken by ancestor transforms (e.g. Framer Motion page transitions).
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'default',
  dismissLocked = false,
}: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useBodyScrollLock(open);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    const focusables = dialog?.querySelectorAll<HTMLElement>(FOCUSABLE);
    const first = focusables?.[0];
    const last = focusables?.[focusables.length - 1];

    const frame = window.requestAnimationFrame(() => {
      first?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (dismissLocked) return;
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !focusables?.length) return;

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, dismissLocked]);

  if (!open || typeof document === 'undefined') return null;

  const handleBackdropClick = () => {
    if (!dismissLocked) onClose();
  };

  return createPortal(
    <div
      className="membro-modal-overlay"
      role="presentation"
      onClick={handleBackdropClick}
      data-modal-size={size}
    >
      <div
        ref={dialogRef}
        className={`membro-modal-container${size === 'compact' ? ' membro-modal-container--compact' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="membro-modal-header">
          <h2 id={titleId} className="membro-modal-title">
            {title}
          </h2>
          <button
            type="button"
            className="membro-modal-close"
            onClick={onClose}
            disabled={dismissLocked}
            aria-label="Fechar"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
