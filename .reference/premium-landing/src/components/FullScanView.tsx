import { X, Plus, FileCheck, ArrowLeft, Save } from "lucide-react";
import { Reveal } from "./Reveal";
import { SCANS, CYCLE_INFO, type Scan } from "../data";
import { ProgressBar, ScanCardPill, ComingSoonBadge } from "./ui";
import { cn } from "../utils/cn";

type Props = {
  answers: Record<string, number>;
  onOpenScan: (id: string) => void;
};

function answeredIn(scan: Scan, answers: Record<string, number>) {
  let total = 0;
  let done = 0;
  for (const cat of scan.categories) {
    for (const q of cat.questions) {
      total++;
      if (answers[q.id] != null) done++;
    }
  }
  return { total, done };
}

export function FullScanView({ answers, onOpenScan }: Props) {
  // totals
  const totalAll = SCANS.reduce((acc, s) => acc + s.totalQuestions, 0);
  const doneAll = SCANS.reduce((acc, s) => acc + answeredIn(s, answers).done, 0);

  return (
    <div className="relative">
      {/* Top bar with chip + close */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Reveal>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/25">
              <FileCheck className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-4)]">
                Diagnóstico Organizacional
              </p>
              <p className="text-sm text-[var(--fg-2)]">
                {CYCLE_INFO.label} · {CYCLE_INFO.date}
              </p>
            </div>
          </div>
        </Reveal>
        <button
          aria-label="Fechar"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--fg-3)] transition-colors hover:bg-white/5 hover:text-[var(--fg-0)]"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* Title + intro */}
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <Reveal>
            <h1 className="font-display text-5xl font-normal leading-[1.05] tracking-tight text-[var(--fg-0)] sm:text-6xl">
              Full Scan
            </h1>
          </Reveal>
          <Reveal delay={100}>
            <div className="mt-5 max-w-2xl space-y-4 text-[15px] leading-relaxed text-[var(--fg-2)]">
              <p>
                Desenvolvido para proporcionar uma visão <span className="text-[var(--fg-0)] font-medium">completa e integrada</span> da
                organização, analisando os fatores que mais influenciam sua capacidade de
                alcançar resultados sustentáveis. O objetivo não é apenas identificar sintomas,
                mas compreender as causas que impulsionam ou limitam o desempenho do negócio.
              </p>
              <p>
                Para obter o máximo valor desta jornada, baseie as respostas em{" "}
                <span className="text-[var(--accent)]">evidências, dados, percepções coletivas e
                experiências recorrentes</span>. Envolva diferentes líderes, equipes e fóruns
                internos sempre que possível. Quanto mais diversa e representativa a visão
                utilizada, mais preciso será o diagnóstico.
              </p>
            </div>
          </Reveal>
        </div>

        {/* Overall progress panel */}
        <Reveal delay={200}>
          <div className="rounded-2xl border border-white/[0.07] bg-[var(--bg-2)]/50 p-6 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-4)]">
              Progresso geral
            </p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-4xl text-[var(--accent)]">
                {totalAll === 0 ? 0 : Math.round((doneAll / totalAll) * 100)}%
              </span>
              <span className="text-sm text-[var(--fg-3)]">concluído</span>
            </div>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] transition-all duration-700"
                style={{ width: `${totalAll === 0 ? 0 : (doneAll / totalAll) * 100}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-[var(--fg-4)]">
              <span>{doneAll} respondidas</span>
              <span>{totalAll} no total</span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/[0.07] pt-4">
              {SCANS.slice(0, 3).map((s) => {
                const { done, total } = answeredIn(s, answers);
                const pct = total === 0 ? 0 : Math.round((done / total) * 100);
                return (
                  <div key={s.id} className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--fg-4)]">
                      {s.code}
                    </p>
                    <p className="mt-0.5 font-display text-lg text-[var(--fg-0)]">{pct}%</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>

      {/* Scans grid */}
      <div className="mt-14">
        <div className="mb-5 flex items-baseline justify-between">
          <Reveal>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--fg-3)]">
              Scans disponíveis
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <span className="text-xs text-[var(--fg-4)]">
              {SCANS.filter((s) => !s.comingSoon).length} ativos · {SCANS.filter((s) => s.comingSoon).length} em breve
            </span>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SCANS.map((s, i) => {
            const { done, total } = answeredIn(s, answers);
            return (
              <Reveal key={s.id} delay={i * 70}>
                <ScanTile
                  scan={s}
                  done={done}
                  total={total}
                  onClick={() => !s.comingSoon && onOpenScan(s.id)}
                />
              </Reveal>
            );
          })}
        </div>
      </div>

      {/* Footer actions */}
      <div className="sticky bottom-0 mt-16 -mx-8 flex items-center justify-between border-t border-white/[0.07] bg-[var(--bg-0)]/80 px-8 py-4 backdrop-blur-xl sm:-mx-12 sm:px-12">
        <button className="group inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-4 py-2 text-[13px] font-medium text-[var(--fg-1)] transition-all hover:bg-white/[0.06] hover:text-[var(--fg-0)]">
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Voltar ao diagnóstico
        </button>

        <div className="text-[11px] text-[var(--fg-4)] hidden sm:block">
          <span className="text-[var(--accent)]">{doneAll}</span> de {totalAll} perguntas respondidas
        </div>

        <button className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] px-5 py-2.5 text-[13px] font-semibold text-[var(--bg-0)] shadow-[0_10px_30px_-10px_rgba(244,184,96,0.5)] transition-all hover:brightness-110 hover:shadow-[0_14px_34px_-10px_rgba(244,184,96,0.7)]">
          <Save className="h-3.5 w-3.5" />
          Salvar rascunho
        </button>
      </div>
    </div>
  );
}

/* ---- Tile ---- */
function ScanTile({
  scan,
  done,
  total,
  onClick,
}: {
  scan: Scan;
  done: number;
  total: number;
  onClick: () => void;
}) {
  const disabled = !!scan.comingSoon;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative block w-full overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300",
        disabled
          ? "cursor-not-allowed border-white/[0.05] bg-[var(--bg-2)]/40 opacity-70"
          : "cursor-pointer border-white/[0.07] bg-[var(--bg-2)]/60 hover:border-[var(--accent)]/30 hover:bg-[var(--bg-3)]/50 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-20px_rgba(244,184,96,0.25)]"
      )}
    >
      {/* subtle corner glow on hover */}
      <span className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-[var(--accent)]/0 blur-3xl transition-all duration-500 group-hover:bg-[var(--accent)]/20" />

      <div className="flex items-center justify-between">
        <ScanCardPill code={scan.code} />
        {scan.comingSoon ? <ComingSoonBadge /> : (
          <span className={cn(
            "text-[11px] font-semibold tabular-nums",
            total === 0 ? "text-[var(--fg-4)]" : done === total ? "text-emerald-400" : "text-[var(--fg-4)]"
          )}>
            {done}/{total}
          </span>
        )}
      </div>

      <h3 className={cn(
        "mt-4 font-display text-[22px] leading-tight tracking-tight",
        disabled ? "text-[var(--fg-3)]" : "text-[var(--fg-0)]"
      )}>
        {scan.title}
      </h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--fg-3)]">
        {scan.description}
      </p>

      {!scan.comingSoon && (
        <div className="mt-4">
          <ProgressBar value={done} total={total} />
        </div>
      )}

      {!scan.comingSoon && (
        <div className="mt-4 flex items-center justify-end text-[11px] font-medium text-[var(--accent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <Plus className="h-3 w-3" /> Responder
        </div>
      )}
    </button>
  );
}
