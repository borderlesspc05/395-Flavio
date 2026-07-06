import { useState } from 'react';
import { ChevronDown, FolderKanban, Layers, Loader2, Plus, Trash2 } from 'lucide-react';
import { useViewTransitionNavigate } from '../hooks/useViewTransitionNavigate';
import { ViewTransitionLink } from './navigation/ViewTransitionLink';
import { usePlan } from '../context/PlanContext';
import { canCreateMoreCycles, formatCycleUsage } from '../utils/cycleLimits';
import { useCycle } from '../context/CycleContext';

export function CycleSelector() {
  const navigate = useViewTransitionNavigate();
  const {
    cycles,
    activeCycle,
    loading,
    switching,
    needsDiagnosis,
    switchCycle,
    startNewCycle,
    deleteCycle,
  } = useCycle();
  const { maxOpenCycles, maxOpenCyclesLabel, plan } = usePlan();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canCreateMore = canCreateMoreCycles(cycles, maxOpenCycles);
  const usageLabel = formatCycleUsage(cycles.length, maxOpenCycles);

  const handleSwitch = async (cycleId: string) => {
    if (confirmDeleteId || deletingId) return;
    setOpen(false);
    await switchCycle(cycleId);
  };

  const handleNewCycle = async () => {
    if (
      !window.confirm(
        'Criar novo ciclo? O diagnóstico atual será arquivado e você precisará preencher um novo diagnóstico.'
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const result = await startNewCycle();
      if (result.ok) {
        navigate('/dashboard/scans');
      } else if (result.message) {
        window.alert(result.message);
      }
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const handleDelete = async (cycleId: string) => {
    setDeletingId(cycleId);
    setBusy(true);
    try {
      const result = await deleteCycle(cycleId);
      if (!result.ok && result.message) {
        window.alert(result.message);
      }
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
      setBusy(false);
    }
  };

  const requestDelete = (cycleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(cycleId);
  };

  if (loading && !activeCycle) {
    return (
      <div className="cycle-selector cycle-selector--loading" aria-label="Carregando ciclos">
        <Loader2 size={16} className="spinning" />
      </div>
    );
  }

  return (
    <div className={`cycle-selector ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="cycle-selector__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Layers size={16} aria-hidden className="cycle-selector__trigger-icon" />
        <span className="cycle-selector__trigger-copy">
          <span className="cycle-selector__label">{activeCycle?.label ?? 'Ciclo'}</span>
          {needsDiagnosis && (
            <span className="cycle-selector__badge">Diagnóstico pendente</span>
          )}
        </span>
        {switching || busy ? (
          <Loader2 size={14} className="spinning" aria-hidden />
        ) : (
          <ChevronDown size={14} aria-hidden className="cycle-selector__chevron" />
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="cycle-selector__backdrop"
            aria-label="Fechar seleção de ciclo"
            onClick={() => {
              setOpen(false);
              setConfirmDeleteId(null);
            }}
          />
          <div className="cycle-selector__menu" role="listbox" aria-label="Ciclos de diagnóstico">
            <div className="cycle-selector__menu-head">
              <span className="cycle-selector__menu-title">Processos</span>
              <span className="cycle-selector__menu-usage">{usageLabel}</span>
            </div>

            {cycles.length === 0 ? (
              <p className="cycle-selector__empty">Nenhum processo ainda.</p>
            ) : (
              cycles.map((cycle) => {
                const isConfirming = confirmDeleteId === cycle.id;
                const isDeleting = deletingId === cycle.id;

                if (isConfirming) {
                  return (
                    <div
                      key={cycle.id}
                      className="cycle-selector__confirm"
                      role="alertdialog"
                      aria-labelledby={`cycle-delete-title-${cycle.id}`}
                    >
                      <p id={`cycle-delete-title-${cycle.id}`} className="cycle-selector__confirm-text">
                        Excluir <strong>{cycle.label}</strong>? Os dados deste processo serão removidos
                        permanentemente.
                      </p>
                      <div className="cycle-selector__confirm-actions">
                        <button
                          type="button"
                          className="cycle-selector__confirm-cancel"
                          disabled={isDeleting}
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="cycle-selector__confirm-delete"
                          disabled={isDeleting}
                          onClick={() => void handleDelete(cycle.id)}
                        >
                          {isDeleting ? (
                            <>
                              <Loader2 size={13} className="spinning" aria-hidden />
                              Excluindo…
                            </>
                          ) : (
                            'Excluir'
                          )}
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={cycle.id}
                    className={`cycle-selector__row ${cycle.id === activeCycle?.id ? 'is-active' : ''}`}
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={cycle.id === activeCycle?.id}
                      className="cycle-selector__option"
                      disabled={Boolean(deletingId) || switching}
                      onClick={() => void handleSwitch(cycle.id)}
                    >
                      <span className="cycle-selector__option-copy">
                        <span className="cycle-selector__option-title">{cycle.label}</span>
                        <span className={`cycle-selector__status cycle-selector__status--${cycle.status}`}>
                          {cycle.status === 'archived'
                            ? 'Arquivado'
                            : cycle.status === 'draft'
                              ? 'Rascunho'
                              : 'Ativo'}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="cycle-selector__delete"
                      aria-label={`Excluir ${cycle.label}`}
                      disabled={Boolean(deletingId) || switching || busy}
                      onClick={(e) => requestDelete(cycle.id, e)}
                    >
                      <Trash2 size={14} aria-hidden />
                    </button>
                  </div>
                );
              })
            )}

            <button
              type="button"
              className="cycle-selector__hub"
              onClick={() => {
                setOpen(false);
                setConfirmDeleteId(null);
                navigate('/escolher-projeto', { state: { fromDashboard: true } });
              }}
            >
              <FolderKanban size={14} aria-hidden />
              Gerenciar projetos
            </button>
            <button
              type="button"
              className="cycle-selector__new"
              onClick={() => void handleNewCycle()}
              disabled={busy || !canCreateMore}
              title={
                canCreateMore
                  ? 'Criar novo ciclo'
                  : `${maxOpenCyclesLabel} no plano ${plan?.planName ?? 'Starter'}`
              }
            >
              <Plus size={14} aria-hidden />
              Novo ciclo
            </button>
            {!canCreateMore && (
              <p className="cycle-selector__limit-hint">
                Limite do plano: {maxOpenCyclesLabel}.{' '}
                <ViewTransitionLink to="/planos">Faça upgrade</ViewTransitionLink>.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
