import { Check, AlertCircle } from "lucide-react";
import { cn } from "../utils/cn";
import type { OptionDef } from "../data";

/* ================== Required badge ================== */
export function RequiredBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)] ring-1 ring-[var(--accent)]/25",
        className
      )}
    >
      <AlertCircle className="h-2.5 w-2.5" />
      Obrigatório
    </span>
  );
}

export function ComingSoonBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-3)] ring-1 ring-white/10">
      Em breve
    </span>
  );
}

/* ================== Progress bar ================== */
export function ProgressBar({
  value,
  total,
  className,
}: {
  value: number;
  total: number;
  className?: string;
}) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className={cn("relative w-full", className)}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] tabular-nums">
        <span className="text-[var(--fg-4)]">
          <span className="font-semibold text-[var(--accent)]">{pct}%</span> respondido
        </span>
        <span className="text-[var(--fg-4)]">
          {value}/{total} perguntas
        </span>
      </div>
    </div>
  );
}

/* ================== Option chips (standard for every question) ================== */
type ChoiceGroupProps = {
  name: string;
  options: OptionDef[];
  value: number | null;
  onChange: (v: number) => void;
  columns?: "auto" | "fixed";
  disabled?: boolean;
};

/**
 * Standard single-choice group used by every question in the diagnostic.
 * Horizontal chips with active pill, subtle check indicator, keyboard accessible.
 */
export function ChoiceGroup({ name, options, value, onChange, disabled }: ChoiceGroupProps) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className="flex flex-wrap items-center gap-1.5"
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <label
            key={opt.value}
            className={cn(
              "group relative inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200 focus-ring",
              selected
                ? "border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)] shadow-[0_0_0_3px_rgba(244,184,96,0.15)]"
                : "border-white/[0.08] bg-white/[0.03] text-[var(--fg-2)] hover:border-white/20 hover:bg-white/[0.06] hover:text-[var(--fg-0)]",
              disabled && "pointer-events-none opacity-50"
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={selected}
              onChange={() => onChange(opt.value)}
              className="sr-only"
              tabIndex={-1}
            />
            {/* Custom radio indicator */}
            <span
              className={cn(
                "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                selected
                  ? "border-[var(--accent)] bg-[var(--accent)]"
                  : "border-[var(--fg-4)] bg-transparent group-hover:border-[var(--fg-2)]"
              )}
            >
              {selected && <Check className="h-2 w-2 text-[var(--bg-0)]" strokeWidth={4} />}
            </span>
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}

/* ================== Scan card (overview) ================== */
export function ScanCardPill({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--fg-4)] ring-1 ring-white/10",
        className
      )}
    >
      {code}
    </span>
  );
}
