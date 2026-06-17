import { Brain, CheckCircle2, Circle, ClipboardList } from 'lucide-react';
import type { MagnusWavesMemoryMeta } from '../services/magnusWavesMemory';

interface MagnusMemoryBannerProps {
  meta: MagnusWavesMemoryMeta | null;
  statusLabel?: string;
  loading?: boolean;
  compact?: boolean;
  /** Só chips em linha — sem título nem caixa pesada */
  minimal?: boolean;
}

export function MagnusMemoryBanner({ meta, statusLabel, loading, compact, minimal }: MagnusMemoryBannerProps) {
  if (loading) {
    return (
      <div className="magnus-memory-banner magnus-memory-banner--loading" aria-busy="true">
        <Brain size={18} />
        <span>Carregando memória da IA…</span>
      </div>
    );
  }

  if (!meta) return null;

  const chips = [
    {
      ok: meta.diagnosticComplete,
      label: meta.diagnosticComplete ? 'Diagnóstico na memória' : 'Diagnóstico pendente',
      icon: meta.diagnosticComplete ? CheckCircle2 : Circle,
    },
    {
      ok: meta.hasGate,
      label: meta.hasGate ? 'Caminho definido' : 'Caminho pendente',
      icon: meta.hasGate ? CheckCircle2 : Circle,
    },
    {
      ok: meta.actionCanvasClosed > 0,
      label:
        meta.actionCanvasClosed > 0
          ? `${meta.actionCanvasClosed} canvas encerrado${meta.actionCanvasClosed > 1 ? 's' : ''}`
          : meta.actionCanvasTotal > 0
            ? `${meta.actionCanvasTotal} canvas em andamento`
            : 'Action Canvas',
      icon: ClipboardList,
    },
  ];

  if (minimal) {
    return (
      <div className="magnus-memory-banner magnus-memory-banner--minimal" role="list" aria-label="Contexto na memória">
        {chips.map((chip) => {
          const Icon = chip.icon;
          return (
            <span
              key={chip.label}
              role="listitem"
              className={`magnus-memory-chip ${chip.ok ? 'is-on' : 'is-off'}`}
              title={chip.label}
            >
              <Icon size={12} aria-hidden />
              <span className="magnus-memory-chip-label">{chip.label}</span>
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`magnus-memory-banner ${compact ? 'magnus-memory-banner--compact' : ''}`}>
      <div className="magnus-memory-banner-head">
        <Brain size={18} aria-hidden />
        <div>
          <strong>Memória Magnus Waves</strong>
          {!compact && statusLabel && <p>{statusLabel}</p>}
        </div>
      </div>
      <div className="magnus-memory-chips" role="list">
        {chips.map((chip) => {
          const Icon = chip.icon;
          return (
            <span
              key={chip.label}
              role="listitem"
              className={`magnus-memory-chip ${chip.ok ? 'is-on' : 'is-off'}`}
            >
              <Icon size={14} aria-hidden />
              {chip.label}
            </span>
          );
        })}
      </div>
      {!compact && (
        <p className="magnus-memory-hint">
          A Consultoria IA e as sugestões usam diagnóstico, escolha de caminho e Action Canvas como contexto contínuo.
        </p>
      )}
    </div>
  );
}
