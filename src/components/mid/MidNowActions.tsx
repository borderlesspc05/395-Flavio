import { ArrowRight, Sparkles } from 'lucide-react';
import { useViewTransitionNavigate } from '../../hooks/useViewTransitionNavigate';
import type { MidNowAction } from '../../types/mid';

interface MidNowActionsProps {
  actions: MidNowAction[];
}

export function MidNowActions({ actions }: MidNowActionsProps) {
  const navigate = useViewTransitionNavigate();

  if (actions.length === 0) return null;

  return (
    <section className="mid-now mid-reveal mid-reveal--1" aria-labelledby="mid-now-title">
      <header className="mid-section-head">
        <div className="mid-section-icon" aria-hidden>
          <Sparkles size={20} />
        </div>
        <div>
          <p className="mid-section-eyebrow">Sprint IA · Recomendações</p>
          <h2 id="mid-now-title" className="mid-section-title">
            O que devo fazer agora?
          </h2>
        </div>
      </header>

      <ul className="mid-now-list">
        {actions.map((action) => (
          <li key={action.id}>
            <button
              type="button"
              className="mid-now-card"
              onClick={() => {
                if (action.route) navigate(action.route);
              }}
            >
              <div className="mid-now-card-copy">
                <strong className="mid-now-card-title">{action.title}</strong>
                <p className="mid-now-card-reason">{action.reason}</p>
              </div>
              <span className="mid-now-card-go" aria-hidden>
                <ArrowRight size={16} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
