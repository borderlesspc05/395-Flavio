import { X, ArrowLeft, Save, ChevronRight } from "lucide-react";
import { Reveal } from "./Reveal";
import { SCALES, CYCLE_INFO, type Scan, type Question, type ScaleType } from "../data";
import { ChoiceGroup, RequiredBadge, ProgressBar, ScanCardPill } from "./ui";
import { cn } from "../utils/cn";

type Props = {
  scan: Scan;
  answers: Record<string, number>;
  onAnswer: (qid: string, v: number) => void;
  onBack: () => void;
};

function countAnswered(scan: Scan, answers: Record<string, number>) {
  let total = 0;
  let done = 0;
  for (const c of scan.categories) {
    for (const q of c.questions) {
      total++;
      if (answers[q.id] != null) done++;
    }
  }
  return { total, done };
}

export function ScanDetailView({ scan, answers, onAnswer, onBack }: Props) {
  const { done, total } = countAnswered(scan, answers);

  return (
    <div className="relative">
      {/* Top bar */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Reveal>
          <button
            onClick={onBack}
            className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[12px] font-medium text-[var(--fg-2)] transition-all hover:bg-white/[0.06] hover:text-[var(--fg-0)]"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Voltar ao Full Scan
          </button>
        </Reveal>
        <button
          aria-label="Fechar"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--fg-3)] transition-colors hover:bg-white/5 hover:text-[var(--fg-0)]"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* Header */}
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <Reveal>
            <div className="flex items-center gap-2">
              <ScanCardPill code={scan.code} />
              {scan.category && (
                <span className="text-[11px] uppercase tracking-wider text-[var(--fg-4)]">
                  · {scan.category}
                </span>
              )}
            </div>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-3 font-display text-[44px] font-normal leading-[1.04] tracking-tight text-[var(--fg-0)] sm:text-5xl">
              {scan.title}
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--fg-2)]">
              A liderança é um dos fatores que mais influenciam a cultura, o engajamento das
              equipes e a capacidade de uma organização alcançar seus objetivos. Este diagnóstico
              identifica comportamentos, práticas e capacidades que fortalecem ou limitam a
              performance do negócio.
            </p>
          </Reveal>
          <Reveal delay={220}>
            <div className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 pr-5 text-[13px] leading-relaxed text-[var(--fg-3)]">
              Responda com base em <span className="text-[var(--fg-1)] font-medium">evidências e experiências observáveis</span>,
              evitando percepções isoladas. Considere diferentes perspectivas da organização sempre que possível.
            </div>
          </Reveal>
        </div>

        <Reveal delay={260}>
          <div className="rounded-2xl border border-white/[0.07] bg-[var(--bg-2)]/60 p-6 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-4)]">
              Progresso do scan
            </p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-4xl text-[var(--accent)]">
                {total === 0 ? 0 : Math.round((done / total) * 100)}%
              </span>
              <span className="text-sm text-[var(--fg-3)]">deste scan</span>
            </div>
            <div className="mt-4">
              <ProgressBar value={done} total={total} />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/[0.07] pt-4 text-center">
              {scan.categories.slice(0, 3).map((c) => {
                const catDone = c.questions.filter((q) => answers[q.id] != null).length;
                const pct = Math.round((catDone / c.questions.length) * 100);
                return (
                  <div key={c.id}>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--fg-4)] truncate">
                      {c.title.split(" ")[0]}
                    </p>
                    <p className="mt-0.5 font-display text-lg text-[var(--fg-0)]">{pct}%</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>

      {/* Questions by category */}
      <div className="mt-14 space-y-14">
        {scan.categories.map((cat, ci) => {
          const catDone = cat.questions.filter((q) => answers[q.id] != null).length;
          return (
            <Reveal key={cat.id} delay={ci * 100}>
              <CategoryBlock
                categoryTitle={cat.title}
                questions={cat.questions}
                answers={answers}
                onAnswer={onAnswer}
                done={catDone}
              />
            </Reveal>
          );
        })}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 mt-16 -mx-8 flex items-center justify-between border-t border-white/[0.07] bg-[var(--bg-0)]/85 px-8 py-4 backdrop-blur-xl sm:-mx-12 sm:px-12">
        <button
          onClick={onBack}
          className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[13px] font-medium text-[var(--fg-1)] transition-all hover:bg-white/[0.06]"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Todos os scans
        </button>

        <div className="text-[11px] text-[var(--fg-4)] hidden sm:block">
          <span className="text-[var(--accent)]">{done}</span> de {total} · {CYCLE_INFO.label} · {CYCLE_INFO.date}
        </div>

        <button className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] px-5 py-2.5 text-[13px] font-semibold text-[var(--bg-0)] shadow-[0_10px_30px_-10px_rgba(244,184,96,0.5)] transition-all hover:brightness-110">
          <Save className="h-3.5 w-3.5" />
          Salvar rascunho
        </button>
      </div>
    </div>
  );
}

function CategoryBlock({
  categoryTitle,
  questions,
  answers,
  onAnswer,
  done,
}: {
  categoryTitle: string;
  questions: Question[];
  answers: Record<string, number>;
  onAnswer: (qid: string, v: number) => void;
  done: number;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between border-b border-white/[0.07] pb-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
          {categoryTitle}
        </h2>
        <span className="text-[11px] tabular-nums text-[var(--fg-4)]">
          {done}/{questions.length}
        </span>
      </div>

      <ul className="divide-y divide-white/[0.05]">
        {questions.map((q, i) => (
          <QuestionRow
            key={q.id}
            index={i + 1}
            question={q}
            value={answers[q.id] ?? null}
            onChange={(v) => onAnswer(q.id, v)}
          />
        ))}
      </ul>
    </section>
  );
}

function QuestionRow({
  index,
  question,
  value,
  onChange,
}: {
  index: number;
  question: Question;
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <li className={cn(
      "group grid grid-cols-1 gap-4 py-5 transition-colors lg:grid-cols-[34px_1fr_auto] lg:items-start lg:gap-6",
      value == null ? "" : "bg-[var(--accent)]/[0.015] -mx-4 px-4 rounded-xl"
    )}>
      {/* Index */}
      <div className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums transition-colors",
        value != null
          ? "bg-[var(--accent)]/15 text-[var(--accent)]"
          : "bg-white/[0.04] text-[var(--fg-4)] group-hover:bg-white/[0.07]"
      )}>
        {String(index).padStart(2, "0")}
      </div>

      {/* Question + required */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn(
            "text-[15px] leading-snug transition-colors",
            value != null ? "text-[var(--fg-0)]" : "text-[var(--fg-1)]"
          )}>
            {question.text}
          </p>
          {question.required && <RequiredBadge />}
        </div>

        <div className="mt-3">
          <ChoiceGroup
            name={question.id}
            options={SCALES[question.scale as ScaleType]}
            value={value}
            onChange={onChange}
          />
        </div>
      </div>

      {/* Chevron */}
      <div className="hidden lg:block">
        <ChevronRight className={cn(
          "h-4 w-4 transition-all",
          value != null ? "text-[var(--accent)]" : "text-[var(--fg-5)] group-hover:text-[var(--fg-3)]"
        )} />
      </div>
    </li>
  );
}
