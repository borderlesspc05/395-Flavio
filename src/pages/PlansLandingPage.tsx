import {
  ArrowRight,
  ChartLine,
  Check,
  Compass,
  Globe,
  LayoutGrid,
  Radio,
  Sparkles,
} from 'lucide-react';
import { ViewTransitionLink } from '../components/navigation/ViewTransitionLink';
import { useLocale } from '../context/LocaleContext';
import type { Locale } from '../constants/locales';

const CONTACT_EMAIL = 'hello@magnusmind.io';

const METHOD_STEPS = [
  { step: '01', icon: Compass, title: 'Diagnóstico', text: 'Compreenda a realidade da organização antes de decidir.' },
  { step: '02', icon: LayoutGrid, title: 'Design', text: 'Transforme prioridades em um plano claro de execução.' },
  { step: '03', icon: Radio, title: 'Difusão', text: 'Mobilize pessoas, acompanhe iniciativas e fortaleça a adoção.' },
  { step: '04', icon: Sparkles, title: 'Domínio', text: 'Consolide aprendizados e acelere a evolução.' },
] as const;

const FEATURES = [
  'Estratégia e execução conectadas',
  'Memória organizacional entre ciclos',
  'Conhecimento estruturado via RAG',
  'Tecnologia apoiando decisões, não substituindo pessoas',
  'Especialistas humanos desenvolvendo curadoria',
  'Segurança da informação',
  'Accountability distribuída',
  'Evolução mensurável',
] as const;

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    title: 'Ideal para validar o método',
    description:
      'Conduza sua primeira Sprint Wave e estabeleça uma nova forma de transformar estratégia em execução.',
    features: ['1 Sprint Wave ativa', 'Intelligence Dashboard', 'Curadoria de especialistas'],
    featured: false,
  },
  {
    id: 'advanced',
    name: 'Advanced',
    title: 'Várias iniciativas em paralelo',
    description: 'Mais velocidade. Mais colaboração. Mais capacidade de execução.',
    features: [
      'Múltiplas Sprint Waves simultâneas',
      'Colaboração ampliada',
      'Memória organizacional avançada',
    ],
    featured: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    title: 'Transformação como prática contínua',
    description:
      'Criado para empresas e consultorias que fazem da transformação uma prática contínua. Sem limites para crescer.',
    features: ['Sprint Waves ilimitadas', 'Suporte dedicado', 'Integrações personalizadas'],
    featured: false,
  },
] as const;

function SprintLogoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="sw-logo-icon-svg" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M4 20c4-8 12-8 16 0" strokeLinecap="round" />
      <path d="M4 14c4-8 12-8 16 0" strokeLinecap="round" opacity={0.6} />
    </svg>
  );
}

