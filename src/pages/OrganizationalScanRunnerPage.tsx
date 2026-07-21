import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowLeft, CircleAlert, ClipboardCheck, Lock, RotateCcw, Save } from 'lucide-react';
import { auth } from '../config/firebase';
import { ScanFieldControl } from '../components/scans/ScanFieldControl';
import { ORGANIZATIONAL_SCANS, ORGANIZATIONAL_SCAN_MAP } from '../constants/organizationalScans';
import { buildDiagnosticContext, createEmptyDiagnosticData } from '../constants/diagnosticFlow';
import { useCycle } from '../context/CycleContext';
import { useViewTransitionNavigate } from '../hooks/useViewTransitionNavigate';
import { updateDiagnosticCycle } from '../services/diagnosticCycles';
import { lockSprintPhase, unlockSprintPhase } from '../services/phaseLock';
import { usePhaseLock } from '../hooks/usePhaseLock';
import { PhaseLockBanner } from '../components/ui/PhaseLockBanner';
import { getInitialForm, reopenInitialForm, saveInitialForm, saveInitialFormDraft } from '../services/initialForm';
import { syncMagnusMemoryToServer } from '../services/magnusMemorySync';
import {
  clearScanCompleted,
  getCompletedScans,
  getScanAnswersFromForm,
  isScanMarkedCompleted,
  markScanCompleted,
  mergeScanAnswer,
} from '../services/organizationalScanStorage';
import type { DiagnosticFieldValue, InitialFormData } from '../types';
import type { OrganizationalScanId } from '../types/organizationalScans';
import {
  getScanCompletion,
  getScanStatus,
  getScanStatusLabel,
  isDistributionComplete,
  isScanValueAnswered,
} from '../utils/organizationalScans';
import '../styles/organizational-scans.css';

function isValidScanId(id: string | undefined): id is OrganizationalScanId {
  return Boolean(id && id in ORGANIZATIONAL_SCAN_MAP);
}

