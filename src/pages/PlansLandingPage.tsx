import { ViewTransitionLink } from '../components/navigation/ViewTransitionLink';
import {
  ArrowRight,
  Check,
  Cpu,
  Infinity,
  Layers,
  Sparkles,
  Zap,
  GitBranch,
  Shield,
  Instagram,
} from 'lucide-react';
import { ScrollReveal } from '../components/ScrollReveal';
import { PlanCheckoutButton } from '../components/PlanCheckoutButton';
import type { PlanId } from '../constants/plans';

const INSTAGRAM_URL = 'https://www.instagram.com/magnusmind.io/';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Foco total',
    maxProjects: 1,
    price: 'Ideal para começar',
    description: 'Um ciclo Sprint Waves ativo — valide o método com profundidade, sem dispersão.',
    features: [
      '1 ciclo ativo por vez',
      'Chat Sprint + memória do diagnóstico',
      'Action Canvas e execução guiada',
      'Objetivos estratégicos',
    ],
    cta: 'Começar com Starter',
    highlight: false,
  },
  {
    id: 'advanced',
    name: 'Advanced',
    tagline: 'Velocidade em equipe',
    maxProjects: 3,
    price: 'Mais fluxo, menos espera',
    description: 'Até três ciclos em paralelo — evolua frentes diferentes no mesmo plano.',
    features: [
      '3 ciclos ativos em paralelo',
      'Tudo do Starter',
      'Importação paralela de objetivos',
      'Prioridade em picos de uso',
    ],
    cta: 'Escolher Advanced',
    highlight: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    tagline: 'Sem teto operacional',
    maxProjects: null,
    price: 'Escala sem fricção',
    description: 'Ciclos ilimitados — para squads e consultorias que rodam Sprint Waves em várias frentes.',
    features: [
      'Ciclos ilimitados',
      'Tudo do Advanced',
      'Suporte a squads e consultorias',
      'Memória Sprint Waves completa',
    ],
    cta: 'Assinar Premium',
    highlight: false,
  },
] as const;

function ProjectsVisual({ count }: { count: number | null }) {
  if (count === null) {
    return (
      <div className="plan-concurrency plan-concurrency--unlimited" aria-hidden>
        <Infinity size={28} strokeWidth={1.75} />
        <span>Ciclos ilimitados</span>
      </div>
    );
  }

  return (
    <div className="plan-concurrency" aria-hidden>
      <div className="plan-concurrency-slots">
        {Array.from({ length: count === 1 ? 1 : 3 }).map((_, i) => (
          <span key={i} className="plan-slot plan-slot--active" style={{ animationDelay: `${i * 120}ms` }} />
        ))}
        {count === 1 && (
          <>
            <span className="plan-slot plan-slot--idle" />
            <span className="plan-slot plan-slot--idle" />
          </>
        )}
      </div>
      <span>{count === 1 ? '1 ciclo ativo' : `${count} ciclos ativos`}</span>
    </div>
  );
}

