import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  CircleDot,
  Mail,
  MapPin,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { getMockEmployeeProfile } from '../data/mockEmployeeProfile';

const STATUS_LABELS = {
  concluido: 'Concluído',
  em_andamento: 'Em andamento',
  pendente: 'Pendente',
} as const;

const MEMBER_STATUS_LABELS = {
  active: 'Ativo',
  remote: 'Remoto',
  'on-leave': 'Licença',
} as const;

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function EmployeeProfilePage() {
  const { memberId } = useParams<{ memberId: string }>();
  const profile = useMemo(() => getMockEmployeeProfile(memberId), [memberId]);
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div className="employee-profile-page">
      <div className="ep-bg" aria-hidden>
        <div className="ep-bg-glow" />
        <div className="ep-bg-grain" />
      </div>

      <div className="ep-shell">
        <header className="ep-topbar">
          <Link to="/" className="ep-brand">
            <span className="ep-brand-mark">M</span>
            <span className="ep-brand-text">Sprint · Desenvolvimento</span>
          </Link>
          <span className="ep-demo-badge">Visualização mockada</span>
        </header>

        <section className="ep-hero">
          <div className="ep-avatar" aria-hidden>
            {initials(profile.name)}
          </div>
          <div className="ep-hero-main">
            <h1>Olá, {profile.name.split(' ')[0]}</h1>
            <p className="ep-role">{profile.role}</p>
            <div className="ep-meta-row">
              {profile.department && (
                <span>
                  <Briefcase size={15} aria-hidden />
                  {profile.department}
                </span>
              )}
              {profile.location && (
                <span>
                  <MapPin size={15} aria-hidden />
                  {profile.location}
                </span>
              )}
              <span>
                <Mail size={15} aria-hidden />
                {profile.email}
              </span>
              <span>{MEMBER_STATUS_LABELS[profile.status]}</span>
            </div>
          </div>
          <div className="ep-cycle-pill">
            <Sparkles size={15} aria-hidden />
            {profile.cycleLabel}
          </div>
          <div className="ep-leader-note" style={{ gridColumn: '1 / -1' }}>
            <strong>Mensagem de {profile.leaderName} · {profile.companyName}</strong>
            {profile.leaderMessage}
          </div>
        </section>

        <div className="ep-grid">
          <article className="ep-card">
            <h2>Destaques</h2>
            <ul className="ep-list ep-list--highlights">
              {profile.highlights.map((item) => (
                <li key={item}>
                  <CheckCircle2 size={16} aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="ep-card">
            <h2>O que melhorar agora</h2>
            <ul className="ep-list ep-list--improvements">
              {profile.improvements.map((item) => (
                <li key={item}>
                  <TrendingUp size={16} aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="ep-card">
            <h2>Indicadores</h2>
            <div className="ep-stats">
              <div className="ep-stat">
                <div className="ep-stat-value">{profile.performance}%</div>
                <div className="ep-stat-label">Desempenho</div>
              </div>
              <div className="ep-stat">
                <div className="ep-stat-value">{profile.projectsCompleted}</div>
                <div className="ep-stat-label">Projetos</div>
              </div>
              <div className="ep-stat">
                <div className="ep-stat-value">{profile.objectives.length}</div>
                <div className="ep-stat-label">Objetivos</div>
              </div>
            </div>
            <div className="ep-skills" style={{ marginTop: '1rem' }}>
              {profile.skills.map((skill) => (
                <span key={skill} className="ep-skill">
                  {skill}
                </span>
              ))}
            </div>
          </article>

          <article className="ep-card">
            <h2>Convite</h2>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: 'var(--ep-muted)', lineHeight: 1.55 }}>
              Você recebeu este panorama porque está vinculado ao People Sprint da Difusão neste ciclo.
            </p>
            <div className="ep-meta-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.35rem' }}>
              <span>
                <Calendar size={15} aria-hidden />
                Convite enviado em {formatDate(profile.invitedAt)}
              </span>
              {profile.hireDate && (
                <span>
                  <Calendar size={15} aria-hidden />
                  Na equipe desde {formatDate(profile.hireDate)}
                </span>
              )}
            </div>
          </article>

          <article className="ep-card ep-card--wide">
            <h2>Objetivos vinculados a você</h2>
            <div className="ep-objectives">
              {profile.objectives.map((obj) => (
                <div key={obj.id} className="ep-objective">
                  <div>
                    <div className="ep-objective-title">
                      <Target size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} aria-hidden />
                      {obj.title}
                    </div>
                    {obj.impact && <div className="ep-objective-impact">{obj.impact}</div>}
                  </div>
                  <span className={`ep-status ep-status--${obj.status}`}>
                    {STATUS_LABELS[obj.status]}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="ep-card ep-card--wide">
            <h2>Entregas no Action Canvas</h2>
            <div className="ep-deliveries">
              {profile.deliveries.map((delivery) => (
                <div key={delivery.id} className="ep-delivery">
                  <span className="ep-delivery-initiative">{delivery.initiative}</span>
                  <span className="ep-delivery-title">{delivery.title}</span>
                  <span className={`ep-traffic ep-traffic--${delivery.status}`} title={delivery.status} />
                  <div className="ep-delivery-meta">
                    {delivery.dueDate && <>Prazo: {delivery.dueDate}</>}
                    {delivery.evidence && <> · {delivery.evidence}</>}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <footer className="ep-footer">
          <p>
            Este é um perfil de desenvolvimento personalizado. Em breve os dados virão do seu ciclo real no Sprint.
          </p>
          {acknowledged ? (
            <span className="ep-acknowledged">
              <CheckCircle2 size={18} aria-hidden />
              Leitura confirmada — obrigado!
            </span>
          ) : (
            <button type="button" className="ep-btn ep-btn--primary" onClick={() => setAcknowledged(true)}>
              <CircleDot size={16} aria-hidden />
              Confirmar que li
            </button>
          )}
          <Link to="/login" className="ep-btn ep-btn--ghost">
            Acessar Sprint
          </Link>
        </footer>
      </div>
    </div>
  );
}
