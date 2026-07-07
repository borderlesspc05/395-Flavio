import { useState } from 'react';
import { useCycle } from '../context/CycleContext';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { EvolutionLoopPanel } from '../components/EvolutionLoopPanel';
import { LoopWorkspacePanel } from '../components/LoopWorkspacePanel';
import { History } from 'lucide-react';

export function HistoricoPage() {
  const { activeCycle } = useCycle();
  const [refreshKey, setRefreshKey] = useState(0);

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
              Sprint fecha o ciclo com recomendações da IA. Ciclo ativo:{' '}
              <strong>{activeCycle?.label ?? '—'}</strong> — use o painel abaixo para evoluir ou
              gerencie ciclos na coluna lateral.
            </p>
          </div>
        </div>
      </header>

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
