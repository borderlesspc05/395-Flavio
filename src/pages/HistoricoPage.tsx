import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { History } from 'lucide-react';
import { useCycle } from '../context/CycleContext';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { CycleCloseOut } from '../components/CycleCloseOut';
import { EvolutionLoopPanel } from '../components/EvolutionLoopPanel';
import { LoopWorkspacePanel } from '../components/LoopWorkspacePanel';
import { PhaseInfoButton } from '../components/ui/PhaseInfoButton';
import { Modal } from '../components/ui/Modal';

export function HistoricoPage() {
  const location = useLocation();
  const { activeCycle } = useCycle();
  const [refreshKey, setRefreshKey] = useState(0);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const cycleClosed = Boolean((location.state as { cycleClosed?: boolean } | null)?.cycleClosed);

  useEffect(() => {
    if (cycleClosed) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [cycleClosed]);

  return (
    <div className="historico-page historico-page--refined">
      <header className="historico-header">
        <div className="historico-header-content">
          <div className="historico-icon-wrapper">
            <History size={28} aria-hidden />
          </div>
          <div>
            <div className="design-plans-title-row">
              <h1 className="historico-title">Loop contínuo</h1>
              <PhaseInfoButton title="Sobre o Loop contínuo">
                <p>
                  Aqui o ciclo se fecha: avalie o que viveu, veja as recomendações da plataforma e
                  decida o próximo movimento.
                </p>
                <ul>
                  <li>
                    <strong>Avaliação</strong> — o que funcionou e o que não
                  </li>
                  <li>
                    <strong>Insights</strong> — podem virar cards herdados no Design
                  </li>
                  <li>
                    <strong>Novo ciclo</strong> — escolha diagnóstico completo ou focado no hub de
                    Scans
                  </li>
                </ul>
              </PhaseInfoButton>
            </div>
            <p className="historico-subtitle">
              Avalie o ciclo com a plataforma, capture aprendizados e inicie o próximo movimento.
              Ciclo ativo: <strong>{activeCycle?.label ?? '—'}</strong>.
            </p>
          </div>
        </div>
      </header>

      <CycleCloseOut highlight={cycleClosed} />

      <EvolutionLoopPanel onWaveCreated={() => setRefreshKey((k) => k + 1)} />

      <div className="historico-loop-actions">
        <button type="button" className="phase-info-close" onClick={() => setWorkspaceOpen(true)}>
          Gerenciar ciclos
        </button>
        <button
          type="button"
          className="phase-info-close is-ghost"
          onClick={() => setTimelineOpen(true)}
        >
          Ver linha do tempo
        </button>
      </div>

      <Modal open={workspaceOpen} onClose={() => setWorkspaceOpen(false)} title="Gerenciar ciclos">
        <LoopWorkspacePanel variant="full" onReset={() => setRefreshKey((k) => k + 1)} />
      </Modal>

      <Modal open={timelineOpen} onClose={() => setTimelineOpen(false)} title="Linha do tempo">
        <ActivityTimeline
          className="historico-feed-column"
          title="Linha do tempo"
          showFilters
          refreshKey={refreshKey}
        />
      </Modal>
    </div>
  );
}
