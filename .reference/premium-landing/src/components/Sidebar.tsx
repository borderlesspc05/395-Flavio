import {
  LayoutDashboard, FileText, Target,
  BarChart3, Users, MessageSquare, HelpCircle, Folder, LogOut,
} from "lucide-react";
import { cn } from "../utils/cn";

const primary = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Target, label: "Scans", active: true },
  { icon: BarChart3, label: "Resultados" },
  { icon: Users, label: "Pessoas" },
  { icon: MessageSquare, label: "Feedback" },
  { icon: FileText, label: "Relatórios" },
];

const secondary = [
  { icon: Folder, label: "Arquivos" },
  { icon: HelpCircle, label: "Suporte" },
];

export function Sidebar() {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden w-[68px] flex-col items-center border-r border-white/[0.06] bg-[var(--bg-1)]/80 py-4 backdrop-blur-xl lg:flex"
      )}
    >
      {/* Logo / bust mark */}
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent)]/5 ring-1 ring-[var(--accent)]/25">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 20c-3-1-4-4-4-7 0-4 3-7 8-7s8 3 8 7c0 3-1 6-4 7" />
          <path d="M12 6V3M9 3h6" />
        </svg>
      </div>

      <nav className="flex flex-1 flex-col items-center gap-1.5">
        {primary.map((it) => (
          <NavItem key={it.label} icon={it.icon} label={it.label} active={it.active} />
        ))}

        <div className="my-3 h-px w-7 bg-white/[0.07]" />

        {secondary.map((it) => (
          <NavItem key={it.label} icon={it.icon} label={it.label} />
        ))}
      </nav>

      <button
        aria-label="Sair"
        className="group flex h-11 w-11 items-center justify-center rounded-xl text-[var(--fg-4)] transition-all hover:bg-white/5 hover:text-[var(--fg-2)]"
      >
        <LogOut className="h-[18px] w-[18px] transition-transform group-hover:-translate-x-0.5" />
      </button>
    </aside>
  );
}

function NavItem({
  icon: Icon,
  label,
  active,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-11 w-11 items-center justify-center rounded-xl transition-all",
        active
          ? "bg-[var(--accent)]/12 text-[var(--accent)] ring-1 ring-[var(--accent)]/30"
          : "text-[var(--fg-4)] hover:bg-white/5 hover:text-[var(--fg-1)]"
      )}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2 : 1.6} />
      {/* Tooltip */}
      <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-[var(--bg-3)] px-2.5 py-1 text-[11px] font-medium text-[var(--fg-1)] opacity-0 shadow-md ring-1 ring-white/10 transition-all group-hover:opacity-100">
        {label}
      </span>
      {active && (
        <span className="absolute -left-[13px] top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--accent)]" />
      )}
    </button>
  );
}
