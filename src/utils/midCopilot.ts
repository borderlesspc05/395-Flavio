import type { MidDashboardData, MidExecutiveKpi, MidExecutionRow } from '../types/mid';

export type CopilotTone = 'intro' | 'positive' | 'attention' | 'action' | 'tip';

export interface CopilotMessage {
  id: string;
  tone: CopilotTone;
  text: string;
}

const STRONG_BANDS = new Set(['mature', 'strong', 'steady']);
const WEAK_BANDS = new Set(['attention', 'low']);

function byScoreDesc(a: MidExecutiveKpi, b: MidExecutiveKpi): number {
  return b.score - a.score;
}

function progressPhrase(percent: number): string {
  if (percent >= 85) return 'reta final — mantenha o ritmo para consolidar tudo';
  if (percent >= 55) return 'passo firme, mais da metade do caminho já andou';
  if (percent >= 25) return 'ganhando tração, a base já está montada';
  return 'começo de jornada — cada movimento agora define o tom do ciclo';
}

function healthPhrase(health: string): string {
  if (health === 'green') return 'A saúde geral está sólida';
  if (health === 'yellow') return 'A saúde geral pede atenção em alguns pontos';
  return 'A saúde geral está em alerta — vale priorizar o que trava';
}

function firstUsefulAction(execution: MidExecutionRow[]): MidExecutionRow | null {
  const priority = execution.find(
    (row) => row.status === 'vermelho' || row.status === 'pendente',
  );
  const withAction = execution.find((row) => row.nextAction && row.nextAction.trim());
  return priority ?? withAction ?? null;
}

/** Gera a narrativa da IA a partir dos dados reais do ID (determinística, sempre relevante). */
export function buildMidCopilotMessages(data: MidDashboardData): CopilotMessage[] {
  const { overview, executiveKpis, execution, briefing, nowActions } = data;
  if (!data.hasData) {
    return [
      {
        id: 'waiting-for-data',
        tone: 'intro',
        text: `${briefing?.greeting || 'Olá'}! Ainda não há informações suficientes para analisar este projeto. Conforme você preencher o diagnóstico e registrar ações, eu vou acompanhar os dados e trazer recomendações baseadas no que realmente aconteceu.`,
      },
    ];
  }

  const messages: CopilotMessage[] = [];
  const project = overview.projectName?.trim() || 'seu projeto';

  messages.push({
    id: 'intro',
    tone: 'intro',
    text: `${briefing?.greeting || 'Olá'}! Acompanhei ${project} de perto. Você está em ${overview.currentWaveLabel} com Health Score ${overview.progressPercent} — ${progressPhrase(
      overview.progressPercent,
    )}.`,
  });

  messages.push({
    id: 'health',
    tone: overview.health === 'green' ? 'positive' : 'attention',
    text: `${healthPhrase(overview.health)}. ${briefing?.recommendation || 'Vou te mostrar onde está o brilho e onde vale olhar com carinho.'}`,
  });

  if (nowActions?.[0]) {
    messages.push({
      id: 'now',
      tone: 'action',
      text: `Próximo movimento: ${nowActions[0].title}. ${nowActions[0].reason}`,
    });
  }

  const ranked = [...executiveKpis].sort(byScoreDesc);
  const top = ranked[0];
  const weak = ranked[ranked.length - 1];

  if (top && (STRONG_BANDS.has(top.band) || top.score >= 60)) {
    messages.push({
      id: `top-${top.id}`,
      tone: 'positive',
      text: `Destaque do ciclo: ${top.title} está ${top.label.toLowerCase()} (${top.score}). ${top.detail}`,
    });
  }

  if (weak && weak.id !== top?.id && (WEAK_BANDS.has(weak.band) || weak.trend === 'down' || weak.score < 50)) {
    messages.push({
      id: `weak-${weak.id}`,
      tone: 'attention',
      text: `Ponto de atenção: ${weak.title} (${weak.score}). ${weak.detail} Um pequeno foco aqui destrava o resto.`,
    });
  }

  const action = firstUsefulAction(execution);
  if (action) {
    messages.push({
      id: `action-${action.id}`,
      tone: 'action',
      text: action.nextAction?.trim()
        ? `Próximo passo que eu priorizaria: ${action.nextAction} (${action.delivery}).`
        : `Vale acompanhar de perto a entrega "${action.delivery}" — ela é sensível para o ciclo.`,
    });
  } else if (execution.length > 0) {
    const green = execution.filter((r) => r.status === 'verde').length;
    messages.push({
      id: 'action-summary',
      tone: 'action',
      text: `Execução saudável: ${green} de ${execution.length} entregas já estão no verde. Documente o que funcionou para replicar no próximo ciclo.`,
    });
  }

  messages.push({
    id: 'tip',
    tone: 'tip',
    text:
      overview.progressPercent >= 80
        ? 'Dica: registre agora os aprendizados no Domínio enquanto tudo está fresco — é o que alimenta o próximo ciclo.'
        : 'Dica: ritmo constante vence intensidade. Um check-in curto por semana mantém a execução viva.',
  });

  return messages;
}
