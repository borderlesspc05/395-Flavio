import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import {
  ArrowRight,
  Brain,
  Check,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  FileText,
  Gauge,
  Layers3,
  Save,
  Sparkles,
  Users,
} from 'lucide-react';
import { auth } from '../config/firebase';
import {
  DIAGNOSTIC_LENSES,
  DIAGNOSTIC_PHASES,
  buildDiagnosticContext,
  createEmptyDiagnosticData,
  getDiagnosticCompletion,
  getFieldKeys,
  getRequiredDiagnosticFieldKeysExcludingSolutionPick,
  isDiagnosticValueAnswered,
  type DiagnosticField,
  type DiagnosticFieldType,
  type DiagnosticLens,
  type DiagnosticPhase,
  type DiagnosticPhaseId,
} from '../constants/diagnosticFlow';
import { LoopWorkspacePanel } from '../components/LoopWorkspacePanel';
import { SolutionPickPanel } from '../components/SolutionPickPanel';
import { parseSelectedSolutionActions } from '../services/solutionPick';
import { useCycle } from '../context/CycleContext';
import { updateDiagnosticCycle } from '../services/diagnosticCycles';
import { getInitialForm, saveInitialForm, saveInitialFormDraft } from '../services/initialForm';
import {
  scheduleMagnusMemorySyncFromForm,
  syncMagnusMemoryToServer,
} from '../services/magnusMemorySync';
import type { DiagnosticFieldValue, InitialFormData } from '../types';

const phaseIcons = {
  decoding: Brain,
  gapScan: Gauge,
  systemScan: Layers3,
  teamScan: Users,
  solutionPick: Sparkles,
} satisfies Record<DiagnosticPhaseId, typeof Brain>;

function valueAsText(value: DiagnosticFieldValue | undefined) {
  if (Array.isArray(value)) return value.join(', ');
  return value ?? '';
}

function valueAsList(value: DiagnosticFieldValue | undefined) {
  return Array.isArray(value) ? value : [];
}

function fieldType(field: DiagnosticField): DiagnosticFieldType {
  return field.type ?? 'textarea';
}

function getFieldKey(field: DiagnosticField, activeLens: DiagnosticLens) {
  return field.lenses?.length ? `${activeLens}_${field.id}` : field.id;
}

function parseScaleBounds(field: DiagnosticField) {
  const min = Number(field.minLabel);
  const max = Number(field.maxLabel);
  return {
    min: Number.isFinite(min) ? min : 1,
    max: Number.isFinite(max) ? max : 5,
  };
}

function buildFieldPhaseIndex() {
  const index = new Map<string, DiagnosticPhaseId>();
  for (const phase of DIAGNOSTIC_PHASES) {
    for (const block of phase.blocks) {
      for (const field of block.fields) {
        for (const key of getFieldKeys(field)) {
          index.set(key, phase.id);
        }
      }
    }
  }
  return index;
}

function scrollProjectToTop(behavior: ScrollBehavior = 'auto') {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const scrollTargets = new Set<HTMLElement>();
      const mainContent = document.querySelector<HTMLElement>('#main-content');
      const dashboardMain = document.querySelector<HTMLElement>('.dashboard-main');

      [mainContent, dashboardMain, document.scrollingElement as HTMLElement | null, document.documentElement, document.body]
        .filter(Boolean)
        .forEach((target) => scrollTargets.add(target as HTMLElement));

      if (behavior === 'auto') {
        const previousScrollBehavior = new Map<HTMLElement, string>();

        scrollTargets.forEach((target) => {
          previousScrollBehavior.set(target, target.style.scrollBehavior);
          target.style.scrollBehavior = 'auto';
          target.scrollTop = 0;
          target.scrollLeft = 0;
        });
        window.scrollTo(0, 0);

        window.requestAnimationFrame(() => {
          previousScrollBehavior.forEach((value, target) => {
            target.style.scrollBehavior = value;
          });
        });
        return;
      }

      scrollTargets.forEach((target) => {
        target.scrollTo({ top: 0, left: 0, behavior });
      });
      window.scrollTo({ top: 0, left: 0, behavior });
    });
  });
}

interface DiagnosticFieldControlProps {
  field: DiagnosticField;
  fieldKey: string;
  value: DiagnosticFieldValue | undefined;
  error?: string;
  onChange: (key: string, value: DiagnosticFieldValue) => void;
}

