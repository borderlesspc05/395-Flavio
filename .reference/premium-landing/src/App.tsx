import { useState, useMemo } from "react";
import { MessageCircle } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { FullScanView } from "./components/FullScanView";
import { ScanDetailView } from "./components/ScanDetailView";
import { SCANS, CYCLE_INFO } from "./data";
import { cn } from "./utils/cn";

type View = { kind: "overview" } | { kind: "scan"; id: string };

export default function App() {
  const [view, setView] = useState<View>({ kind: "overview" });
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const currentScan = useMemo(
    () => (view.kind === "scan" ? SCANS.find((s) => s.id === view.id) ?? null : null),
    [view]
  );

  return (
    <div className="relative min-h-screen bg-[var(--bg-0)] text-[var(--fg-1)] bg-radial-ambient">
      <Sidebar />

      {/* Top-right cycle chip */}
      <div className="fixed right-4 top-4 z-30 hidden sm:flex items-center gap-2 rounded-full border border-white/[0.08] bg-[var(--bg-2)]/80 px-3 py-1.5 text-[11px] backdrop-blur-xl">
        <span className="text-[var(--fg-3)]">
          {CYCLE_INFO.label} · {CYCLE_INFO.date}
        </span>
        <span className="h-3 w-px bg-white/10" />
        <span className="rounded-full bg-[var(--accent)]/15 px-2 py-0.5 font-semibold uppercase tracking-wider text-[var(--accent)]">
          {CYCLE_INFO.mode}
        </span>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)]/10">
          <svg viewBox="0 0 24 24" className="h-3 w-3 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4l8 8 8-8M4 20l8-8 8 8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>

      {/* Main stage */}
      <main className="relative lg:pl-[68px]">
        <div className={cn(
          "relative mx-auto min-h-screen max-w-[1200px] px-6 pb-6 pt-6 sm:px-12 sm:pt-8",
          view.kind === "scan" && "pb-24"
        )}>
          {/* Modal-style card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-b from-[var(--bg-1)] to-[var(--bg-0)] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.8)]">
            {/* Subtle inner pattern */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.18]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
                backgroundSize: "28px 28px",
              }}
              aria-hidden
            />
            {/* Top accent line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/50 to-transparent" />

            <div className="relative px-6 pt-8 pb-2 sm:px-12 sm:pt-10">
              {view.kind === "overview" && (
                <FullScanView
                  answers={answers}
                  onOpenScan={(id) => setView({ kind: "scan", id })}
                />
              )}
              {view.kind === "scan" && currentScan && (
                <ScanDetailView
                  scan={currentScan}
                  answers={answers}
                  onAnswer={(qid, v) =>
                    setAnswers((prev) => ({ ...prev, [qid]: v }))
                  }
                  onBack={() => setView({ kind: "overview" })}
                />
              )}
            </div>
          </div>

          {/* Tiny footer */}
          <div className="mt-6 flex items-center justify-between text-[11px] text-[var(--fg-5)]">
            <span>© Ponto & Evolução · Diagnóstico PE</span>
            <span>Atalhos: <kbd className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[var(--fg-3)]">Esc</kbd> fechar · <kbd className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[var(--fg-3)]">Tab</kbd> navegar</span>
          </div>
        </div>
      </main>

      {/* Floating chat bubble */}
      <button
        aria-label="Abrir ajuda"
        className="fixed bottom-5 right-5 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-3)] text-[var(--fg-1)] ring-1 ring-white/10 transition-all hover:bg-[var(--bg-4)] hover:scale-105"
      >
        <MessageCircle className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
}
