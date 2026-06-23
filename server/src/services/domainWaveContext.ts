import { getFirestore, isFirebaseEnabled } from './firebase';

const IMPACT_LABELS: Record<number, string> = {
  1: 'Muito abaixo do esperado',
  2: 'Abaixo do esperado',
  3: 'Conforme esperado',
  4: 'Acima do esperado',
  5: 'Muito acima do esperado',
};

interface DomainWaveRaw {
  learning?: {
    workedWell?: string;
    didNotWork?: string;
    wouldDoDifferently?: string;
    biggestSurprise?: string;
    practiceToReplicate?: string;
    aiTopLearnings?: string[];
  };
  impactByPlanId?: Record<string, { impactRating?: number | null; evidence?: string }>;
  sustainability?: Record<string, number | null>;
}

export async function loadDomainWaveReportContext(userId: string): Promise<string> {
  if (!isFirebaseEnabled()) return '';

  const db = getFirestore();
  if (!db) return '';

  try {
    const snap = await db.collection('initialForms').doc(userId).get();
    const raw = snap.data()?.domainWaveData;
    if (!raw || typeof raw !== 'string' || !raw.trim()) return '';

    const data = JSON.parse(raw) as DomainWaveRaw;
    const lines: string[] = ['## Onda 4 — Domínio (dados registrados pelo usuário)'];

    const learning = data.learning;
    if (learning) {
      const fields: [string, string | undefined][] = [
        ['O que funcionou bem', learning.workedWell],
        ['O que não funcionou', learning.didNotWork],
        ['O que faríamos diferente', learning.wouldDoDifferently],
        ['Maior surpresa', learning.biggestSurprise],
        ['Prática a replicar', learning.practiceToReplicate],
      ];
      for (const [label, value] of fields) {
        if (value?.trim()) lines.push(`- ${label}: ${value.trim()}`);
      }
      if (learning.aiTopLearnings?.length) {
        lines.push('', 'Top aprendizados (IA):');
        learning.aiTopLearnings.forEach((item, i) => lines.push(`${i + 1}. ${item}`));
      }
    }

    const impacts = data.impactByPlanId ?? {};
    const impactEntries = Object.entries(impacts).filter(
      ([, v]) => v.impactRating != null || v.evidence?.trim(),
    );
    if (impactEntries.length > 0) {
      lines.push('', 'Avaliações de impacto por plano:');
      for (const [planId, impact] of impactEntries) {
        const rating =
          impact.impactRating != null
            ? IMPACT_LABELS[impact.impactRating] ?? String(impact.impactRating)
            : 'não avaliado';
        lines.push(`- Plano ${planId}: impacto ${rating}`);
        if (impact.evidence?.trim()) lines.push(`  Evidência: ${impact.evidence.trim()}`);
      }
    }

    const sustain = data.sustainability;
    if (sustain) {
      const values = Object.values(sustain).filter((v): v is number => typeof v === 'number');
      if (values.length > 0) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        lines.push('', `Radar de sustentação: média ${avg.toFixed(1)}/5 (${values.length} critérios)`);
      }
    }

    return lines.length > 1 ? lines.join('\n') : '';
  } catch (err) {
    console.warn('[domainWaveContext] read failed:', err);
    return '';
  }
}
