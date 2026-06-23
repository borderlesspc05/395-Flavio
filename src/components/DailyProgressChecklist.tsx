import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BarChart3,
  Check,
  ClipboardList,
  Flame,
  Loader2,
  Save,
  Target,
  Users,
} from 'lucide-react';
import { ViewTransitionLink } from './navigation/ViewTransitionLink';
import type { ActionCanvas, InitialFormData, Objective } from '../types';
import type { DailyProgressChecklistData } from '../types/dailyProgress';
import { DAILY_CHECKLIST_ITEMS } from '../types/dailyProgress';
import {
  mergeDailyProgressChecklist,
  parseDailyProgressChecklist,
  DAILY_PROGRESS_CHECKLIST_KEY,
} from '../services/dailyProgressChecklist';
import {
  buildProjectPulseHints,
  computeDailyProgressStats,
  getItemConfig,
  type ProjectPulseHint,
} from '../services/dailyProgressStats';
import '../styles/daily-progress-checklist.css';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type Props = {
  data: InitialFormData;
  onDataChange: (next: InitialFormData) => void;
  onSaveDraft?: (payload: InitialFormData) => void | Promise<void>;
  persistSessionKey?: string | number;
  compact?: boolean;
  canvases?: ActionCanvas[];
  objectives?: Objective[];
  showStats?: boolean;
  hideSectionHeader?: boolean;
};

const WAVE_ICONS = {
  design: Target,
  difusao: Users,
  dominio: BarChart3,
  geral: ClipboardList,
} as const;

function hintForItem(id: string, hints: ProjectPulseHint[]): ProjectPulseHint | undefined {
  return hints.find((hint) => hint.id === id);
}

