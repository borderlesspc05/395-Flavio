import type { ActionCanvas, Objective } from '../types';
import type {
  DailyProgressChecklistData,
  DailyProgressHistoryEntry,
  DailyProgressItemConfig,
} from '../types/dailyProgress';
import { DAILY_CHECKLIST_ITEMS, todayIsoDate } from '../types/dailyProgress';

export type DailyProgressStats = {
  todayPercent: number;
  todayDone: number;
  todayTotal: number;
  streakDays: number;
  weekAvgPercent: number;
  lastSevenDays: Array<{ date: string; percent: number }>;
};

export type ProjectPulseHint = {
  id: string;
  label: string;
  value: string;
  tone: 'neutral' | 'good' | 'warn';
};

const HISTORY_CAP = 45;
const STREAK_MIN_DONE = 4;

function percent(done: number, total: number): number {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function upsertTodayHistory(
  data: DailyProgressChecklistData
): DailyProgressChecklistData {
  const today = todayIsoDate();
  const done = data.items.filter((i) => i.checked);
  const entry: DailyProgressHistoryEntry = {
    date: today,
    completedCount: done.length,
    totalCount: data.items.length,
    completedIds: done.map((i) => i.id),
    notes: data.dailyNotes.trim(),
  };

  const rest = (data.history ?? []).filter((h) => h.date !== today);
  const history = [entry, ...rest]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, HISTORY_CAP);

  return { ...data, history, lastUpdatedDate: today };
}

export function computeDailyProgressStats(
  data: DailyProgressChecklistData
): DailyProgressStats {
  const today = todayIsoDate();
  const todayDone = data.items.filter((i) => i.checked).length;
  const todayTotal = data.items.length;
  const todayPercent = percent(todayDone, todayTotal);

  const history = data.history ?? [];
  const byDate = new Map(history.map((h) => [h.date, h]));

  const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = isoDaysAgo(6 - index);
    const row = byDate.get(date);
    const p = row ? percent(row.completedCount, row.totalCount) : date === today ? todayPercent : 0;
    return { date, percent: p };
  });

  const weekAvgPercent = Math.round(
    lastSevenDays.reduce((sum, row) => sum + row.percent, 0) / lastSevenDays.length
  );

  let streakDays = 0;
  for (let offset = 0; offset < 30; offset += 1) {
    const date = isoDaysAgo(offset);
    const row = date === today
      ? { completedCount: todayDone, totalCount: todayTotal }
      : byDate.get(date);
    if (!row) break;
    if (row.completedCount < STREAK_MIN_DONE && row.completedCount < row.totalCount) break;
    streakDays += 1;
  }

  return {
    todayPercent,
    todayDone,
    todayTotal,
    streakDays,
    weekAvgPercent,
    lastSevenDays,
  };
}

export function buildProjectPulseHints(
  canvases: ActionCanvas[],
  objectives: Objective[]
): ProjectPulseHint[] {
  const deliveries = canvases.flatMap((c) => c.entregas.filter((e) => e.entrega?.trim()));
  const green = deliveries.filter((e) => e.status === 'verde').length;
  const yellow = deliveries.filter((e) => e.status === 'vermelho' || e.status === 'amarelo').length;
  const objDone = objectives.filter((o) => o.status === 'concluido').length;
  const objActive = objectives.filter((o) => o.status === 'em_andamento').length;

  return [
    {
      id: 'deliveries',
      label: 'Entregas no canvas',
      value: deliveries.length ? `${green} no ritmo · ${yellow} atenção` : 'Nenhuma entrega ainda',
      tone: deliveries.length === 0 ? 'neutral' : yellow > green ? 'warn' : 'good',
    },
    {
      id: 'evidence',
      label: 'Evidências registradas',
      value: `${deliveries.filter((e) => e.evidencia?.trim()).length} de ${deliveries.length || 0}`,
      tone: deliveries.some((e) => !e.evidencia?.trim()) ? 'warn' : 'good',
    },
    {
      id: 'objectives',
      label: 'Objetivos estratégicos',
      value: objectives.length
        ? `${objDone} concluídos · ${objActive} em andamento`
        : 'Crie objetivos na Difusão',
      tone: objectives.length ? 'good' : 'neutral',
    },
    {
      id: 'align',
      label: 'Planos de ação',
      value: `${canvases.length} canvas ativo${canvases.length === 1 ? '' : 's'}`,
      tone: canvases.length ? 'good' : 'warn',
    },
  ];
}

export function getItemConfig(id: string): DailyProgressItemConfig | undefined {
  return DAILY_CHECKLIST_ITEMS.find((item) => item.id === id);
}