function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();
  const options: Locale[] = ['pt', 'en', 'es'];

  return (
    <div className="sw-locale" aria-label="Idioma">
      <Globe size={14} aria-hidden style={{ opacity: 0.7 }} />
      {options.map((code) => (
        <button
          key={code}
          type="button"
          className={locale === code ? 'is-active' : undefined}
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

export function PlansLandingPage() {
  return (
    <div id="top" className="sw-landing">
      <header className="sw-header">
        <div className="sw-container sw-header-inner">
          <a href="#top" className="sw-logo">
            <span className="sw-logo-icon">
              <SprintLogoIcon />
            </span>
            <span>Sprint</span>
          </a>

          <nav className="sw-nav" aria-label="Principal">
            <a href="#about">O Sprint</a>
            <a href="#method">Metodologia</a>
            <a href="#pricing">Planos</a>
          </nav>

          <div className="sw-header-actions">
            <LocaleSwitcher />
            <ViewTransitionLink to="/login" className="sw-link-ghost">
              Entrar
            </ViewTransitionLink>
            <ViewTransitionLink to="/register" className="sw-btn sw-btn--gold">
              Começar
            </ViewTransitionLink>
          </div>
        </div>
      </header>

      <section className="sw-hero sw-hero-radial" aria-label="Sprint">
        <div className="sw-container sw-hero-grid">
          <div>
            <p className="sw-eyebrow">Magnus Mind · Sprint</p>
            <h1>
              Toda organização sabe o que precisa fazer.
              <br />
              <span className="sw-serif">Poucas conseguem executar.</span>
            </h1>
            <p className="sw-hero-lead">
              O Sprint é uma plataforma de execução organizacional. Transforma prioridades em planos de
              ação, conecta equipes, acompanha a evolução da mudança e ajuda sua organização a executar
              com mais clareza, velocidade e consistência.
            </p>
            <div className="sw-hero-actions">
              <ViewTransitionLink to="/register" className="sw-btn sw-btn--gold sw-btn--gold-lg">
                Começar minha primeira Sprint Wave
                <ArrowRight size={16} aria-hidden />
              </ViewTransitionLink>
              <a href="#method" className="sw-btn sw-btn--outline">
                Conhecer a metodologia
              </a>
            </div>
          </div>

          <div className="sw-hero-visual">
            <div className="sw-hero-glow-1" aria-hidden />
            <div className="sw-hero-glow-2" aria-hidden />
            <div className="sw-hero-image-wrap">
              <img src="/landing/hero.png" alt="Sprint execution" width={640} height={520} />
            </div>
            <div className="sw-hero-badge">
              <p className="sw-hero-badge-label">Sprint Wave</p>
              <p className="sw-hero-badge-text">Diagnóstico → Design → Difusão → Domínio</p>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="sw-section sw-section--border-top sw-about">
        <div className="sw-container">
          <p className="sw-eyebrow">O problema</p>
          <h2>
            A estratégia não falha no planejamento.
            <br />
            <span className="sw-serif">Ela falha na execução.</span>
          </h2>
          <div className="sw-about-copy">
            <p>
              Todos os dias, organizações definem prioridades, iniciam projetos e lançam iniciativas
              importantes.
            </p>
            <p>
              Mas, ao longo do caminho, surgem novos desafios, prioridades mudam, equipes perdem
              alinhamento e o conhecimento construído em um ciclo acaba se perdendo no seguinte.
            </p>
            <p>
              O Sprint foi criado para resolver exatamente esse problema: transformar estratégia em
              execução contínua.
            </p>
          </div>
        </div>
      </section>

      <section id="method" className="sw-section sw-navy-section">
        <div className="sw-container">
          <div className="sw-section-head">
            <p className="sw-eyebrow">Sprint Wave</p>
            <h2>
              Um ciclo <span className="sw-serif">contínuo</span> de evolução organizacional
            </h2>
            <p className="sw-section-lead">
              Cada Sprint Wave transforma aprendizado em ação. O conhecimento gerado em uma etapa
              alimenta a próxima, criando um processo contínuo de melhoria — não projetos isolados que
              começam do zero.
            </p>
          </div>

          <div className="sw-method-grid">
            {METHOD_STEPS.map((item) => (
              <article key={item.step} className="sw-method-card">
                <div className="sw-method-card-top">
                  <div className="sw-method-icon">
                    <item.icon size={20} aria-hidden />
                  </div>
                  <span className="sw-method-step">{item.step}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>

          <div className="sw-id-banner">
            <div className="sw-id-banner-icon">
              <ChartLine size={24} aria-hidden />
            </div>
            <div>
              <h3>Intelligence Dashboard</h3>
              <p>
                Monitore indicadores, receba recomendações inteligentes e acompanhe o progresso da
                transformação com total clareza.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="sw-section">
        <div className="sw-container sw-split sw-split--reverse">
          <div className="sw-split-visual">
            <div className="sw-image-card">
              <img src="/landing/team.png" alt="Team collaborating" width={640} height={520} />
            </div>
            <div className="sw-float-badge">
              <p className="sw-float-badge-label">RAG</p>
              <p className="sw-float-badge-text">Memória organizacional entre ciclos</p>
            </div>
          </div>

          <div className="sw-split-copy">
            <h2>
              Execute melhor.
              <br />
              <span className="sw-serif">Aprenda continuamente.</span>
            </h2>
            <p className="sw-section-lead">
              Enquanto ferramentas tradicionais organizam tarefas, o Sprint ajuda organizações a
              transformar decisões em resultados. Cada Sprint Wave preserva o contexto, registra
              aprendizados e fortalece a capacidade da organização de evoluir continuamente.
            </p>
            <ul className="sw-checklist">
              {FEATURES.map((feature) => (
                <li key={feature}>
                  <span className="sw-check-icon">
                    <Check size={12} aria-hidden />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="sw-section sw-navy-section">
        <div className="sw-container sw-decisions-grid">
          <div>
            <p className="sw-eyebrow">Além do dashboard</p>
            <h2>
              As empresas não precisam de mais dashboards.
              <br />
              <span className="sw-serif">Precisam tomar decisões melhores.</span>
            </h2>
            <div className="sw-decisions-copy">
              <p>Decisões melhores geram organizações melhores.</p>
              <p>
                O Sprint não existe apenas para acompanhar projetos. Ele existe para ajudar líderes e
                equipes a decidir com mais clareza, agir com mais rapidez e aprender continuamente com
                cada ciclo realizado.
              </p>
              <p>
                Porque executar bem nunca depende apenas do plano. Depende da qualidade das decisões
                tomadas todos os dias.
              </p>
            </div>
          </div>
          <div className="sw-image-card sw-decisions-image">
            <img src="/landing/decisions.png" alt="Better decisions" width={480} height={500} />
          </div>
        </div>
      </section>

      <section id="pricing" className="sw-section">
        <div className="sw-container">
          <div className="sw-section-head">
            <h2>Escolha a capacidade que acompanha o crescimento da sua organização.</h2>
            <p className="sw-section-lead">
              Todos os planos incluem a experiência completa do Sprint. A diferença está apenas na
              quantidade de Sprint Waves que sua organização pode conduzir simultaneamente.
            </p>
            <p className="sw-pricing-tagline">Você cresce no seu ritmo, sem mudar de plataforma.</p>
          </div>

          <div className="sw-pricing-grid">
            {PLANS.map((plan) => (
              <article
                key={plan.id}
                className={`sw-pricing-card ${plan.featured ? 'sw-pricing-card--featured' : ''}`}
              >
                {plan.featured ? <span className="sw-pricing-star" aria-hidden>★</span> : null}
                <p className="sw-eyebrow">{plan.name}</p>
                <h3>{plan.title}</h3>
                <p className="sw-pricing-desc">{plan.description}</p>
                <ul className="sw-pricing-features">
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <Check size={16} aria-hidden />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=Sprint%20%E2%80%94%20Plano%20${plan.name}`}
                  className={`sw-btn ${plan.featured ? 'sw-btn--gold' : 'sw-btn--outline-card'}`}
                >
                  Falar com o time
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="cta" className="sw-section sw-cta sw-hero-radial sw-section--border-top">
        <div className="sw-container" style={{ maxWidth: '56rem' }}>
          <h2>
            Sua estratégia <span className="sw-serif">merece sair do papel.</span>
          </h2>
          <p className="sw-cta-lead">
            Comece a construir uma organização que aprende continuamente, executa com consistência e
            evolui a cada novo ciclo.
          </p>
          <div className="sw-cta-actions">
            <ViewTransitionLink to="/register" className="sw-btn sw-btn--gold sw-btn--gold-xl">
              Começar minha primeira Sprint Wave
              <ArrowRight size={16} aria-hidden />
            </ViewTransitionLink>
          </div>
        </div>
      </section>

      <footer className="sw-footer">
        <div className="sw-container sw-footer-inner">
          <div className="sw-footer-grid">
            <div className="sw-footer-brand">
              <div className="sw-logo">
                <span className="sw-logo-icon">
                  <SprintLogoIcon />
                </span>
                <span>Sprint</span>
              </div>
              <p>Plataforma de execução organizacional.</p>
            </div>

            <div>
              <h4>Ecossistema Magnus Mind</h4>
              <ul className="sw-footer-links">
                <li>
                  <a href="https://connect.magnusmind.io/" target="_blank" rel="noreferrer">
                    Magnus Mind · Connect
                  </a>
                </li>
                <li>
                  <a href="https://mosaic.magnusmind.io/" target="_blank" rel="noreferrer">
                    Magnus Mind · Mosaic
                  </a>
                </li>
                <li>
                  <span className="is-current">Magnus Mind · Sprint</span>
                </li>
              </ul>
            </div>

            <div>
              <h4>Sprint</h4>
              <ul className="sw-footer-links">
                <li>
                  <a href="#method">Metodologia</a>
                </li>
                <li>
                  <a href="#pricing">Planos</a>
                </li>
                <li>
                  <a href="#cta">Começar</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="sw-footer-bottom">
            <span>© {new Date().getFullYear()} Magnus Mind. Todos os direitos reservados.</span>
            <span className="sw-footer-mark">MAGNUS MIND · SPRINT</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
