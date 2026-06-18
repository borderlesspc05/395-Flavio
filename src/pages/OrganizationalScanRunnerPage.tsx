import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowLeft, CircleAlert, ClipboardCheck, Save } from 'lucide-react';
import { auth } from '../config/firebase';
import { ScanFieldControl } from '../components/scans/ScanFieldControl';
import { ORGANIZATIONAL_SCAN_MAP } from '../constants/organizationalScans';
import { buildDiagnosticContext, createEmptyDiagnosticData } from '../constants/diagnosticFlow';
import { useCycle } from '../context/CycleContext';
import { useViewTransitionNavigate } from '../hooks/useViewTransitionNavigate';
import { updateDiagnosticCycle } from '../services/diagnosticCycles';
import { getInitialForm, saveInitialForm, saveInitialFormDraft } from '../services/initialForm';
import { syncMagnusMemoryToServer } from '../services/magnusMemorySync';
import {
  getScanAnswersFromForm,
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
  const [cycleName, setCycleName] = useState('');
  const [cycleNameError, setCycleNameError] = useState<string | null>(null);

  const { activeCycle, clearNeedsDiagnosis, persistActiveCycleSnapshot, refreshCycles } = useCycle();

  const answers = useMemo(
    () => (scan ? getScanAnswersFromForm(formData, scan.id) : {}),
    [formData, scan],
  );
  const completion = useMemo(
    () => (scan ? getScanCompletion(scan, answers) : { answered: 0, total: 0, percent: 0 }),
    [scan, answers],
  );
  const status = useMemo(() => (scan ? getScanStatus(scan, answers) : 'not_started'), [scan, answers]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setUserId(user?.uid ?? null));
    return unsub;
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    getInitialForm(userId)
      .then(({ data }) => {
        if (!cancelled) setFormData(data);
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
      if (!scan) return;
      setFormData((prev) => mergeScanAnswer(prev, scan.id, fieldId, value));
      setErrors((prev) => {
        if (!prev[fieldId]) return prev;
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
      setFeedback(null);
    },
    [scan],
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
    if (!userId || !scan) return;
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
    if (!userId || !validateComplete()) return;
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
      const at = await saveInitialForm(userId, formData);
      const diagnosticContext = buildDiagnosticContext(formData);
      await syncMagnusMemoryToServer({ diagnosticContext });
      if (activeCycle) {
        await updateDiagnosticCycle(activeCycle.id, {
          label: trimmedName,
          status: 'active',
          completedAt: at.toISOString(),
          diagnosticContext,
          formData,
        });
        await persistActiveCycleSnapshot();
        await refreshCycles();
        clearNeedsDiagnosis();
      }
      setShowCycleNameModal(false);
      navigate('/dashboard/design', {
        state: {
          postDiagnosticNotice: {
            title: `Projeto "${trimmedName}" iniciado`,
            message: `Diagnóstico focado (${scan.title}) salvo. Valide os planos de ação ou use a Consultoria IA na Equipe.`,
            nextStepLabel: 'Próximo passo: validar planos no Design',
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
    openCycleNameModal();
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
      <form className="organizational-scan-runner" onSubmit={handleComplete}>
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
            Não é necessário preencher os outros scans.
          </p>
          <div className="organizational-scans-progress" aria-label="Progresso deste scan">
            <div>
              <strong>{getScanStatusLabel(status)}</strong>
              <span> neste tema</span>
            </div>
            <span>
              {completion.answered}/{completion.total} perguntas
            </span>
          </div>
        </header>

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
                />
              ))}
            </div>
          </section>
        ))}

        <div className="organizational-scan-actions">
          <button type="button" className="diagnostic-secondary-button" onClick={() => navigate('/dashboard/scans')}>
            Voltar
          </button>
          <div className="organizational-scan-actions-group">
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
          </div>
        </div>
      </form>

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
              todo o Magnus Waves.
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
