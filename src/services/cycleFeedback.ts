import { getInitialForm, saveInitialFormDraft } from './initialForm';
import { mergeDomainWaveData, parseDomainWaveData } from './domainWaveStorage';
import type { DomainCycleFeedback } from '../types/domainWave';

/** Lê o feedback de fechamento do ciclo salvo no Domínio. */
export async function loadCycleFeedback(userId: string): Promise<DomainCycleFeedback | null> {
  const { data } = await getInitialForm(userId);
  const domain = parseDomainWaveData(data.domainWaveData);
  return domain.cycleFeedback ?? null;
}

/** Persiste o feedback do ciclo dentro de domainWaveData (fonte única do Domínio). */
export async function saveCycleFeedback(
  userId: string,
  feedback: DomainCycleFeedback,
): Promise<void> {
  const { data } = await getInitialForm(userId);
  const merged = mergeDomainWaveData(data, {
    cycleFeedback: {
      ...feedback,
      submittedAt: new Date().toISOString(),
    },
  });
  await saveInitialFormDraft(userId, merged);
}