export function OrganizationalScanRunnerPage() {
  const { scanId } = useParams();
  const navigate = useViewTransitionNavigate();
  const location = useLocation();
  const scan = isValidScanId(scanId) ? ORGANIZATIONAL_SCAN_MAP[scanId] : null;

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<InitialFormData>(createEmptyDiagnosticData());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showCycleNameModal, setShowCycleNameModal] = useState(false);
  const [showRedoConfirm, setShowRedoConfirm] = useState(false);
  const [redoing, setRedoing] = useState(false);
  const [cycleName, setCycleName] = useState('');
  const [cycleNameError, setCycleNameError] = useState<string | null>(null);

  const { activeCycle, clearNeedsDiagnosis, persistActiveCycleSnapshot, refreshCycles } = useCycle();
  const {
    locks: phaseLocks,
    setLocks: setPhaseLocks,
    locked: phaseLocked,
    cycle: phaseCycle,
  } = usePhaseLock('diagnostic');

  const answers = useMemo(
    () => (scan ? getScanAnswersFromForm(formData, scan.id) : {}),
    [formData, scan],
  );
  const completion = useMemo(
    () => (scan ? getScanCompletion(scan, answers) : { answered: 0, total: 0, percent: 0 }),
    [scan, answers],
  );
  const status = useMemo(() => (scan ? getScanStatus(scan, answers) : 'not_started'), [scan, answers]);
  const scanCompleted = Boolean(scan && isScanMarkedCompleted(formData, scan.id));
  /** Freeze after this scan is concluded, or when the Diagnóstico phase is locked. */
  const isLocked = scanCompleted || phaseLocked;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setUserId(user?.uid ?? null));
    return unsub;
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    getInitialForm(userId)
      .then(({ data, completedAt }) => {
        if (cancelled) return;
        let nextData = data;
        // One-time migration for accounts concluded before per-scan tracking:
        // freeze only scans that were already 100% answered when the page loaded.
        if (completedAt && Object.keys(getCompletedScans(data)).length === 0) {
          for (const item of ORGANIZATIONAL_SCANS) {
            if (item.comingSoon || item.id === 'fullScan') continue;
            const itemAnswers = getScanAnswersFromForm(data, item.id);
            if (getScanStatus(item, itemAnswers) === 'complete') {
              nextData = markScanCompleted(nextData, item.id, completedAt);
            }
          }
        }
        setFormData(nextData);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const setAnswer = useCallback(
    (fieldId: string, value: DiagnosticFieldValue) => {
      if (!scan || isLocked) return;
      setFormData((prev) => mergeScanAnswer(prev, scan.id, fieldId, value));
      setErrors((prev) => {
        if (!prev[fieldId]) return prev;
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
      setFeedback(null);
    },
    [scan, isLocked],
  );

  const validateComplete = () => {
    if (!scan) return false;
    const nextErrors: Record<string, string> = {};
    for (const block of scan.blocks) {
      for (const field of block.fields) {
        if (field.required === false) continue;
        const value = answers[field.id];
        if (field.type === 'distribution') {
          if (!isDistributionComplete(value, field.distributionTotal ?? 100)) {
            nextErrors[field.id] = `Distribua exatamente ${field.distributionTotal ?? 100} pontos.`;
          }
          continue;
        }
        if (!isScanValueAnswered(value)) {
          nextErrors[field.id] = 'Responda esta pergunta para concluir o diagnóstico.';
        }
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFeedback('Para concluir, responda todas as perguntas deste scan.');
      return false;
    }
    return true;
  };

  const handleDraft = async () => {
    if (!userId || !scan || isLocked) return;
    setSavingDraft(true);
    setFeedback(null);
    try {
      await saveInitialFormDraft(userId, formData);
      setFeedback('Rascunho salvo. Você pode continuar depois ou escolher outro scan.');
    } catch {
      setFeedback('Não foi possível salvar o rascunho.');
    } finally {
      setSavingDraft(false);
    }
  };

  const openCycleNameModal = () => {
    if (!userId || isLocked || !validateComplete()) return;
    const fromCreate = (location.state as { newProjectName?: string } | null)?.newProjectName?.trim();
    const current = activeCycle?.label?.trim() ?? '';
    const isAutoLabel = /^Ciclo \d+/i.test(current);
    setCycleName(fromCreate || (isAutoLabel ? '' : current));
    setCycleNameError(null);
    setShowCycleNameModal(true);
  };

  const completeFocusedDiagnostic = async (projectName: string) => {
    if (!userId || !scan) return;
    const trimmedName = projectName.trim();
    if (trimmedName.length < 2) {
      setCycleNameError('Informe um nome com pelo menos 2 caracteres.');
      return;
    }

    setSaving(true);
    setFeedback(null);
    setCycleNameError(null);
    try {
      const at = new Date();
      const nextForm = markScanCompleted(formData, scan.id, at);
      setFormData(nextForm);
      await saveInitialForm(userId, nextForm);
      const diagnosticContext = buildDiagnosticContext(nextForm);
      await syncMagnusMemoryToServer({ diagnosticContext });
      if (activeCycle) {
        await updateDiagnosticCycle(activeCycle.id, {
          label: trimmedName,
          status: 'active',
          completedAt: at.toISOString(),
          diagnosticContext,
          formData: nextForm,
        });
        await persistActiveCycleSnapshot();
        await lockSprintPhase(activeCycle, 'diagnostic');
        await refreshCycles();
        clearNeedsDiagnosis();
      }
      setShowCycleNameModal(false);
      navigate('/dashboard/solution-pick', {
        state: {
          postDiagnosticNotice: {
            title: `Projeto "${trimmedName}" iniciado`,
            message: `Diagnóstico focado (${scan.title}) salvo. Os outros temas continuam disponíveis para complementar o Solution Pick.`,
            nextStepLabel: 'Próximo passo: Solution Pick → Design',
            completedAt: at.toISOString(),
          },
        },
      });
    } catch {
      setFeedback('Erro ao concluir. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = (event: FormEvent) => {
    event.preventDefault();
    if (isLocked) return;
    openCycleNameModal();
  };

  const handleRedoConfirm = async () => {
    if (!userId || !scan) return;
    setRedoing(true);
    setFeedback(null);
    try {
      if (phaseLocked) {
        const unlocked = await unlockSprintPhase(phaseCycle ?? activeCycle, 'diagnostic');
        if (!unlocked.ok) {
          setFeedback(
            unlocked.message ??
              'Desbloqueie a fase Diagnóstico no banner acima antes de refazer este scan.',
          );
          setShowRedoConfirm(false);
          return;
        }
        setPhaseLocks(unlocked.locks);
      }

      const next = clearScanCompleted(formData, scan.id);
      const stillHaveCompleted = Object.keys(getCompletedScans(next)).length > 0;
      setFormData(next);
      await saveInitialFormDraft(userId, next);

      if (stillHaveCompleted) {
        setShowRedoConfirm(false);
        setFeedback('Este scan foi reaberto. Os outros diagnósticos concluídos permanecem bloqueados.');
      } else {
        await reopenInitialForm(userId);
        if (activeCycle) {
          await updateDiagnosticCycle(activeCycle.id, {
            status: 'draft',
            completedAt: null,
          });
          await refreshCycles();
        }
        setShowRedoConfirm(false);
        setFeedback('Este scan foi reaberto para edição.');
      }
    } catch {
      setFeedback('Não foi possível refazer o diagnóstico. Tente novamente.');
    } finally {
      setRedoing(false);
    }
  };

  if (!scan || scan.comingSoon || scan.id === 'fullScan') {
    return (
      <div className="organizational-scans-page">
        <p>Scan não disponível.</p>
        <button type="button" className="diagnostic-secondary-button" onClick={() => navigate('/dashboard/scans')}>
          Voltar
        </button>
      </div>
    );
  }

  if (loading) {
    return <p className="form-loading">Carregando scan...</p>;
  }

  return (
    <>
      <div className="organizational-scans-page">
        <PhaseLockBanner
          phase="diagnostic"
          locks={phaseLocks}
          cycle={phaseCycle}
          onLocksChange={setPhaseLocks}
        />
      <form className={`organizational-scan-runner ${isLocked ? 'is-locked' : ''}`} onSubmit={handleComplete}>
        <header className="organizational-scan-runner-header">
          <button
            type="button"
            className="diagnostic-secondary-button"
            onClick={() => navigate('/dashboard/scans')}
          >
            <ArrowLeft size={16} aria-hidden />
            Escolher outro tema
          </button>
          <p className="organizational-scan-card-step">Diagnóstico focado</p>
          <h1 className="premium-display">{scan.title}</h1>
          <p>{scan.intro}</p>
          {scan.guidance ? <p className="organizational-scan-guidance">{scan.guidance}</p> : null}
          <p className="organizational-scan-runner-note">
            Este scan pode substituir o canvas completo. Responda no seu ritmo e conclua quando estiver pronto.
            Os outros temas continuam disponíveis para complementar o Solution Pick.
          </p>
          <div className="organizational-scans-progress" aria-label="Progresso deste scan">
            <div>
              <strong>
                {phaseLocked
                  ? 'Fase bloqueada'
                  : scanCompleted
                    ? 'Concluído'
                    : getScanStatusLabel(status)}
              </strong>
              <span> neste tema</span>
            </div>
            <span>
              {completion.answered}/{completion.total} perguntas
            </span>
          </div>
        </header>

        {isLocked ? (
          <div className="organizational-scan-readonly-banner" role="status">
            <Lock size={16} aria-hidden />
            <span>
              {phaseLocked
                ? 'Diagnóstico congelado — somente visualização. Desbloqueie a fase para editar.'
                : 'Este scan está concluído e bloqueado para edição. Os outros temas seguem liberados.'}
            </span>
          </div>
        ) : null}

        {feedback ? (
          <div className="diagnostic-feedback" role="status">
            <CircleAlert size={18} aria-hidden />
            <span>{feedback}</span>
          </div>
        ) : null}

        {scan.blocks.map((block) => (
          <section key={block.id} className="organizational-scan-block" aria-labelledby={`${block.id}-title`}>
            <h2 id={`${block.id}-title`}>{block.title}</h2>
            <div className="diagnostic-fields">
              {block.fields.map((field) => (
                <ScanFieldControl
                  key={field.id}
                  field={field}
                  value={answers[field.id]}
                  error={errors[field.id]}
                  onChange={(value) => setAnswer(field.id, value)}
                  readOnly={isLocked}
                />
              ))}
            </div>
          </section>
        ))}

        <div className="organizational-scan-actions mm-sticky-actions">
          <button type="button" className="diagnostic-secondary-button" onClick={() => navigate('/dashboard/scans')}>
            Voltar
          </button>
          {showRedoConfirm ? (
            <div
              className="organizational-scan-redo-confirm"
              role="alertdialog"
              aria-labelledby="scan-redo-title"
            >
              <p id="scan-redo-title">Tem certeza que quer refazer este scan?</p>
              <div className="organizational-scan-redo-confirm-actions">
                <button
                  type="button"
                  className="organizational-scan-redo-cancel"
                  disabled={redoing}
                  onClick={() => setShowRedoConfirm(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="organizational-scan-redo-confirm-btn"
                  disabled={redoing}
                  onClick={() => void handleRedoConfirm()}
                >
                  {redoing ? 'Refazendo...' : 'Sim, refazer'}
                </button>
              </div>
            </div>
          ) : (
            <div className="organizational-scan-actions-group">
              {isLocked ? (
                <>
                  <button
                    type="button"
                    className="diagnostic-secondary-button"
                    onClick={() => navigate('/dashboard/solution-pick')}
                  >
                    Ir para Solution Pick
                  </button>
                  <button
                    type="button"
                    className="diagnostic-primary-button"
                    onClick={() => setShowRedoConfirm(true)}
                    disabled={redoing}
                  >
                    <RotateCcw size={16} aria-hidden />
                    Refazer este scan
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="diagnostic-secondary-button"
                    onClick={() => void handleDraft()}
                    disabled={savingDraft || saving}
                  >
                    <Save size={16} aria-hidden />
                    {savingDraft ? 'Salvando...' : 'Salvar rascunho'}
                  </button>
                  <button type="submit" className="diagnostic-primary-button" disabled={saving || savingDraft}>
                    <ClipboardCheck size={16} aria-hidden />
                    {saving ? 'Concluindo...' : 'Concluir diagnóstico'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </form>
      </div>

      {showCycleNameModal ? (
        <div className="cycle-name-modal" role="presentation">
          <button
            type="button"
            className="cycle-name-modal__backdrop"
            aria-label="Fechar"
            onClick={() => !saving && setShowCycleNameModal(false)}
          />
          <div
            className="cycle-name-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="scan-cycle-name-title"
          >
            <span className="cycle-name-modal__kicker">Diagnóstico focado</span>
            <h2 id="scan-cycle-name-title">Nome do seu projeto</h2>
            <p>
              Você está concluindo com o scan <strong>{scan.title}</strong>. Este nome identifica o ciclo em
              todo o Sprint Waves.
            </p>
            <label className="cycle-name-modal__field">
              <span>Nome do projeto</span>
              <input
                type="text"
                value={cycleName}
                onChange={(event) => {
                  setCycleName(event.target.value);
                  setCycleNameError(null);
                }}
                placeholder="Ex: Cultura Comercial 2026"
                maxLength={80}
                autoFocus
                disabled={saving}
              />
            </label>
            {cycleNameError ? (
              <p className="cycle-name-modal__error" role="alert">
                {cycleNameError}
              </p>
            ) : null}
            <div className="cycle-name-modal__actions">
              <button
                type="button"
                className="cycle-name-modal__ghost"
                disabled={saving}
                onClick={() => setShowCycleNameModal(false)}
              >
                Voltar
              </button>
              <button
                type="button"
                className="cycle-name-modal__primary"
                disabled={saving}
                onClick={() => void completeFocusedDiagnostic(cycleName)}
              >
                {saving ? 'Concluindo...' : 'Iniciar projeto'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
