import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useCycle } from '../context/CycleContext';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { CycleCloseOut } from '../components/CycleCloseOut';
import { EvolutionLoopPanel } from '../components/EvolutionLoopPanel';
import { LoopWorkspacePanel } from '../components/LoopWorkspacePanel';
import { History } from 'lucide-react';

export function HistoricoPage() {
  const location = useLocation();
  const { activeCycle } = useCycle();
  const [refreshKey, setRefreshKey] = useState(0);
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
            <h1 className="historico-title">Loop contínuo · Evolution Loop</h1>
            <p className="historico-subtitle">
              O ciclo se fecha aqui: avalie o que viveu, veja as recomendações da IA e decida o
              próximo movimento. Ciclo ativo: <strong>{activeCycle?.label ?? '—'}</strong>.
            </p>
          </div>
        </div>
      </header>

      <CycleCloseOut highlight={cycleClosed} />

      <EvolutionLoopPanel onWaveCreated={() => setRefreshKey((k) => k + 1)} />

      <div className="historico-layout">
        <aside className="historico-loop-column" aria-label="Controle de ciclos">
          <LoopWorkspacePanel variant="full" onReset={() => setRefreshKey((k) => k + 1)} />
        </aside>

        <ActivityTimeline
          className="historico-feed-column"
          title="Linha do tempo"
          showFilters
          refreshKey={refreshKey}
        />
      </div>
    </div>
  );
}
