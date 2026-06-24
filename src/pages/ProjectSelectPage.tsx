import { useState } from 'react';
import { useViewTransitionNavigate } from '../hooks/useViewTransitionNavigate';
import { ArrowRight, FolderKanban, Loader2, LogOut, Plus } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { AuthLayout } from '../components/AuthLayout';
import { useCycle } from '../context/CycleContext';
import type { DiagnosticCycle } from '../services/diagnosticCycles';
import { getCycleWaveFromDoc, getRouteForCycleDoc, resolveCycleEntryRoute, WAVE_STEP_LABELS } from '../services/cycleRouting';
import { clearWorkspaceEntered, hasEnteredWorkspace, markWorkspaceEntered } from '../services/projectWorkspace';

const STATUS_LABELS: Record<DiagnosticCycle['status'], string> = {
  draft: 'Rascunho',
  active: 'Em andamento',
  archived: 'Arquivado',
};

export function ProjectSelectPage() {
  const navigate = useViewTransitionNavigate();
  const { cycles, activeCycle, loading, switching, switchCycle, startNewCycle, refreshCycles } = useCycle();
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  const enterCycle = async (cycle: DiagnosticCycle) => {
    if (enteringId || switching) return;
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
      subtitle="Selecione um ciclo Magnus Waves para continuar"
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
              <p className="project-select-hint">
                Escolha um projeto existente ou crie um novo no final. Ao concluir o diagnóstico você pode
                confirmar ou ajustar o nome.
              </p>

              <ul className="project-select-list" role="listbox" aria-label="Projetos disponíveis">
                {cycles.length === 0 ? (
                  <li className="project-select-empty">Nenhum projeto ainda. Defina o nome abaixo e comece.</li>
                ) : (
                  cycles.map((cycle) => {
                    const step = getCycleWaveFromDoc(cycle);
                    const busy = enteringId === cycle.id;
                    return (
                      <li key={cycle.id}>
                        <button
                          type="button"
                          role="option"
                          className="project-select-item"
                          disabled={Boolean(enteringId) || switching || creating}
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
                      </li>
                    );
                  })
                )}
              </ul>
            </div>

            <section className="project-select-create" aria-labelledby="project-select-create-title">
              <div className="project-select-divider" aria-hidden />
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
                  disabled={creating || Boolean(enteringId)}
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
                disabled={creating || Boolean(enteringId)}
                onClick={() => void handleCreateProject()}
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
