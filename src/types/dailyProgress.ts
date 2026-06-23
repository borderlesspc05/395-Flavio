export const DAILY_PROGRESS_CHECKLIST_KEY = 'dailyProgressChecklistJson';

export type DailyProgressWave = 'design' | 'difusao' | 'dominio' | 'geral';

export type DailyProgressItem = {
  id: string;
  label: string;
  checked: boolean;
};

export type DailyProgressItemConfig = {
  id: string;
  label: string;
  description: string;
  route: string;
  wave: DailyProgressWave;
  waveLabel: string;
};

export type DailyProgressHistoryEntry = {
  date: string;
  completedCount: number;
  totalCount: number;
  completedIds: string[];
  notes: string;
};

export type DailyProgressChecklistData = {
  items: DailyProgressItem[];
  dailyNotes: string;
  lastUpdatedDate: string;
  history: DailyProgressHistoryEntry[];
};

export const DAILY_CHECKLIST_ITEMS: DailyProgressItemConfig[] = [
  {
    id: 'deliveries',
    label: 'Revisei o avanço das entregas dos planos de ação',
    description: 'Confira status, prazos e bloqueios no Action Canvas.',
    route: '/dashboard/design',
    wave: 'design',
    waveLabel: 'Design',
  },
  {
    id: 'evidence',
    label: 'Registrei evidências ou bloqueios no Action Canvas',
    description: 'Atualize entregas com evidência ou risco explícito.',
    route: '/dashboard/design',
    wave: 'design',
    waveLabel: 'Design',
  },
  {
    id: 'align',
    label: 'Alinhei prioridades com sponsor ou equipe',
    description: 'Use a Consultoria IA ou reúna o time na Difusão.',
    route: '/dashboard/minha-equipe?tab=consultoria',
    wave: 'difusao',
    waveLabel: 'Difusão',
  },
  {
    id: 'objectives',
    label: 'Atualizei status de pelo menos um objetivo estratégico',
    description: 'Mova objetivos e registre impacto na Onda 3.',
    route: '/dashboard/objetivos',
    wave: 'difusao',
    waveLabel: 'Difusão',
  },
  {
    id: 'learning',
    label: 'Documentei um aprendizado ou insight do dia',
    description: 'Capture aprendizados no Domínio para o próximo ciclo.',
    route: '/dashboard/relatorios',
    wave: 'dominio',
    waveLabel: 'Domínio',
  },
  {
    id: 'metrics',
    label: 'Revisei indicadores ou métricas do ciclo',
    description: 'Valide KPIs e evolução no MID e nos relatórios.',
    route: '/dashboard/inicio',
    wave: 'geral',
    waveLabel: 'MID',
  },
];

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createEmptyDailyProgressChecklist(): DailyProgressChecklistData {
  return {
    items: DAILY_CHECKLIST_ITEMS.map((item) => ({
      id: item.id,
      label: item.label,
      checked: false,
    })),
    dailyNotes: '',
    lastUpdatedDate: todayIsoDate(),
    history: [],
  };
}