export function PlansLandingPage() {
  return (
    <div className="plans-landing">
      <div className="plans-landing-bg" aria-hidden>
        <div className="plans-grid" />
        <div className="plans-orb plans-orb--1" />
        <div className="plans-orb plans-orb--2" />
        <div className="plans-orb plans-orb--3" />
        <div className="plans-scanline" />
      </div>

      <header className="plans-nav scroll-reveal is-visible">
        <ViewTransitionLink to="/" className="plans-logo">
          <img src="/icone-magnusmind.svg" alt="" width={36} height={36} />
          <span className="plans-logo-word">Sprint</span>
        </ViewTransitionLink>
        <nav className="plans-nav-links" aria-label="Seções">
          <a href="#quem-somos">Quem somos</a>
          <a href="#planos">Planos</a>
          <a href="#fluxo">Método</a>
          <a href="#tecnologia">Produto</a>
        </nav>
        <div className="plans-nav-cta">
          <ViewTransitionLink to="/login" className="plans-btn plans-btn--ghost plans-btn--nav">
            Entrar
          </ViewTransitionLink>
          <a href="#planos" className="plans-btn plans-btn--primary plans-btn--nav">
            Ver planos
          </a>
        </div>
      </header>

      <section className="plans-hero" aria-label="Sprint">
        <div className="plans-hero-stage" aria-hidden>
          <div className="plans-hero-horizon" />
          <svg className="plans-hero-waves-svg" viewBox="0 0 1440 420" preserveAspectRatio="none">
            <path
              className="plans-hero-path plans-hero-path--1"
              d="M0,280 C240,220 360,340 720,260 C1080,180 1200,300 1440,240 L1440,420 L0,420 Z"
            />
            <path
              className="plans-hero-path plans-hero-path--2"
              d="M0,310 C280,250 440,360 740,290 C1040,220 1220,330 1440,270 L1440,420 L0,420 Z"
            />
            <path
              className="plans-hero-path plans-hero-path--3"
              d="M0,340 C260,300 500,380 760,320 C1020,260 1240,360 1440,310 L1440,420 L0,420 Z"
            />
          </svg>
          <div className="plans-hero-glow" />
          <div className="plans-hero-grain" />
        </div>

        <div className="plans-hero-shell">
          <div className="plans-hero-content">
            <ScrollReveal as="p" className="plans-hero-brand" delay={0}>
              Sprint
            </ScrollReveal>
            <ScrollReveal as="h1" className="plans-hero-title" delay={90}>
              Do diagnóstico à execução, <em>em ondas</em>
            </ScrollReveal>
            <ScrollReveal className="plans-hero-lead" delay={180}>
              O sistema operacional de transformação: Diagnóstico, Design, Difusão e Intelligence
              Dashboard — com memória contínua entre cada onda.
            </ScrollReveal>
            <ScrollReveal className="plans-hero-actions" delay={270}>
              <a href="#planos" className="plans-btn plans-btn--primary plans-btn--lg">
                Escolher plano
                <ArrowRight size={18} />
              </a>
              <ViewTransitionLink to="/login" className="plans-btn plans-btn--outline plans-btn--lg">
                Já tenho acesso
              </ViewTransitionLink>
            </ScrollReveal>
            <ScrollReveal className="plans-hero-wave-labels" delay={360}>
              <span>Diagnóstico</span>
              <span>Design</span>
              <span>Difusão</span>
              <span>ID</span>
            </ScrollReveal>
          </div>

          <ScrollReveal className="plans-id-preview" delay={200} variant="scale">
            <header className="plans-id-preview-head">
              <div>
                <span className="plans-id-preview-eyebrow">Intelligence Dashboard</span>
                <p className="plans-id-preview-greeting">Bom dia, Flávio</p>
              </div>
              <div className="plans-id-health" aria-label="Health Score 92">
                <span className="plans-id-health-label">Health Score</span>
                <strong className="plans-id-health-value">92</strong>
                <span className="plans-id-health-band">Excelente</span>
              </div>
            </header>

            <ul className="plans-id-signals">
              <li>
                <span className="plans-id-dot plans-id-dot--red" aria-hidden />
                2 iniciativas em risco
              </li>
              <li>
                <span className="plans-id-dot plans-id-dot--amber" aria-hidden />
                3 pessoas sem check-in há mais de 15 dias
              </li>
              <li>
                <span className="plans-id-dot plans-id-dot--green" aria-hidden />
                1 equipe acelerou nesta semana
              </li>
            </ul>

            <div className="plans-id-reco">
              <span className="plans-id-reco-label">Recomendação da IA</span>
              <p>Priorize reunião com Equipe Comercial</p>
            </div>

            <p className="plans-id-basis">
              Baseado em prazo · evolução · velocidade · check-ins · bloqueios · participação
            </p>
          </ScrollReveal>
        </div>

        <a href="#quem-somos" className="plans-hero-scroll" aria-label="Ir para Quem somos">
          <span />
        </a>
      </section>

      <section id="quem-somos" className="plans-section plans-about">
        <div className="plans-about-grid">
          <ScrollReveal className="plans-about-copy" variant="left">
            <span className="plans-eyebrow">Quem somos</span>
            <h2>
              Mentes que evoluem.
              <br />
              <em>Culturas que prosperam.</em>
            </h2>
            <p>
              A Magnus Mind nasceu para transformar como o desenvolvimento humano é praticado nas
              organizações — não como mais um treinamento, mas como um sistema vivo que une
              inteligência artificial e consciência humana.
            </p>
            <p>
              O Sprint é a expressão digital desse método: cada onda deixa memória para a próxima,
              com decisões sustentadas por dados, propósito e protagonismo.
            </p>
            <a
              href="https://magnusmind.io"
              target="_blank"
              rel="noreferrer"
              className="plans-btn plans-btn--outline"
            >
              Conhecer a Magnus Mind
              <ArrowRight size={16} />
            </a>
          </ScrollReveal>

          <ScrollReveal className="plans-about-pillars" delay={120} variant="right">
            {[
              {
                title: 'Método Magnus Waves™',
                text: 'Diagnóstico, Design, Difusão e Domínio — um ciclo que transforma intenção em resultado.',
              },
              {
                title: 'IA com propósito',
                text: 'Tecnologia a serviço da cultura organizacional — potencializa o humano, sem substituí-lo.',
              },
              {
                title: 'Cultura como ativo',
                text: 'Transformamos valores em rituais e discurso em prática mensurável no negócio.',
              },
            ].map((pillar) => (
              <article key={pillar.title} className="plans-about-pillar">
                <h3>{pillar.title}</h3>
                <p>{pillar.text}</p>
              </article>
            ))}
          </ScrollReveal>
        </div>
      </section>

      <section id="planos" className="plans-section plans-pricing">
        <ScrollReveal className="plans-section-head">
          <span className="plans-eyebrow">Planos</span>
          <h2>Capacidade sob medida para o seu ritmo</h2>
          <p>
            Cada plano define quantos ciclos Sprint Waves você mantém ativos ao mesmo tempo. O método
            é o mesmo — muda o paralelismo.
          </p>
        </ScrollReveal>

        <ScrollReveal className="plans-capacity" delay={80}>
          <div>
            <strong>1</strong>
            <span>Starter</span>
          </div>
          <div>
            <strong>3</strong>
            <span>Advanced</span>
          </div>
          <div>
            <strong>∞</strong>
            <span>Premium</span>
          </div>
        </ScrollReveal>

        <div className="plans-grid-cards">
          {PLANS.map((plan, index) => (
            <ScrollReveal
              key={plan.id}
              as="article"
              className={`plan-card ${plan.highlight ? 'plan-card--featured' : ''}`}
              delay={index * 100}
              variant="scale"
            >
              {plan.highlight && <span className="plan-card-ribbon">Mais popular</span>}
              <div className="plan-card-top">
                <h3>{plan.name}</h3>
                <span className="plan-card-tagline">{plan.tagline}</span>
              </div>
              <ProjectsVisual count={plan.maxProjects} />
              <p className="plan-card-price">{plan.price}</p>
              <p className="plan-card-desc">{plan.description}</p>
              <ul className="plan-card-features">
                {plan.features.map((f) => (
                  <li key={f}>
                    <Check size={16} aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <PlanCheckoutButton
                planId={plan.id as PlanId}
                className={`plans-btn ${plan.highlight ? 'plans-btn--primary' : 'plans-btn--outline'} plans-btn--block`}
              >
                {plan.cta}
              </PlanCheckoutButton>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section id="fluxo" className="plans-section plans-flow">
        <ScrollReveal className="plans-section-head">
          <span className="plans-eyebrow">Método</span>
          <h2>Quatro ondas. Uma memória.</h2>
          <p>Cada etapa alimenta a seguinte — nada se perde entre diagnóstico e resultado.</p>
        </ScrollReveal>
        <div className="plans-flow-rail">
          {[
            {
              step: '01',
              title: 'Diagnóstico',
              icon: Sparkles,
              text: 'Leitura profunda da organização com memória persistente.',
            },
            {
              step: '02',
              title: 'Design',
              icon: GitBranch,
              text: 'Gate Zero e blueprint conectados ao contexto do ciclo.',
            },
            {
              step: '03',
              title: 'Difusão',
              icon: Zap,
              text: 'Action Canvas, equipe e objetivos no mesmo fio narrativo.',
            },
            {
              step: '04',
              title: 'Intelligence Dashboard',
              icon: Layers,
              text: 'Health Score, sinais de risco e recomendações da IA para o próximo passo.',
            },
          ].map((item, i) => (
            <ScrollReveal key={item.step} className="plans-flow-card" delay={i * 90} variant="left">
              <span className="plans-flow-step">{item.step}</span>
              <item.icon size={22} aria-hidden />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section id="tecnologia" className="plans-section plans-tech">
        <ScrollReveal className="plans-tech-panel" variant="up">
          <div className="plans-tech-copy">
            <span className="plans-eyebrow">Produto</span>
            <h2>Feito para decidir e executar — não só para visualizar</h2>
            <p>
              Interface editorial, bronze Sprint e operações autenticadas. Planos claros de
              capacidade; a inteligência permanece no mesmo sistema do dia a dia.
            </p>
            <ul className="plans-tech-list">
              <li>
                <Shield size={18} />
                Sessões autenticadas e dados por usuário
              </li>
              <li>
                <Cpu size={18} />
                Capacidade alinhada ao plano contratado
              </li>
              <li>
                <Sparkles size={18} />
                IA + memória Sprint Waves entre as ondas
              </li>
            </ul>
          </div>
          <div className="plans-tech-visual" aria-hidden>
            <div className="plans-tech-ring" />
            <div className="plans-tech-core">
              <span>Diagnóstico</span>
              <span className="plans-tech-divider" />
              <span>Design</span>
              <span className="plans-tech-divider" />
              <span>Difusão</span>
              <span className="plans-tech-divider" />
              <span>ID</span>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <section className="plans-section plans-cta-final">
        <ScrollReveal className="plans-cta-box" variant="scale">
          <h2>Pronto para iniciar a próxima onda?</h2>
          <p>Comece no Starter, evolua com a equipe no Advanced ou libere escala no Premium.</p>
          <div className="plans-hero-actions">
            <a href="#planos" className="plans-btn plans-btn--primary plans-btn--lg">
              Ver planos
              <ArrowRight size={18} />
            </a>
            <ViewTransitionLink to="/login" className="plans-btn plans-btn--ghost plans-btn--lg">
              Já tenho acesso
            </ViewTransitionLink>
          </div>
        </ScrollReveal>
      </section>

      <footer className="plans-footer">
        <p>© {new Date().getFullYear()} Sprint · Sprint Waves™</p>
        <div className="plans-footer-links">
          <ViewTransitionLink to="/login">Login</ViewTransitionLink>
          <a href="https://magnusmind.io" target="_blank" rel="noreferrer">
            Magnus Mind
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="plans-footer-instagram"
          >
            <Instagram size={15} aria-hidden />
            @magnusmind.io
          </a>
        </div>
      </footer>
    </div>
  );
}
