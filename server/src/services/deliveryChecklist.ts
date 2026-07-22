import { generateId } from '../utils/id';
import type { DeliveryStatus } from '../types';

export type ChecklistProgress = 0 | 25 | 50 | 75 | 100;

export interface DeliveryChecklistItem {
  id: string;
  texto: string;
  done?: boolean;
  responsavel?: string;
  progresso?: ChecklistProgress;
  prazo?: string;
}

function normalizeProgress(value: unknown, done?: boolean): ChecklistProgress {
  if (value === 0 || value === 25 || value === 50 || value === 75 || value === 100) return value;
  if (typeof value === 'string') {
    const n = Number(value.replace('%', '').trim());
    if (n === 0 || n === 25 || n === 50 || n === 75 || n === 100) return n;
  }
  if (done) return 100;
  return 0;
}

export function normalizeChecklistItems(raw: unknown): DeliveryChecklistItem[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  if (typeof raw[0] === 'string') {
    return (raw as string[])
      .map((texto) => String(texto ?? '').trim())
      .filter(Boolean)
      .map((texto) => ({
        id: `chk-${generateId()}`,
        texto,
        done: false,
        responsavel: '',
        progresso: 0 as ChecklistProgress,
        prazo: '',
      }));
  }

  return (raw as unknown[]).slice(0, 20).map((item, index) => {
    const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const done = Boolean(row.done);
    const progresso = normalizeProgress(row.progresso, done);
    return {
      id: typeof row.id === 'string' && row.id ? row.id : `chk-${index}-${generateId()}`,
      texto: String(row.texto ?? row.text ?? row.label ?? '').trim(),
      done: done || progresso === 100,
      responsavel: String(row.responsavel ?? '').trim(),
      progresso,
      prazo: String(row.prazo ?? '').trim(),
    };
  });
}

export function averageChecklistProgress(items: DeliveryChecklistItem[]): number | null {
  const filled = items.filter((i) => i.texto.trim());
  if (filled.length === 0) return null;
  const sum = filled.reduce((acc, i) => acc + (i.progresso ?? (i.done ? 100 : 0)), 0);
  return Math.round(sum / filled.length);
}

export function deriveDeliveryStatusFromChecklist(
  items: DeliveryChecklistItem[],
  deliveryPrazo?: string
): DeliveryStatus {
  const filled = items.filter((i) => i.texto.trim());
  if (filled.length === 0) return 'amarelo';

  const avg = averageChecklistProgress(filled) ?? 0;
  const now = Date.now();
  const overdueItem = filled.some((i) => {
    const p = i.progresso ?? (i.done ? 100 : 0);
    if (p >= 100 || !i.prazo) return false;
    const d = new Date(i.prazo);
    return !Number.isNaN(d.getTime()) && d.getTime() < now;
  });
  const deliveryOverdue =
    Boolean(deliveryPrazo) &&
    (() => {
      const d = new Date(deliveryPrazo!);
      return !Number.isNaN(d.getTime()) && d.getTime() < now && avg < 100;
    })();

  if (overdueItem || deliveryOverdue) return 'vermelho';
  if (avg >= 100) return 'verde';
  if (avg >= 25) return 'amarelo';
  return 'vermelho';
}

export function getDeliveryChecklistItems(delivery: {
  checklistItems?: DeliveryChecklistItem[];
  checklist?: string[];
}): DeliveryChecklistItem[] {
  if (Array.isArray(delivery.checklistItems) && delivery.checklistItems.length > 0) {
    return normalizeChecklistItems(delivery.checklistItems);
  }
  if (Array.isArray(delivery.checklist) && delivery.checklist.length > 0) {
    return normalizeChecklistItems(delivery.checklist);
  }
  return [];
}

export function checklistItemsEqual(
  a?: DeliveryChecklistItem[],
  b?: DeliveryChecklistItem[]
): boolean {
  const aa = a ?? [];
  const bb = b ?? [];
  if (aa.length !== bb.length) return false;
  return aa.every((item, i) => {
    const other = bb[i];
    return (
      item.id === other.id &&
      item.texto === other.texto &&
      item.responsavel === other.responsavel &&
      item.progresso === other.progresso &&
      item.prazo === other.prazo &&
      Boolean(item.done) === Boolean(other.done)
    );
  });
}
