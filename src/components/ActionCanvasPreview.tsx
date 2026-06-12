import { ClipboardList, Flag, ShieldAlert, UserRound } from 'lucide-react';
import type { SuggestedActionCanvasDraft } from '../types';

type PlanLike = Pick<
  SuggestedActionCanvasDraft,
  'nomeIniciativa' | 'objetivoEspecifico' | 'owner' | 'sponsor' | 'prazoFinal' | 'entregas' | 'riscos'
>;

type Props = {
  plan: PlanLike | null;
  validated?: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  verde: 'No prazo',
  amarelo: 'Atenção',
  vermelho: 'Atrasado',
};

export function ActionCanvasPreview({ plan, validated }: Props) {
  if (!plan) {
    return (
      <div className="ac-preview ac-preview--empty">
        <p>Selecione um plano para ver o preview do Action Canvas.</p>
      </div>
    );
  }

  return (
    <div className={`ac-preview ${validated ? 'is-validated' : ''}`}>
      <header className="ac-preview-head">
        <span className="ac-preview-kicker">Preview · Action Canvas</span>
        {validated && <span className="ac-preview-badge">Sincronizado</span>}
      </header>

      <section className="ac-preview-block">
        <h3>
          <ClipboardList size={15} aria-hidden />
          A mudança
        </h3>
        <strong>{plan.nomeIniciativa || 'Sem título'}</strong>
        <p>{plan.objetivoEspecifico || 'Objetivo ainda não definido.'}</p>
      </section>

      <section className="ac-preview-block">
        <h3>
          <UserRound size={15} aria-hidden />
          Execução
        </h3>
        <dl className="ac-preview-meta">
          <div>
            <dt>Owner</dt>
            <dd>{plan.owner || '—'}</dd>
          </div>
          <div>
            <dt>Sponsor</dt>
            <dd>{plan.sponsor || '—'}</dd>
          </div>
          <div>
            <dt>Prazo final</dt>
            <dd>{plan.prazoFinal || '—'}</dd>
          </div>
        </dl>
        <ul className="ac-preview-list">
          {plan.entregas.length === 0 ? (
            <li>Nenhuma entrega cadastrada.</li>
          ) : (
            plan.entregas.map((e, i) => (
              <li key={i}>
                <span className={`ac-preview-pill is-${e.status ?? 'amarelo'}`}>
                  {STATUS_LABEL[e.status ?? 'amarelo']}
                </span>
                <span>
                  {e.entrega || 'Entrega'} — {e.responsavel}, {e.prazo}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="ac-preview-block">
        <h3>
          <ShieldAlert size={15} aria-hidden />
          Riscos
        </h3>
        <ul className="ac-preview-list">
          {plan.riscos.length === 0 ? (
            <li>Sem riscos mapeados.</li>
          ) : (
            plan.riscos.map((r, i) => (
              <li key={i}>
                <strong>{r.risco || 'Risco'}</strong>
                <span>{r.acaoTomar || 'Ação a definir'}</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <footer className="ac-preview-foot">
        <Flag size={14} aria-hidden />
        Sign-off pendente — aparece na Difusão após concluir o Design
      </footer>
    </div>
  );
}
