import type { InitialFormData } from '../types';

export type EvolutionBand = 'attention' | 'evolving' | 'mature';

export interface EvolutionIndexResult {
  score: number;
  band: EvolutionBand;
  label: string;
}

function parseScore(value: unknown): number | null {
  if (typeof value === 'number' && !Number.isNaN(value)) return Math.min(100, Math.max(0, value));
  if (typeof value === 'string') {
    const n = parseInt(value.replace(/\D/g, ''), 10);
    if (!Number.isNaN(n)) return Math.min(100, Math.max(0, n));
  }
  return null;
}

export function getEvolutionBand(score: number): EvolutionIndexResult['band'] {
  if (score >= 80) return 'mature';
  if (score >= 60) return 'evolving';
  return 'attention';
}

export function getEvolutionLabel(band: EvolutionBand): string {
  switch (band) {
    case 'mature':
      return 'Alta Maturidade';
    case 'evolving':
      return 'Evoluindo';
    default:
      return 'Atenção';
  }
}

/** Índice 0–100 a partir dos scorecards consolidados do diagnóstico (1.5). */
export function computeEvolutionIndex(data: InitialFormData): EvolutionIndexResult | null {
  const transfer = parseScore(data.transferReadinessScore);
  const learning = parseScore(data.learningEffectivenessScore);
  const contextFriction = parseScore(data.contextFrictionScore);
  const systemFriction = parseScore(data.systemFrictionScore);
  const management = parseScore(data.managementEnablementScore);
  const talent = parseScore(data.talentEntryQualityScore);

  const samples: number[] = [];
  if (transfer != null) samples.push(transfer);
  if (learning != null) samples.push(learning);
  if (management != null) samples.push(management);
  if (talent != null) samples.push(talent);
  if (contextFriction != null) samples.push(100 - contextFriction);
  if (systemFriction != null) samples.push(100 - systemFriction);

  if (samples.length === 0) return null;

  const score = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
  const band = getEvolutionBand(score);
  return { score, band, label: getEvolutionLabel(band) };
}
