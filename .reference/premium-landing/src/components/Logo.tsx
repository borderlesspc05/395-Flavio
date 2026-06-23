import { cn } from "../utils/cn";

export function Logo({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div className="relative flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.04] ring-1 ring-white/10">
        {/* Triangular play with mini equalizer bars */}
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
          <path d="M5 4 L18 12 L5 20 Z" fill="currentColor" className="text-white" />
        </svg>
        {animated && (
          <div className="absolute -right-0.5 -bottom-0.5 flex items-end gap-[1px] h-2">
            <span className="eq-bar block h-full w-[2px] bg-[var(--color-brand)]" style={{ animationDelay: "0s" }} />
            <span className="eq-bar block h-full w-[2px] bg-[var(--color-brand)]" style={{ animationDelay: "0.2s" }} />
            <span className="eq-bar block h-full w-[2px] bg-[var(--color-brand)]" style={{ animationDelay: "0.4s" }} />
          </div>
        )}
      </div>
      <span className="text-[15px] font-medium tracking-tight text-white">
        inove<span className="text-white/90">play</span>
      </span>
    </div>
  );
}
