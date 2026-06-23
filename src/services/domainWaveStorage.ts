import type { DiagnosticFieldValue, InitialFormData } from '../types';
import {
  createEmptyDomainWaveData,
  type DomainWaveData,
} from '../types/domainWave';

export const DOMAIN_WAVE_DATA_KEY = 'domainWaveData';

export function parseDomainWaveData(raw: DiagnosticFieldValue | undefined): DomainWaveData {
  const empty = createEmptyDomainWaveData();
  if (!raw || typeof raw !== 'string' || !raw.trim()) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<DomainWaveData>;
    return {
      ...empty,
      ...parsed,
      impactByPlanId: { ...empty.impactByPlanId, ...parsed.impactByPlanId },
      learning: { ...empty.learning, ...parsed.learning },
      sustainability: { ...empty.sustainability, ...parsed.sustainability },
    };
  } catch {
    return empty;
  }
}

export function serializeDomainWaveData(data: DomainWaveData): string {
  return JSON.stringify({ ...data, updatedAt: new Date().toISOString() });
}

/** Compara conteúdo editável (ignora updatedAt). */
export function domainWaveDataEquals(a: DomainWaveData, b: DomainWaveData): boolean {
  const strip = (d: DomainWaveData) => {
    const { updatedAt: _u, ...rest } = d;
    return rest;
  };
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
}

export function mergeDomainWaveData(formData: InitialFormData, patch: Partial<DomainWaveData>): InitialFormData {
  const current = parseDomainWaveData(formData[DOMAIN_WAVE_DATA_KEY]);
  const next: DomainWaveData = {
    ...current,
    ...patch,
    impactByPlanId: patch.impactByPlanId ?? current.impactByPlanId,
    learning: patch.learning ? { ...current.learning, ...patch.learning } : current.learning,
    sustainability: patch.sustainability
      ? { ...current.sustainability, ...patch.sustainability }
      : current.sustainability,
    updatedAt: new Date().toISOString(),
  };

  if (domainWaveDataEquals(current, next)) {
    return formData;
  }

  return {
    ...formData,
    [DOMAIN_WAVE_DATA_KEY]: serializeDomainWaveData(next),
  };
}
