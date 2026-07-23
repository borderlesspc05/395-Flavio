/** Progresso de uma ação do check-list (Execução). */
export type ChecklistProgress = 0 | 25 | 50 | 75 | 100;

export interface DeliveryChecklistItem {
  id: string;
  texto: string;
  /** Marcado como concluído (atalho visual; progresso 100 implica done). */
  done?: boolean;
  responsavel?: string;
  progresso?: ChecklistProgress;
  prazo?: string;
  prioridade?: 'critica' | 'alta' | 'media' | 'baixa';
}

export const CHECKLIST_PROGRESS_OPTIONS: ChecklistProgress[] = [0, 25, 50, 75, 100];

export function newChecklistItemId(): string {
  return `chk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyChecklistItem(): DeliveryChecklistItem {
  return {
    id: newChecklistItemId(),
    texto: '',
    done: false,
    responsavel: '',
    progresso: 0,
    prazo: '',
    prioridade: 'media',
  };
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

/** Converte legado `checklist: string[]` ou itens já estruturados. */
export function normalizeChecklistItems(raw: unknown): DeliveryChecklistItem[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  // Legado: array de strings
  if (typeof raw[0] === 'string') {
    return (raw as string[])
      .map((texto) => String(texto ?? '').trim())
      .filter(Boolean)
      .map((texto) => ({
        id: newChecklistItemId(),
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
      id: typeof row.id === 'string' && row.id ? row.id : `chk-${index}-${newChecklistItemId()}`,
      texto: String(row.texto ?? row.text ?? row.label ?? '').trim(),
      done: done || progresso === 100,
      responsavel: String(row.responsavel ?? '').trim(),
      progresso,
      prazo: String(row.prazo ?? '').trim(),
      prioridade:
        row.prioridade === 'critica' ||
        row.prioridade === 'alta' ||
        row.prioridade === 'media' ||
        row.prioridade === 'baixa'
          ? row.prioridade
          : 'media',
    };
  });
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

/** Média de progresso 0–100 das ações com texto. */
export function averageChecklistProgress(items: DeliveryChecklistItem[]): number | null {
  const filled = items.filter((i) => i.texto.trim());
  if (filled.length === 0) return null;
  const sum = filled.reduce((acc, i) => acc + (i.progresso ?? (i.done ? 100 : 0)), 0);
  return Math.round(sum / filled.length);
}

export type DeliveryStatusTraffic = 'verde' | 'amarelo' | 'vermelho';

/**
 * Status da entrega derivado do check-list (termômetro automático).
 * Usado no ID e no badge da Execução.
 */
export function deriveDeliveryStatusFromChecklist(
  items: DeliveryChecklistItem[],
  deliveryPrazo?: string
): DeliveryStatusTraffic {
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
  if (avg >= 50) return 'amarelo';
  if (avg >= 25) return 'amarelo';
  return 'vermelho';
}

export function statusLabelPt(status: DeliveryStatusTraffic): string {
  if (status === 'verde') return 'No prazo';
  if (status === 'vermelho') return 'Atrasado';
  return 'Atenção';
}

export function daysRemainingLabel(prazo?: string): string | null {
  if (!prazo) return null;
  const d = new Date(prazo);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff > 1) return `${diff} dias restantes`;
  if (diff === 1) return '1 dia restante';
  if (diff === 0) return 'Vence hoje';
  if (diff === -1) return '1 dia atrasado';
  return `${Math.abs(diff)} dias atrasados`;
}

/** Peso 0–100 para o Intelligence Dashboard a partir do check-list. */
export function deliveryProgressWeight(delivery: {
  status?: string;
  prazo?: string;
  checklistItems?: DeliveryChecklistItem[];
  checklist?: string[];
}): number {
  const items = getDeliveryChecklistItems(delivery);
  const filled = items.filter((i) => i.texto.trim());
  if (filled.length > 0) {
    let avg = averageChecklistProgress(filled) ?? 0;
    const now = Date.now();
    const overdue = filled.some((i) => {
      const p = i.progresso ?? 0;
      if (p >= 100 || !i.prazo) return false;
      const d = new Date(i.prazo);
      return !Number.isNaN(d.getTime()) && d.getTime() < now;
    });
    if (overdue && avg < 100) avg = Math.min(avg, 70);
    return avg;
  }

  const status = delivery.status;
  if (status === 'verde') return 100;
  if (status === 'amarelo') return 50;
  if (status === 'vermelho') return 20;
  return 0;
}