function DiagnosticFieldControl({
  field,
  fieldKey,
  value,
  error,
  onChange,
}: DiagnosticFieldControlProps) {
  const type = fieldType(field);

  const label = (
    <label className="diagnostic-field-label" htmlFor={fieldKey}>
      <span>{field.prompt}</span>
      {field.required && <strong aria-label="Campo obrigatório">Obrigatório</strong>}
    </label>
  );

  if (type === 'single') {
    return (
      <div className={`diagnostic-field ${error ? 'has-error' : ''}`}>
        {label}
        <div className="diagnostic-choice-grid" role="radiogroup" aria-label={field.prompt}>
          {(field.options ?? []).map((option) => {
            const checked = valueAsText(value) === option;
            return (
              <button
                key={option}
                type="button"
                className={`diagnostic-choice ${checked ? 'is-selected' : ''}`}
                onClick={() => onChange(fieldKey, option)}
                aria-pressed={checked}
              >
                <span className="diagnostic-choice-dot" aria-hidden />
                <span>{option}</span>
              </button>
            );
          })}
        </div>
        {error && <span className="diagnostic-error">{error}</span>}
      </div>
    );
  }

  if (type === 'multi') {
    const selected = valueAsList(value);
    return (
      <div className={`diagnostic-field ${error ? 'has-error' : ''}`}>
        {label}
        <div className="diagnostic-choice-grid multi" role="group" aria-label={field.prompt}>
          {(field.options ?? []).map((option) => {
            const checked = selected.includes(option);
            const next = checked ? selected.filter((item) => item !== option) : [...selected, option];
            return (
              <button
                key={option}
                type="button"
                className={`diagnostic-choice ${checked ? 'is-selected' : ''}`}
                onClick={() => onChange(fieldKey, next)}
                aria-pressed={checked}
              >
                <span className="diagnostic-choice-check" aria-hidden>
                  {checked && <Check size={13} />}
                </span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>
        {error && <span className="diagnostic-error">{error}</span>}
      </div>
    );
  }

  if (type === 'scale') {
    const { min, max } = parseScaleBounds(field);
    const textValue = valueAsText(value);
    const current = Number(textValue || min);
    const rangeMode = max > 10;

    return (
      <div className={`diagnostic-field ${error ? 'has-error' : ''}`}>
        {label}
        {rangeMode ? (
          <div className="diagnostic-slider-wrap">
            <input
              id={fieldKey}
              className="diagnostic-slider"
              type="range"
              min={min}
              max={max}
              step={5}
              value={Number.isFinite(current) ? current : min}
              onChange={(event) => onChange(fieldKey, event.target.value)}
            />
            <output className="diagnostic-slider-value" htmlFor={fieldKey}>
              {textValue || min}
            </output>
          </div>
        ) : (
          <div className="diagnostic-scale-row" role="radiogroup" aria-label={field.prompt}>
            {Array.from({ length: max - min + 1 }, (_, index) => String(min + index)).map((option) => {
              const checked = textValue === option;
              return (
                <button
                  key={option}
                  type="button"
                  className={`diagnostic-scale-option ${checked ? 'is-selected' : ''}`}
                  onClick={() => onChange(fieldKey, option)}
                  aria-pressed={checked}
                >
                  {option}
                </button>
              );
            })}
          </div>
        )}
        <div className="diagnostic-scale-labels">
          <span>{field.minLabel}</span>
          <span>{field.maxLabel}</span>
        </div>
        {error && <span className="diagnostic-error">{error}</span>}
      </div>
    );
  }

  if (type === 'text') {
    return (
      <div className={`diagnostic-field ${error ? 'has-error' : ''}`}>
        {label}
        <input
          id={fieldKey}
          className="diagnostic-input"
          value={valueAsText(value)}
          onChange={(event) => onChange(fieldKey, event.target.value)}
          placeholder={field.placeholder}
        />
        {error && <span className="diagnostic-error">{error}</span>}
      </div>
    );
  }

  return (
    <div className={`diagnostic-field ${error ? 'has-error' : ''}`}>
      {label}
      <textarea
        id={fieldKey}
        className="diagnostic-textarea"
        value={valueAsText(value)}
        onChange={(event) => onChange(fieldKey, event.target.value)}
        placeholder={field.placeholder}
        rows={3}
      />
      {error && <span className="diagnostic-error">{error}</span>}
    </div>
  );
}

function PhaseNav({
  activePhase,
  data,
  onSelect,
}: {
  activePhase: DiagnosticPhaseId;
  data: InitialFormData;
  onSelect: (phase: DiagnosticPhaseId) => void;
}) {
  const completion = getDiagnosticCompletion(data);

  return (
    <aside className="diagnostic-phase-nav" aria-label="Fases do diagnóstico">
      <div className="diagnostic-phase-nav-header">
        <span>Fase 1</span>
        <strong>{completion.requiredPercent}% campos-chave</strong>
      </div>
      {DIAGNOSTIC_PHASES.map((phase) => {
        const Icon = phaseIcons[phase.id];
        const stat = completion.byPhase.find((item) => item.id === phase.id);
        const complete = stat && stat.requiredTotal > 0 && stat.requiredAnswered === stat.requiredTotal;
        const active = activePhase === phase.id;
        return (
          <button
            key={phase.id}
            type="button"
            className={`diagnostic-phase-button ${active ? 'is-active' : ''}`}
            onClick={() => onSelect(phase.id)}
          >
            <span className="diagnostic-phase-icon" aria-hidden>
              <Icon size={18} />
            </span>
            <span className="diagnostic-phase-text">
              <span>{phase.step}</span>
              <strong>{phase.shortTitle}</strong>
            </span>
            <span className={`diagnostic-phase-status ${complete ? 'is-complete' : ''}`} aria-hidden>
              {complete ? <CheckCircle2 size={15} /> : `${stat?.answered ?? 0}/${stat?.total ?? 0}`}
            </span>
          </button>
        );
      })}
    </aside>
  );
}

function PhaseHeader({
  phase,
  activeLens,
  onLensChange,
}: {
  phase: DiagnosticPhase;
  activeLens: DiagnosticLens;
  onLensChange: (lens: DiagnosticLens) => void;
}) {
  const Icon = phaseIcons[phase.id];
  return (
    <header className="diagnostic-phase-hero">
      <div className="diagnostic-phase-kicker">
        <span>{phase.step}</span>
        <span>{phase.subtitle}</span>
      </div>
      <div className="diagnostic-phase-title-row">
        <div className="diagnostic-phase-large-icon" aria-hidden>
          <Icon size={28} />
        </div>
        <div>
          <h1>{phase.title}</h1>
          <p>{phase.goal}</p>
        </div>
      </div>
      {phase.principle && <blockquote>{phase.principle}</blockquote>}
      {phase.id === 'teamScan' && (
        <div className="diagnostic-lens-switch" aria-label="Lente de resposta do Team Scan">
          {DIAGNOSTIC_LENSES.map((lens) => (
            <button
              key={lens.id}
              type="button"
              className={activeLens === lens.id ? 'is-active' : ''}
              onClick={() => onLensChange(lens.id)}
            >
              <strong>{lens.label}</strong>
              <span>{lens.hint}</span>
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

export function InitialFormPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [data, setData] = useState<InitialFormData>(() => createEmptyDiagnosticData());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [completedAt, setCompletedAt] = useState<Date | null>(null);
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<Date | null>(null);
  const [activePhaseId, setActivePhaseId] = useState<DiagnosticPhaseId>('decoding');
  const [activeLens, setActiveLens] = useState<DiagnosticLens>('performer');
  const [feedback, setFeedback] = useState<string | null>(null);
  const { activeCycle, needsDiagnosis, clearNeedsDiagnosis, persistActiveCycleSnapshot, refreshCycles, switching } =
    useCycle();

  const activePhase = useMemo(
    () => DIAGNOSTIC_PHASES.find((phase) => phase.id === activePhaseId) ?? DIAGNOSTIC_PHASES[0],
    [activePhaseId]
  );
  const completion = useMemo(() => getDiagnosticCompletion(data), [data]);
  const fieldPhaseIndex = useMemo(() => buildFieldPhaseIndex(), []);
  const contextPreview = useMemo(() => buildDiagnosticContext(data), [data]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUserId(u?.uid ?? null));
    return unsub;
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    getInitialForm(userId)
      .then(({ data: formData, completedAt: at, draftUpdatedAt: draftAt }) => {
        if (cancelled) return;
        setData(formData);
        setCompletedAt(at);
        setDraftUpdatedAt(draftAt);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const setFieldValue = (key: string, value: DiagnosticFieldValue) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setFeedback(null);
  };

  const reloadForm = useCallback(async () => {
    if (!userId) return;
    setData(createEmptyDiagnosticData());
    setCompletedAt(null);
    setDraftUpdatedAt(null);
    setErrors({});
    setFeedback(null);
    setActivePhaseId(DIAGNOSTIC_PHASES[0].id);
    try {
      const { data: formData, completedAt: at, draftUpdatedAt: draftAt } = await getInitialForm(userId);
      setData(formData);
      setCompletedAt(at);
      setDraftUpdatedAt(draftAt);
    } catch {
      /* mantém formulário vazio */
    }
    scrollProjectToTop();
  }, [userId]);

  useEffect(() => {
    if (!userId || !activeCycle?.id || switching) return;
    void reloadForm();
  }, [activeCycle?.id, userId, switching, reloadForm]);

  const selectPhase = (phase: DiagnosticPhaseId) => {
    setActivePhaseId(phase);
    scrollProjectToTop();
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    for (const key of getRequiredDiagnosticFieldKeysExcludingSolutionPick()) {
      if (!isDiagnosticValueAnswered(data[key])) {
        nextErrors[key] = 'Preencha este campo para concluir o diagnóstico.';
      }
    }
    if (parseSelectedSolutionActions(data).length === 0) {
      nextErrors.solutionPick = 'Selecione ao menos uma ação no Solution Pick.';
    }
    setErrors(nextErrors);

    const firstMissing = Object.keys(nextErrors)[0];
    if (firstMissing) {
      if (firstMissing === 'solutionPick') {
        selectPhase('solutionPick');
      } else {
        const phase = fieldPhaseIndex.get(firstMissing);
        if (phase) selectPhase(phase);
        else scrollProjectToTop();
      }
      setFeedback(
        firstMissing === 'solutionPick'
          ? 'Selecione ações no Solution Pick antes de concluir o diagnóstico.'
          : 'Ainda existem campos-chave pendentes nas etapas 1.1 a 1.4.'
      );
      return false;
    }
    return true;
  };

  const handleDraft = async () => {
    if (!userId || savingDraft) return;
    setSavingDraft(true);
    setFeedback(null);
    try {
      const at = await saveInitialFormDraft(userId, data);
      setDraftUpdatedAt(at);
      scheduleMagnusMemorySyncFromForm(data);
      setFeedback('Rascunho salvo. A IA já poderá usar as respostas preenchidas quando você avançar.');
      scrollProjectToTop();
    } catch {
      setFeedback('Não foi possível salvar o rascunho. Tente novamente.');
      scrollProjectToTop();
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!userId || !validate()) return;
    setSaving(true);
    setFeedback(null);
    try {
      const at = await saveInitialForm(userId, data);
      const diagnosticContext = buildDiagnosticContext(data);
      await syncMagnusMemoryToServer({ diagnosticContext });
      if (activeCycle) {
        await updateDiagnosticCycle(activeCycle.id, {
          status: 'active',
          completedAt: at.toISOString(),
          diagnosticContext,
          formData: data,
        });
        await persistActiveCycleSnapshot();
        await refreshCycles();
        clearNeedsDiagnosis();
      }
      setCompletedAt(at);
      scrollProjectToTop('auto');
      navigate('/dashboard', {
        state: {
          postDiagnosticNotice: {
            title: 'Diagnóstico concluído com sucesso',
            message:
              'Seu Human-to-Business Canvas foi salvo com as 5 etapas Magnus Waves e já pode orientar o MM Blueprint.',
            nextStepLabel: 'Próximo passo recomendado: Design (MM Blueprint)',
            completedAt: at.toISOString(),
          },
        },
      });
    } catch {
      setFeedback('Erro ao salvar. Tente novamente.');
      scrollProjectToTop();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="form-loading">Carregando diagnóstico...</p>;
  }

  return (
    <form className="diagnostic-page" onSubmit={handleSubmit}>
      <section className="diagnostic-topbar">
        <div className="diagnostic-brand">
          <img src="/icone-magnusmind.svg" alt="" aria-hidden />
          <div>
            <span>Magnus Waves</span>
            <strong>Diagnóstico 1.1-1.5</strong>
          </div>
        </div>
        <div className="diagnostic-progress-panel" aria-label="Progresso do diagnóstico">
          <div>
            <span>{completion.percent}%</span>
            <p>preenchido</p>
          </div>
          <div>
            <span>
              {completion.requiredAnswered}/{completion.requiredTotal}
            </span>
            <p>campos-chave</p>
          </div>
          <div className="diagnostic-progress-bar" aria-hidden>
            <span style={{ width: `${completion.requiredPercent}%` }} />
          </div>
        </div>
        <div className="diagnostic-actions">
          <button type="button" className="diagnostic-secondary-button" onClick={handleDraft} disabled={savingDraft}>
            <Save size={16} aria-hidden />
            {savingDraft ? 'Salvando...' : 'Salvar rascunho'}
          </button>
          <button type="submit" className="diagnostic-primary-button" disabled={saving}>
            <ClipboardCheck size={16} aria-hidden />
            {saving ? 'Concluindo...' : 'Concluir canvas'}
          </button>
        </div>
      </section>

      {needsDiagnosis && (
        <div className="diagnostic-cycle-notice" role="status">
          <Layers3 size={18} aria-hidden />
          <span>
            Ciclo <strong>{activeCycle?.label ?? 'atual'}</strong> aguarda diagnóstico. Preencha o formulário para a IA
            trabalhar neste ciclo.
          </span>
        </div>
      )}

      {feedback && (
        <div className="diagnostic-feedback" role="status">
          <CircleAlert size={18} aria-hidden />
          <span>{feedback}</span>
        </div>
      )}

      <div className="diagnostic-workspace">
        <PhaseNav activePhase={activePhaseId} data={data} onSelect={selectPhase} />

        <main className="diagnostic-main">
          <PhaseHeader phase={activePhase} activeLens={activeLens} onLensChange={setActiveLens} />

          {activePhase.id === 'solutionPick' ? (
            <SolutionPickPanel
              data={data}
              userId={userId}
              onDataChange={setData}
              onSaveDraft={async (payload) => {
                if (!userId) return;
                const at = await saveInitialFormDraft(userId, payload);
                setDraftUpdatedAt(at);
                scheduleMagnusMemorySyncFromForm(payload);
              }}
            />
          ) : (
          <div className="diagnostic-blocks">
            {activePhase.blocks.map((block) => (
              <section key={block.id} className="diagnostic-block">
                <div className="diagnostic-block-header">
                  <div>
                    <span>{block.source ?? activePhase.subtitle}</span>
                    <h2>{block.title}</h2>
                    {block.description && <p>{block.description}</p>}
                  </div>
                  <small>{block.outputForAI}</small>
                </div>
                <div className="diagnostic-fields">
                  {block.fields.map((field) => {
                    const key = getFieldKey(field, activeLens);
                    return (
                      <DiagnosticFieldControl
                        key={key}
                        field={field}
                        fieldKey={key}
                        value={data[key]}
                        error={errors[key]}
                        onChange={setFieldValue}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
          )}
        </main>
      </div>

      <section className="diagnostic-bottom-panel" aria-label="Resumo e loop do diagnóstico">
        <div className="diagnostic-bottom-meta">
          <section className="diagnostic-deliverables">
            <div className="diagnostic-inspector-title">
              <FileText size={17} aria-hidden />
              <h2>Output da fase</h2>
            </div>
            <ul>
              {activePhase.deliverables.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="diagnostic-context-meter">
            <div className="diagnostic-inspector-title">
              <CheckCircle2 size={17} aria-hidden />
              <h2>Contexto para IA</h2>
            </div>
            <p>
              {contextPreview.length > 80
                ? `${contextPreview.length.toLocaleString('pt-BR')} caracteres estruturados`
                : 'Aguardando respostas para montar contexto consultivo.'}
            </p>
            {completedAt && (
              <span>Concluído em {completedAt.toLocaleString('pt-BR')}</span>
            )}
            {!completedAt && draftUpdatedAt && (
              <span>Rascunho salvo em {draftUpdatedAt.toLocaleString('pt-BR')}</span>
            )}
          </section>

          <LoopWorkspacePanel variant="compact" userId={userId} onReset={reloadForm} />
        </div>
      </section>

      <div className="diagnostic-bottom-actions">
        <button
          type="button"
          className="diagnostic-secondary-button"
          onClick={() => {
            const currentIndex = DIAGNOSTIC_PHASES.findIndex((phase) => phase.id === activePhaseId);
            const previous = DIAGNOSTIC_PHASES[Math.max(0, currentIndex - 1)];
            selectPhase(previous.id);
          }}
          disabled={activePhaseId === DIAGNOSTIC_PHASES[0].id}
        >
          Voltar fase
        </button>
        <button
          type="button"
          className="diagnostic-secondary-button"
          onClick={() => {
            const currentIndex = DIAGNOSTIC_PHASES.findIndex((phase) => phase.id === activePhaseId);
            const next = DIAGNOSTIC_PHASES[Math.min(DIAGNOSTIC_PHASES.length - 1, currentIndex + 1)];
            selectPhase(next.id);
          }}
          disabled={activePhaseId === DIAGNOSTIC_PHASES[DIAGNOSTIC_PHASES.length - 1].id}
        >
          Próxima fase
          <ArrowRight size={16} aria-hidden />
        </button>
      </div>
    </form>
  );
}
