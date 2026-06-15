import {
  Activity,
  Bot,
  FileText,
  LucideIcon,
  Target,
  Users,
} from 'lucide-react';
import type { Activity as ActivityItem } from '../types';

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  chat: 'Consultoria IA',
  objective: 'Objetivo',
  team: 'Equipe',
  team_email: 'E-mail equipe',
  action_canvas: 'Action Canvas',
  workspace_reset: 'Reset',
  report: 'Relatório',
};

export function normalizeActivity(raw: Record<string, unknown>): ActivityItem {
  return {
    id: String(raw.id),
    type: String(raw.type ?? raw.tipo ?? 'info'),
    title: String(raw.title ?? raw.descricao ?? 'Atividade'),
    description: raw.description
      ? String(raw.description)
      : raw.descricao
        ? String(raw.descricao)
        : undefined,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    metadata: (raw.metadata as Record<string, unknown>) || undefined,
    relatedId: raw.relatedId
      ? String(raw.relatedId)
      : raw.entidadeId
        ? String(raw.entidadeId)
        : undefined,
  };
}

export function activityTypeIcon(type: string): LucideIcon {
  if (type === 'chat') return Bot;
  if (type === 'objective' || type === 'action_canvas') return Target;
  if (type === 'team' || type === 'team_email') return Users;
  if (type === 'report') return FileText;
  return Activity;
}

export function activityLinkForType(type: string): string | null {
  if (type === 'chat') return '/dashboard/minha-equipe?tab=consultoria';
  if (type === 'objective' || type === 'action_canvas') return '/dashboard/objetivos';
  if (type === 'team' || type === 'team_email') return '/dashboard/minha-equipe';
  if (type === 'report') return '/dashboard/relatorios';
  return null;
}
