import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

type Props = {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export function AdminCollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`admin-collapsible ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="admin-collapsible-trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <ChevronDown size={18} className="admin-collapsible-icon" aria-hidden />
      </button>
      {open ? <div className="admin-collapsible-body">{children}</div> : null}
    </section>
  );
}