export function DailyProgressChecklist({
  data,
  onDataChange,
  onSaveDraft,
  persistSessionKey,
  compact = false,
  canvases = [],
  objectives = [],
  showStats = false,
  hideSectionHeader = false,
}: Props) {
  const checklist = useMemo(
    () => parseDailyProgressChecklist(data[DAILY_PROGRESS_CHECKLIST_KEY]),
    [data]
  );
  const serializedChecklist = String(data[DAILY_PROGRESS_CHECKLIST_KEY] ?? '');

  const [lastSavedJson, setLastSavedJson] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const stats = useMemo(() => computeDailyProgressStats(checklist), [checklist]);
  const pulseHints = useMemo(
    () => buildProjectPulseHints(canvases, objectives),
    [canvases, objectives]
  );

  const isDirty = lastSavedJson !== null && serializedChecklist !== lastSavedJson;
  const canSave = Boolean(onSaveDraft) && saveStatus !== 'saving';

  useEffect(() => {
    setLastSavedJson(String(data[DAILY_PROGRESS_CHECKLIST_KEY] ?? ''));
    setSaveStatus('idle');
    setSaveError(null);
  }, [persistSessionKey]);

  const apply = (next: DailyProgressChecklistData) => {
    const payload = mergeDailyProgressChecklist(data, next);
    onDataChange(payload);
    if (saveStatus === 'saved') setSaveStatus('idle');
  };

  const handleSave = async () => {
    if (!onSaveDraft || saveStatus === 'saving') return;
    setSaveStatus('saving');
    setSaveError(null);
    try {
      const payload = mergeDailyProgressChecklist(data, checklist);
      await onSaveDraft(payload);
      onDataChange(payload);
      setLastSavedJson(String(payload[DAILY_PROGRESS_CHECKLIST_KEY] ?? ''));
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
      setSaveError('Não foi possível salvar. Tente novamente.');
    }
  };

  const toggle = (id: string) => {
    apply({
      ...checklist,
      items: checklist.items.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      ),
    });
  };

  const setNotes = (dailyNotes: string) => {
    apply({ ...checklist, dailyNotes });
  };

  const doneCount = stats.todayDone;
  const ringOffset = 2 * Math.PI * 42;
  const ringProgress = (stats.todayPercent / 100) * ringOffset;

  return (
    <div className={`daily-checklist-shell ${compact ? 'is-compact' : ''}`}>
      {showStats && !compact && (
        <div className="daily-checklist-stats" aria-label="Resumo do ritmo diário">
          <article className="daily-checklist-stat daily-checklist-stat--ring">
            <div
              className="daily-checklist-ring"
              style={
                {
                  '--ring-progress': ringProgress,
                  '--ring-circumference': ringOffset,
                } as React.CSSProperties
              }
              aria-hidden
            >
              <svg viewBox="0 0 96 96" role="presentation">
                <circle className="daily-checklist-ring-track" cx="48" cy="48" r="42" />
                <circle className="daily-checklist-ring-fill" cx="48" cy="48" r="42" />
              </svg>
              <span className="daily-checklist-ring-label">
                <strong>{stats.todayPercent}%</strong>
                <small>hoje</small>
              </span>
            </div>
            <div>
              <p className="daily-checklist-stat-kicker">Ritmo de hoje</p>
              <p className="daily-checklist-stat-value">
                {doneCount} de {stats.todayTotal} itens
              </p>
              <p className="daily-checklist-stat-meta">
                Cada marcação alimenta o MID e o histórico do projeto.
              </p>
            </div>
          </article>

          <article className="daily-checklist-stat">
            <div className="daily-checklist-stat-icon" aria-hidden>
              <Flame size={18} />
            </div>
            <p className="daily-checklist-stat-kicker">Sequência</p>
            <p className="daily-checklist-stat-value">
              {stats.streakDays} dia{stats.streakDays === 1 ? '' : 's'}
            </p>
            <p className="daily-checklist-stat-meta">Com pelo menos 4 itens ou checklist completo.</p>
          </article>

          <article className="daily-checklist-stat">
            <p className="daily-checklist-stat-kicker">Média 7 dias</p>
            <p className="daily-checklist-stat-value">{stats.weekAvgPercent}%</p>
            <div className="daily-checklist-spark" role="img" aria-label="Histórico dos últimos 7 dias">
              {stats.lastSevenDays.map((day) => (
                <span
                  key={day.date}
                  className="daily-checklist-spark-bar"
                  style={{ height: `${Math.max(8, day.percent)}%` }}
                  title={`${day.date}: ${day.percent}%`}
                />
              ))}
            </div>
          </article>
        </div>
      )}

      <section
        className={`daily-progress-checklist ${compact ? 'is-compact' : ''}${hideSectionHeader ? ' is-page-variant' : ''}`}
        aria-label="Checklist diário de atualização do projeto"
      >
        {!hideSectionHeader && (
          <header className="daily-progress-checklist-header">
            <ClipboardList size={18} aria-hidden />
            <div>
              <h3>Checklist diário</h3>
              <p>
                Cada item conecta uma área do projeto. Marque após atualizar e use o atalho para ir
                direto à tela certa.
              </p>
            </div>
            <span className="daily-progress-checklist-count" aria-live="polite">
              {doneCount}/{checklist.items.length}
            </span>
          </header>
        )}

        {hideSectionHeader && (
          <div className="daily-progress-checklist-toolbar">
            <p className="daily-progress-checklist-toolbar-label">
              <ClipboardList size={16} aria-hidden />
              Itens do ritual
            </p>
            <span className="daily-progress-checklist-count" aria-live="polite">
              {doneCount}/{checklist.items.length}
            </span>
          </div>
        )}

        <ul className="daily-progress-checklist-items">
          {checklist.items.map((item, index) => {
            const config = getItemConfig(item.id) ?? DAILY_CHECKLIST_ITEMS[index];
            const hint = hintForItem(item.id, pulseHints);
            const WaveIcon = WAVE_ICONS[config.wave];

            return (
              <li key={item.id}>
                <article
                  className={`daily-progress-card ${item.checked ? 'is-checked' : ''}`}
                >
                  <button
                    type="button"
                    className="daily-progress-card-check"
                    onClick={() => toggle(item.id)}
                    aria-pressed={item.checked}
                    aria-label={`${item.checked ? 'Desmarcar' : 'Marcar'}: ${item.label}`}
                  >
                    <span className="daily-progress-checklist-box" aria-hidden>
                      {item.checked ? <Check size={14} /> : null}
                    </span>
                  </button>

                  <div className="daily-progress-card-body">
                    <div className="daily-progress-card-top">
                      <span className={`daily-progress-wave daily-progress-wave--${config.wave}`}>
                        <WaveIcon size={12} aria-hidden />
                        {config.waveLabel}
                      </span>
                      {hint && (
                        <span
                          className={`daily-progress-pulse daily-progress-pulse--${hint.tone}`}
                        >
                          {hint.value}
                        </span>
                      )}
                    </div>
                    <p className="daily-progress-card-title">{item.label}</p>
                    <p className="daily-progress-card-desc">{config.description}</p>
                    <ViewTransitionLink
                      to={config.route}
                      className="daily-progress-card-link"
                    >
                      Ir para {config.waveLabel}
                      <ArrowUpRight size={14} aria-hidden />
                    </ViewTransitionLink>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>

        <label className="daily-progress-checklist-notes">
          <span className="daily-progress-checklist-notes-label">Notas do dia</span>
          <span className="daily-progress-checklist-notes-hint">Opcional — contexto para o histórico</span>
          <textarea
            value={checklist.dailyNotes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex.: travou handoff com operações; sponsor pediu priorizar onboarding."
            rows={compact ? 2 : 3}
          />
        </label>

        {onSaveDraft && (
          <footer className="daily-progress-checklist-save">
            <p className="daily-progress-checklist-save-hint" role="status">
              {saveStatus === 'saved'
                ? 'Checklist do dia salvo no projeto.'
                : isDirty
                  ? 'Há alterações não salvas.'
                  : 'Salve para registrar o ritual de hoje no histórico do projeto.'}
            </p>
            {saveError ? (
              <p className="daily-progress-checklist-save-error" role="alert">
                {saveError}
              </p>
            ) : null}
            <button
              type="button"
              className={`daily-progress-checklist-save-btn${saveStatus === 'saved' ? ' is-saved' : ''}`}
              onClick={() => void handleSave()}
              disabled={!canSave}
            >
              {saveStatus === 'saving' ? (
                <Loader2 size={16} className="daily-checklist-spin" aria-hidden />
              ) : saveStatus === 'saved' ? (
                <Check size={16} aria-hidden />
              ) : (
                <Save size={16} aria-hidden />
              )}
              {saveStatus === 'saving'
                ? 'Salvando…'
                : saveStatus === 'saved'
                  ? 'Salvo'
                  : 'Salvar checklist do dia'}
            </button>
          </footer>
        )}
      </section>
    </div>
  );
}
