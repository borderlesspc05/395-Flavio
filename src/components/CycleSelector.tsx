import { useState } from 'react';
import { ChevronDown, FolderKanban, Layers, Loader2, Plus } from 'lucide-react';
import { useViewTransitionNavigate } from '../hooks/useViewTransitionNavigate';
import { useCycle } from '../context/CycleContext';

export function CycleSelector() {
  const navigate = useViewTransitionNavigate();
  const { cycles, activeCycle, loading, switching, needsDiagnosis, switchCycle, startNewCycle } =
    useCycle();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSwitch = async (cycleId: string) => {
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
        navigate('/dashboard/initial-form');
      } else if (result.message) {
        window.alert(result.message);
      }
    } finally {
      setBusy(false);
      setOpen(false);
    }
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
        <Layers size={16} aria-hidden />
        <span className="cycle-selector__label">
          {activeCycle?.label ?? 'Ciclo'}
          {needsDiagnosis && <em className="cycle-selector__badge">diagnóstico pendente</em>}
        </span>
        {switching || busy ? (
          <Loader2 size={14} className="spinning" />
        ) : (
          <ChevronDown size={14} aria-hidden />
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="cycle-selector__backdrop"
            aria-label="Fechar seleção de ciclo"
            onClick={() => setOpen(false)}
          />
          <div className="cycle-selector__menu" role="listbox" aria-label="Ciclos de diagnóstico">
            {cycles.map((cycle) => (
              <button
                key={cycle.id}
                type="button"
                role="option"
                aria-selected={cycle.id === activeCycle?.id}
                className={`cycle-selector__option ${cycle.id === activeCycle?.id ? 'is-active' : ''}`}
                onClick={() => handleSwitch(cycle.id)}
              >
                <span className="cycle-selector__option-title">{cycle.label}</span>
                <span className={`cycle-selector__status cycle-selector__status--${cycle.status}`}>
                  {cycle.status === 'archived'
                    ? 'Arquivado'
                    : cycle.status === 'draft'
                      ? 'Rascunho'
                      : 'Ativo'}
                </span>
              </button>
            ))}
            <button
              type="button"
              className="cycle-selector__hub"
              onClick={() => {
                setOpen(false);
                navigate('/escolher-projeto');
              }}
            >
              <FolderKanban size={14} />
              Escolher projeto
            </button>
            <button type="button" className="cycle-selector__new" onClick={handleNewCycle} disabled={busy}>
              <Plus size={14} />
              Novo ciclo
            </button>
          </div>
        </>
      )}
    </div>
  );
}
