import { getFirestore } from './firebase';

type CountRow = { label: string; count: number };

function bump(map: Map<string, number>, label: string, delta = 1) {
  const key = label.trim();
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + delta);
}

function bumpMulti(map: Map<string, number>, value: unknown) {
  if (Array.isArray(value)) {
    for (const item of value) bump(map, String(item));
    return;
  }
  if (typeof value === 'string' && value.includes(',')) {
    for (const part of value.split(',')) bump(map, part);
    return;
  }
  if (value != null && String(value).trim()) bump(map, String(value));
}

function mapToSortedRows(map: Map<string, number>, limit = 12): CountRow[] {
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR'))
    .slice(0, limit);
}

function truncate(text: string, max = 160): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export interface AdminClientAnalytics {
  diagnostics: {
    formsTotal: number;
    formsCompleted: number;
    formsWithChallenge: number;
    cyclesTotal: number;
    cyclesActive: number;
    cyclesArchived: number;
    gatePathA: number;
    gatePathB: number;
    gateSkipped: number;
  };
  businessStages: CountRow[];
  challengeCategories: CountRow[];
  problemNature: CountRow[];
  recentChallenges: Array<{
    userId: string;
    organization?: string;
    stage?: string;
    challenge: string;
    categories: string[];
    updatedAt?: string;
  }>;
}

export async function getAdminClientAnalytics(): Promise<AdminClientAnalytics> {
  const empty: AdminClientAnalytics = {
    diagnostics: {
      formsTotal: 0,
      formsCompleted: 0,
      formsWithChallenge: 0,
      cyclesTotal: 0,
      cyclesActive: 0,
      cyclesArchived: 0,
      gatePathA: 0,
      gatePathB: 0,
      gateSkipped: 0,
    },
    businessStages: [],
    challengeCategories: [],
    problemNature: [],
    recentChallenges: [],
  };

  const db = getFirestore();
  if (!db) return empty;

  const stageMap = new Map<string, number>();
  const categoryMap = new Map<string, number>();
  const natureMap = new Map<string, number>();
  const recentChallenges: AdminClientAnalytics['recentChallenges'] = [];

  let formsTotal = 0;
  let formsCompleted = 0;
  let formsWithChallenge = 0;

  try {
    const formsSnap = await db.collection('initialForms').limit(500).get();
    formsTotal = formsSnap.size;

    for (const doc of formsSnap.docs) {
      const data = doc.data() as Record<string, unknown>;
      if (data.completedAt) formsCompleted += 1;

      if (data.estagioNegocio) bump(stageMap, String(data.estagioNegocio));
      bumpMulti(categoryMap, data.desafioRelacionadoA);
      bumpMulti(natureMap, data.problemaPareceMaisDe);

      const challenge = String(data.desafioPrincipal ?? '').trim();
      if (challenge) {
        formsWithChallenge += 1;
        const categories = Array.isArray(data.desafioRelacionadoA)
          ? data.desafioRelacionadoA.map(String)
          : String(data.desafioRelacionadoA ?? '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);

        recentChallenges.push({
          userId: doc.id,
          organization: String(data.organizacao ?? '').trim() || undefined,
          stage: String(data.estagioNegocio ?? '').trim() || undefined,
          challenge: truncate(challenge),
          categories,
          updatedAt:
            (typeof data.draftUpdatedAt === 'string' && data.draftUpdatedAt) ||
            (typeof data.completedAt === 'string' && data.completedAt) ||
            undefined,
        });
      }
    }
  } catch (err) {
    console.warn('[adminAnalytics] initialForms read failed:', err);
  }

  recentChallenges.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));

  let cyclesTotal = 0;
  let cyclesActive = 0;
  let cyclesArchived = 0;

  try {
    const cyclesSnap = await db.collection('diagnosticCycles').limit(500).get();
    cyclesTotal = cyclesSnap.size;
    for (const doc of cyclesSnap.docs) {
      const status = String((doc.data() as { status?: string }).status ?? '');
      if (status === 'active') cyclesActive += 1;
      if (status === 'archived') cyclesArchived += 1;
    }
  } catch (err) {
    console.warn('[adminAnalytics] diagnosticCycles read failed:', err);
  }

  let gatePathA = 0;
  let gatePathB = 0;
  let gateSkipped = 0;

  try {
    const gateSnap = await db.collection('blueprintGate').limit(500).get();
    for (const doc of gateSnap.docs) {
      const data = doc.data() as {
        selectedPath?: string;
        aiRecommendedPath?: string;
        skipped?: boolean;
      };
      if (data.skipped) {
        gateSkipped += 1;
        continue;
      }
      const path = data.selectedPath ?? data.aiRecommendedPath;
      if (path === 'A') gatePathA += 1;
      if (path === 'B') gatePathB += 1;
    }
  } catch (err) {
    console.warn('[adminAnalytics] blueprintGate read failed:', err);
  }

  return {
    diagnostics: {
      formsTotal,
      formsCompleted,
      formsWithChallenge,
      cyclesTotal,
      cyclesActive,
      cyclesArchived,
      gatePathA,
      gatePathB,
      gateSkipped,
    },
    businessStages: mapToSortedRows(stageMap),
    challengeCategories: mapToSortedRows(categoryMap),
    problemNature: mapToSortedRows(natureMap),
    recentChallenges: recentChallenges.slice(0, 25),
  };
}
