import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ViewTransitionLink } from '../components/navigation/ViewTransitionLink';
import { useViewTransitionNavigate } from '../hooks/useViewTransitionNavigate';
import { ArrowRight, FolderKanban, Loader2, LogOut, Plus, Trash2 } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { AuthLayout } from '../components/AuthLayout';
import { useCycle } from '../context/CycleContext';
import type { DiagnosticCycle } from '../services/diagnosticCycles';
import { getCycleWaveFromDoc, getRouteForCycleDoc, resolveCycleEntryRoute, WAVE_STEP_LABELS } from '../services/cycleRouting';
import { clearWorkspaceEntered, hasEnteredWorkspace, markWorkspaceEntered } from '../services/projectWorkspace';
import { usePlan } from '../context/PlanContext';
import { canCreateMoreCycles, formatCycleUsage } from '../utils/cycleLimits';

const STATUS_LABELS: Record<DiagnosticCycle['status'], string> = {
  draft: 'Rascunho',
  active: 'Em andamento',
  archived: 'Arquivado',
};

export function ProjectSelectPage() {
  const navigate = useViewTransitionNavigate();
  const location = useLocation();
  const autoEnterAttempted = useRef(false);
  const {
    cycles,
    activeCycle,
    loading,
    switching,
    switchCycle,
    startNewCycle,
    deleteCycle,
    refreshCycles,
  } = useCycle();
  const { maxOpenCycles, maxOpenCyclesLabel, plan } = usePlan();
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  const canCreateMore = canCreateMoreCycles(cycles, maxOpenCycles);
  const usageLabel = formatCycleUsage(cycles.length, maxOpenCycles);
  const isBusy = Boolean(enteringId) || switching || creating || Boolean(deletingId);

  const enterCycle = useCallback(
    async (cycle: DiagnosticCycle) => {
      if (isBusy || confirmDeleteId) return;
      setEnteringId(cycle.id);
      setError(null);
      try {
        if (activeCycle?.id !== cycle.id) {
          await switchCycle(cycle.id);
        }
        markWorkspaceEntered();
        const fallbackRoute = getRouteForCycleDoc(cycle);
        navigate(fallbackRoute, {
          replace: true,
          state: {
            cycleEntry: {
              cycleId: cycle.id,
              label: cycle.label,
            },
          },
        });
        void resolveCycleEntryRoute(cycle).then((route) => {
          if (route !== fallbackRoute) {
            navigate(route, { replace: true });
          }
        });
      } catch {
        setError('Não foi possível abrir este projeto. Tente novamente.');
      } finally {
        setEnteringId(null);
      }
    },
    [activeCycle?.id, confirmDeleteId, isBusy, navigate, switchCycle]
  );

  useEffect(() => {
    if (loading || isBusy || cycles.length === 0 || autoEnterAttempted.current) return;

    const justRegistered =
      location.state != null &&
      typeof location.state === 'object' &&
      'justRegistered' in location.state &&
      (location.state as { justRegistered?: boolean }).justRegistered === true;

    if (!justRegistered && (hasEnteredWorkspace() || cycles.length !== 1)) return;

    autoEnterAttempted.current = true;
    void enterCycle(cycles[0]);
  }, [loading, isBusy, cycles, location.state, enterCycle]);

  const handleDelete = async (cycleId: string) => {
    setDeletingId(cycleId);
    setError(null);
    try {
      const result = await deleteCycle(cycleId);
      if (!result.ok && result.message) {
        setError(result.message);
      }
    } catch {
      setError('Não foi possível excluir este projeto.');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleCreateProject = async () => {
    if (creating) return;
    const trimmed = newProjectName.trim();
    if (trimmed.length < 2) {
      setNameError('Informe um nome com pelo menos 2 caracteres.');
      return;
    }

    setCreating(true);
    setError(null);
    setNameError(null);
    try {
      const result = await startNewCycle({ label: trimmed });
      if (result.ok) {
        await refreshCycles();
        markWorkspaceEntered();
        navigate('/dashboard/scans', {
          replace: true,
          state: { newProjectName: trimmed },
        });
      } else if (result.message) {
        setError(result.message);
      }
    } catch {
      setError('Erro ao criar novo projeto.');
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    clearWorkspaceEntered();
    await signOut(auth);
    navigate('/login', { replace: true });
  };

  return (
    <AuthLayout
      title="Escolha o projeto"
      subtitle="Selecione um processo de pré-diagnóstico ou crie um novo"
      cardClassName="auth-card--projects"
      backTo={
        hasEnteredWorkspace()
          ? { href: '/dashboard/inicio', label: 'Voltar ao painel' }
          : undefined
      }
    >
      <div className="project-select">
        {loading && cycles.length === 0 ? (
          <div className="project-select-loading" aria-busy="true">
            <Loader2 size={22} className="spin" aria-hidden />
            <span>Carregando projetos…</span>
          </div>
        ) : (
          <>
            <div className="project-select-existing">
              <div className="project-select-meta">
                <p className="project-select-hint">
                  Plano <strong>{plan?.planName ?? 'Starter'}</strong>
                  {maxOpenCycles === null ? (
                    <>: processos ilimitados</>
                  ) : (
                    <>: até {maxOpenCycles} processos</>
                  )}
                </p>
                <span className="project-select-usage" aria-label={`Uso: ${usageLabel}`}>
                  {usageLabel}
                </span>
              </div>

              <h2 id="project-select-list-title" className="project-select-list-heading">
                Seus projetos
              </h2>
              <ul
                className="project-select-list"
                role="listbox"
                aria-labelledby="project-select-list-title"
              >
                {cycles.length === 0 ? (
                  <li className="project-select-empty">Nenhum projeto ainda. Defina o nome abaixo e comece.</li>
                ) : (
                  cycles.map((cycle) => {
                    const step = getCycleWaveFromDoc(cycle);
                    const busy = enteringId === cycle.id;
                    const isDeleting = deletingId === cycle.id;
                    const isConfirming = confirmDeleteId === cycle.id;
                    const isActive = activeCycle?.id === cycle.id;

                    if (isConfirming) {
                      return (
                        <li key={cycle.id} className="project-select-confirm" role="alertdialog">
                          <p>
                            Excluir <strong>{cycle.label}</strong>? Esta ação não pode ser desfeita.
                          </p>
                          <div className="project-select-confirm-actions">
                            <button
                              type="button"
                              className="project-select-confirm-cancel"
                              disabled={isDeleting}
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              className="project-select-confirm-delete"
                              disabled={isDeleting}
                              onClick={() => void handleDelete(cycle.id)}
                            >
                              {isDeleting ? (
                                <>
                                  <Loader2 size={14} className="spin" aria-hidden />
                                  Excluindo…
                                </>
                              ) : (
                                'Excluir'
                              )}
                            </button>
                          </div>
                        </li>
                      );
                    }

                    return (
                      <li key={cycle.id} className={`project-select-row ${isActive ? 'is-active' : ''}`}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          className="project-select-item"
                          disabled={isBusy}
                          onClick={() => void enterCycle(cycle)}
                        >
                          <span className="project-select-item-icon" aria-hidden>
                            <FolderKanban size={18} />
                          </span>
                          <span className="project-select-item-copy">
                            <strong>{cycle.label}</strong>
                            <span>
                              {STATUS_LABELS[cycle.status]} · {WAVE_STEP_LABELS[step]}
                            </span>
                          </span>
                          <span className="project-select-item-action" aria-hidden>
                            {busy ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="project-select-delete"
                          aria-label={`Excluir ${cycle.label}`}
                          disabled={isBusy}
                          onClick={() => setConfirmDeleteId(cycle.id)}
                        >
                          <Trash2 size={15} aria-hidden />
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>

            <section className="project-select-create" aria-labelledby="project-select-create-title">
              <h2 id="project-select-create-title" className="project-select-create-title">
                Novo projeto
              </h2>
              <label className="project-select-name-field">
                <span>Nome do projeto</span>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => {
                    setNewProjectName(e.target.value);
                    setNameError(null);
                  }}
                  placeholder="Ex: Transformação Comercial 2026"
                  maxLength={80}
                  disabled={isBusy}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleCreateProject();
                    }
                  }}
                />
              </label>
              {nameError && (
                <p className="error-message" role="alert">
                  {nameError}
                </p>
              )}
              <button
                type="button"
                className="auth-btn auth-btn--primary project-select-create-btn"
                disabled={isBusy || !canCreateMore}
                onClick={() => void handleCreateProject()}
                title={
                  canCreateMore
                    ? undefined
                    : `Limite atingido: ${maxOpenCyclesLabel}`
                }
              >
                {creating ? (
                  <>
                    <Loader2 size={18} className="spin" aria-hidden />
                    <span className="auth-btn-label">Criando…</span>
                  </>
                ) : (
                  <>
                    <Plus size={18} aria-hidden />
                    <span className="auth-btn-label">Criar e iniciar diagnóstico</span>
                    <span className="auth-btn-trail" aria-hidden>
                      <ArrowRight size={18} strokeWidth={2.25} />
                    </span>
                  </>
                )}
              </button>
              {!canCreateMore && (
                <p className="project-select-limit-hint" role="status">
                  Você atingiu o limite de {maxOpenCyclesLabel} no plano {plan?.planName ?? 'Starter'}.{' '}
                  <ViewTransitionLink to="/planos">Faça upgrade</ViewTransitionLink> para criar mais.
                </p>
              )}
            </section>

            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}

            <button type="button" className="project-select-logout" onClick={() => void handleLogout()}>
              <LogOut size={15} aria-hidden />
              Sair da conta
            </button>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
