import { useEffect, useState } from 'react';
import { useViewTransitionNavigate } from '../hooks/useViewTransitionNavigate';
import {
  ChevronDown,
  Layers,
  Loader2,
  RefreshCw,
  RotateCcw,
  Settings2,
  Trash2,
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useCycle } from '../context/CycleContext';
import {
  clearDiagnosticOnly,
  resetWorkspaceSectors,
  type LoopResetSectors,
} from '../services/workspaceLoop';

type Variant = 'full' | 'compact';

interface LoopWorkspacePanelProps {
  variant?: Variant;
  userId?: string | null;
  onReset?: () => void | Promise<void>;
}

const DEFAULT_SECTORS: LoopResetSectors = {
  objectives: false,
  actionCanvases: false,
  reports: false,
  conversations: false,
  magnusMemory: false,
};

const STATUS_LABELS = {
  active: 'Ativo',
  draft: 'Diagnóstico pendente',
  archived: 'Arquivado',
} as const;

export function LoopWorkspacePanel({ variant = 'full', userId: userIdProp, onReset }: LoopWorkspacePanelProps) {
  const navigate = useViewTransitionNavigate();
  const {
    startNewCycle,
    refreshCycles,
    activeCycle,
    cycles,
    loading: cyclesLoading,
    switching,
    switchCycle,
  } = useCycle();
  const [authUserId, setAuthUserId] = useState<string | null>(auth.currentUser?.uid ?? null);
  const userId = userIdProp ?? authUserId;
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sectors, setSectors] = useState<LoopResetSectors>({ ...DEFAULT_SECTORS });

  useEffect(() => {
    if (userIdProp) return;
    const unsub = onAuthStateChanged(auth, (u) => setAuthUserId(u?.uid ?? null));
    return unsub;
  }, [userIdProp]);

  const toggleSector = (key: keyof LoopResetSectors) => {
    setSectors((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleClearDiagnostic = async () => {
    if (!userId) return;
    if (
      !window.confirm(
        'Limpar o diagnóstico do ciclo ativo? Os ciclos arquivados permanecem na memória da IA.'
      )
    ) {
      return;
    }
    setBusy('clear');
    setMessage(null);
    try {
      await clearDiagnosticOnly(userId);
      setMessage('Diagnóstico limpo. Preencha o canvas para este ciclo.');
      await onReset?.();
    } catch (err) {
      const detail = err instanceof Error ? err.message : '';
      setMessage(detail ? `Não foi possível limpar: ${detail}` : 'Não foi possível limpar o diagnóstico.');
    } finally {
      setBusy(null);
    }
  };

  const handleNewCycle = async () => {
    if (!userId) return;
    const sectorCount = Object.values(sectors).filter(Boolean).length;
    const confirmMsg = `Criar novo ciclo? "${activeCycle?.label ?? 'Ciclo atual'}" será arquivado e um novo diagnóstico será solicitado.${
      sectorCount ? ` ${sectorCount} setor(es) também será(ão) reiniciado(s).` : ''
    }`;
    if (!window.confirm(confirmMsg)) return;

    setBusy('cycle');
    setMessage(null);
    try {
      if (sectorCount) await resetWorkspaceSectors(sectors);
      const result = await startNewCycle();
      if (!result.ok) {
        setMessage(result.message ?? 'Erro ao iniciar novo ciclo.');
        return;
      }
      await refreshCycles();
      setMessage(result.message ?? 'Novo ciclo criado. Vá ao diagnóstico para ativá-lo.');
      await onReset?.();
      navigate('/dashboard/initial-form');
    } catch (err) {
      const detail = err instanceof Error ? err.message : '';
      setMessage(detail ? `Erro: ${detail}` : 'Erro ao iniciar novo ciclo.');
    } finally {
      setBusy(null);
    }
  };

  const handleResetSectors = async () => {
    if (!userId) return;
    const sectorCount = Object.values(sectors).filter(Boolean).length;
    if (!sectorCount) {
      setMessage('Selecione ao menos um setor para reiniciar.');
      return;
    }
    if (!window.confirm(`Reiniciar ${sectorCount} setor(es)? Esta ação não pode ser desfeita.`)) return;

    setBusy('sectors');
    setMessage(null);
    try {
      const removed = await resetWorkspaceSectors(sectors);
      const total = Object.values(removed).reduce((a, b) => a + b, 0);
      setMessage(`Setores reiniciados (${total} registro(s) removido(s)).`);
      await onReset?.();
    } catch {
      setMessage('Erro ao reiniciar setores.');
    } finally {
      setBusy(null);
    }
  };

  const sectorOptions: { key: keyof LoopResetSectors; label: string }[] = [
    { key: 'objectives', label: 'Objetivos' },
    { key: 'actionCanvases', label: 'Action Canvas' },
    { key: 'reports', label: 'Relatórios' },
    { key: 'conversations', label: 'Consultoria IA' },
    { key: 'magnusMemory', label: 'Memória IA' },
  ];

  const isHistorico = variant === 'full';
  const disabled = !!busy || !userId || switching;

  if (isHistorico) {
    return (
      <section className="loop-workspace loop-workspace--full loop-workspace--historico">
        <div className="loop-workspace__intro">
          <span className="loop-workspace__eyebrow">Controle de ciclos</span>
          <h2>Loop & memória da IA</h2>
          <p>
            Selecione o ciclo em que a jornada trabalha. Objetivos, difusão e consultoria usam o ciclo ativo.
          </p>
        </div>

        <div className="loop-workspace__cycle-rail" role="listbox" aria-label="Ciclos de diagnóstico">
          {cyclesLoading ? (
            <div className="loop-workspace__empty-cycles">
              <Loader2 size={18} className="spinning" /> Carregando ciclos…
            </div>
          ) : cycles.length === 0 ? (
            <div className="loop-workspace__empty-cycles">Nenhum ciclo ainda. Crie o primeiro abaixo.</div>
          ) : (
            cycles.map((cycle) => {
              const isActive = cycle.id === activeCycle?.id;
              const date = cycle.archivedAt ?? cycle.createdAt;
              return (
                <button
                  key={cycle.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={`loop-workspace__cycle-card ${isActive ? 'is-active' : ''}`}
                  disabled={switching || busy !== null}
                  onClick={() => void switchCycle(cycle.id)}
                >
                  <strong>{cycle.label}</strong>
                  <span>{new Date(date).toLocaleDateString('pt-BR')}</span>
                  <em
                    className={`loop-workspace__cycle-status loop-workspace__cycle-status--${cycle.status}`}
                  >
                    {STATUS_LABELS[cycle.status]}
                  </em>
                </button>
              );
            })
          )}
        </div>

        <div className="loop-workspace__cta-row">
          <button
            type="button"
            className="loop-workspace__btn loop-workspace__btn--primary"
            disabled={disabled}
            onClick={handleNewCycle}
          >
            {busy === 'cycle' ? <Loader2 size={16} className="spinning" /> : <RotateCcw size={16} />}
            Novo ciclo · novo diagnóstico
          </button>
          <button
            type="button"
            className="loop-workspace__btn loop-workspace__btn--ghost"
            disabled={disabled}
            onClick={handleClearDiagnostic}
          >
            {busy === 'clear' ? <Loader2 size={16} className="spinning" /> : <Trash2 size={16} />}
            Limpar canvas
          </button>
        </div>

        <details className="loop-workspace__advanced">
          <summary className="loop-workspace__advanced-summary">
            <Settings2 size={14} />
            Opções avançadas
            <ChevronDown size={14} style={{ marginLeft: 'auto' }} />
          </summary>
          <div className="loop-workspace__advanced-body">
            <p className="loop-workspace__advanced-hint">
              Ao iniciar um novo ciclo, o ciclo atual é arquivado e o diagnóstico inicial é
              reiniciado automaticamente. Utilize os setores abaixo apenas se desejar limpar também
              os dados de execução.
            </p>
            <fieldset className="loop-workspace__sectors">
              <legend>Reiniciar setores (opcional)</legend>
              <div className="loop-workspace__sector-grid">
                {sectorOptions.map((opt) => (
                  <label key={opt.key} className="loop-workspace__check">
                    <input
                      type="checkbox"
                      checked={sectors[opt.key]}
                      onChange={() => toggleSector(opt.key)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <button
              type="button"
              className="loop-workspace__btn loop-workspace__btn--secondary"
              disabled={disabled}
              onClick={handleResetSectors}
            >
              {busy === 'sectors' ? <Loader2 size={16} className="spinning" /> : <RefreshCw size={16} />}
              Reiniciar setores selecionados
            </button>
          </div>
        </details>

        {message && (
          <p className="loop-workspace__message" role="status">
            {message}
          </p>
        )}
      </section>
    );
  }

  /* compact — diagnóstico sidebar */
  return (
    <section className="loop-workspace loop-workspace--compact">
      <header className="loop-workspace__header">
        <Layers size={18} aria-hidden />
        <div>
          <h2>Loop & refresh</h2>
          <p>Limpe ou inicie novo ciclo para este diagnóstico.</p>
        </div>
      </header>
      <div className="loop-workspace__actions">
        <button
          type="button"
          className="loop-workspace__btn loop-workspace__btn--ghost"
          disabled={disabled}
          onClick={handleClearDiagnostic}
        >
          {busy === 'clear' ? <Loader2 size={16} className="spinning" /> : <Trash2 size={16} />}
          Limpar
        </button>
        <button
          type="button"
          className="loop-workspace__btn loop-workspace__btn--primary"
          disabled={disabled}
          onClick={handleNewCycle}
        >
          {busy === 'cycle' ? <Loader2 size={16} className="spinning" /> : <RotateCcw size={16} />}
          Novo ciclo
        </button>
      </div>
      {message && (
        <p className="loop-workspace__message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
