import type { DiagnosticFieldValue, InitialFormData } from '../types';
import {
  createEmptyDailyProgressChecklist,
  DAILY_PROGRESS_CHECKLIST_KEY,
  DAILY_CHECKLIST_ITEMS,
  type DailyProgressChecklistData,
  todayIsoDate,
} from '../types/dailyProgress';
import { upsertTodayHistory } from './dailyProgressStats';

export { DAILY_PROGRESS_CHECKLIST_KEY };

export function parseDailyProgressChecklist(
  raw: DiagnosticFieldValue | undefined
): DailyProgressChecklistData {
  const empty = createEmptyDailyProgressChecklist();
  if (!raw || typeof raw !== 'string' || !raw.trim()) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<DailyProgressChecklistData>;
    const today = todayIsoDate();

    const parsedItems = Array.isArray(parsed.items) ? parsed.items : [];
    const mergedItems = DAILY_CHECKLIST_ITEMS.map((config) => {
      const saved = parsedItems.find((item) => item.id === config.id);
      return {
        id: config.id,
        label: config.label,
        checked: Boolean(saved?.checked),
      };
    });

    const lastDate = typeof parsed.lastUpdatedDate === 'string' ? parsed.lastUpdatedDate : today;
    const resetItems =
      lastDate !== today ? mergedItems.map((item) => ({ ...item, checked: false })) : mergedItems;

    const history = Array.isArray(parsed.history)
      ? parsed.history
          .filter((row) => row && typeof row.date === 'string')
          .map((row) => ({
            date: String(row.date),
            completedCount: Number(row.completedCount ?? 0),
            totalCount: Number(row.totalCount ?? DAILY_CHECKLIST_ITEMS.length),
            completedIds: Array.isArray(row.completedIds) ? row.completedIds.map(String) : [],
            notes: String(row.notes ?? ''),
          }))
      : [];

    return {
      items: resetItems,
      dailyNotes: lastDate !== today ? '' : String(parsed.dailyNotes ?? ''),
      lastUpdatedDate: today,
      history,
    };
  } catch {
    return empty;
  }
}

export function serializeDailyProgressChecklist(data: DailyProgressChecklistData): string {
  return JSON.stringify({
    ...data,
    lastUpdatedDate: todayIsoDate(),
  });
}

export function mergeDailyProgressChecklist(
  formData: InitialFormData,
  patch: Partial<DailyProgressChecklistData>
): InitialFormData {
  const current = parseDailyProgressChecklist(formData[DAILY_PROGRESS_CHECKLIST_KEY]);
  const merged: DailyProgressChecklistData = {
    ...current,
    ...patch,
    items: patch.items ?? current.items,
    history: patch.history ?? current.history,
    lastUpdatedDate: todayIsoDate(),
  };
  const withHistory = upsertTodayHistory(merged);
  return {
    ...formData,
    [DAILY_PROGRESS_CHECKLIST_KEY]: serializeDailyProgressChecklist(withHistory),
  };
}
