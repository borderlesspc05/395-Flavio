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

const INSTAGRAM_URL = 'https://www.instagram.com/magnusmind.io/';
import { ScrollReveal } from '../components/ScrollReveal';
import { PlanCheckoutButton } from '../components/PlanCheckoutButton';
import type { PlanId } from '../constants/plans';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Foco total',
    concurrency: 1,
    price: 'Ideal para começar',
    description:
      'Uma requisição por vez na IA e nas operações paralelas do fluxo Magnus Waves — perfeito para validar o método com clareza.',
    features: [
      '1 requisição simultânea',
      'Consultoria IA + memória do diagnóstico',
      'Action Canvas manual e com IA',
      'Objetivos estratégicos',
    ],
    cta: 'Começar com Starter',
    highlight: false,
  },
  {
    id: 'advanced',
    name: 'Advanced',
    tagline: 'Velocidade em equipe',
    concurrency: 3,
    price: 'Mais fluxo, menos espera',
    description:
      'Até três requisições em paralelo: gere sugestões, converse com a IA e sincronize dados sem fila única.',
    features: [
      '3 requisições simultâneas',
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
    concurrency: null,
    price: 'Escala sem fricção',
    description:
      'Concorrência ilimitada para organizações que executam Magnus Waves em múltiplas frentes ao mesmo tempo.',
    features: [
      'Requisições ilimitadas em paralelo',
      'Tudo do Advanced',
      'Suporte a squads e consultorias',
      'Memória Magnus Waves completa',
    ],
    cta: 'Assinar Premium',
    highlight: false,
  },
] as const;

function ConcurrencyVisual({ count }: { count: number | null }) {
  if (count === null) {
    return (
      <div className="plan-concurrency plan-concurrency--unlimited" aria-hidden>
        <Infinity size={28} strokeWidth={1.75} />
        <span>∞ paralelo</span>
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
      <span>
        {count} {count === 1 ? 'requisição' : 'requisições'} por vez
      </span>
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
        <div className="plans-scanline" />
      </div>

      <header className="plans-nav scroll-reveal is-visible">
        <ViewTransitionLink to="/" className="plans-logo">
          <img src="/icone-magnusmind.svg" alt="" width={36} height={36} />
          <span>
            Magnus <strong>Mind</strong>
          </span>
        </ViewTransitionLink>
        <nav className="plans-nav-links">
          <a href="#planos">Planos</a>
          <a href="#fluxo">Fluxo</a>
          <a href="#tecnologia">Tecnologia</a>
        </nav>
        <div className="plans-nav-cta">
          <ViewTransitionLink to="/login" className="plans-btn plans-btn--primary">
            Entrar
          </ViewTransitionLink>
        </div>
      </header>

      <section className="plans-hero">
        <ScrollReveal className="plans-hero-badge" delay={0}>
          <Cpu size={14} />
          Magnus Waves™ · People Sprint 90+
        </ScrollReveal>
        <ScrollReveal as="h1" className="plans-hero-title" delay={80}>
          Planos de <em>concorrência</em> para a sua consultoria com IA
        </ScrollReveal>
        <ScrollReveal className="plans-hero-lead" delay={160}>
          O mesmo universo visual do app Magnus Mind — diagnóstico, Design, Difusão e MID — com
          limites claros de <strong>requisições paralelas</strong> conforme o seu ritmo de execução.
        </ScrollReveal>
        <ScrollReveal className="plans-hero-actions" delay={240}>
          <a href="#planos" className="plans-btn plans-btn--primary plans-btn--lg">
            Ver planos
            <ArrowRight size={18} />
          </a>
          <ViewTransitionLink to="/login" className="plans-btn plans-btn--outline plans-btn--lg">
            Já paguei — entrar
          </ViewTransitionLink>
        </ScrollReveal>
        <ScrollReveal className="plans-hero-metrics" delay={320}>
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
      </section>

      <section id="planos" className="plans-section plans-pricing">
        <ScrollReveal className="plans-section-head">
          <span className="plans-eyebrow">Planos</span>
          <h2>Escolha quantas requisições rodam ao mesmo tempo</h2>
          <p>
            Cada plano define quantas chamadas à API e à IA podem executar em paralelo — sem
            travar o restante do fluxo Magnus Waves.
          </p>
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
              <ConcurrencyVisual count={plan.concurrency} />
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
          <span className="plans-eyebrow">Integrado ao app</span>
          <h2>Mesmo método. Mesma memória. Mais ou menos paralelismo.</h2>
        </ScrollReveal>
        <div className="plans-flow-grid">
          {[
            { step: '01', title: 'Diagnóstico', icon: Sparkles, text: 'Human-to-Business Canvas com memória persistente para a IA.' },
            { step: '02', title: 'Design', icon: GitBranch, text: 'Gate Zero e MM Blueprint conectados à Consultoria IA.' },
            { step: '03', title: 'Difusão', icon: Zap, text: 'Action Canvas, execução e objetivos com contexto unificado.' },
            { step: '04', title: 'MID', icon: Layers, text: 'Sign-off e visão de impacto no hub executivo.' },
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
            <span className="plans-eyebrow">Stack Magnus Mind</span>
            <h2>Interface tecnológica, intuitiva e preparada para escala</h2>
            <p>
              Scroll reveal, tipografia editorial e bronze Magnus — a landing reflete o produto que
              você já usa no dashboard, com ênfase em performance e clareza de limites por plano.
            </p>
            <ul className="plans-tech-list">
              <li>
                <Shield size={18} />
                Requisições autenticadas por usuário
              </li>
              <li>
                <Cpu size={18} />
                Filas inteligentes conforme o plano contratado
              </li>
              <li>
                <Sparkles size={18} />
                OpenRouter + memória Magnus Waves
              </li>
            </ul>
          </div>
          <div className="plans-tech-visual" aria-hidden>
            <div className="plans-tech-ring" />
            <div className="plans-tech-core">
              <span>Starter</span>
              <span className="plans-tech-divider" />
              <span>Advanced</span>
              <span className="plans-tech-divider" />
              <span>Premium</span>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <section className="plans-section plans-cta-final">
        <ScrollReveal className="plans-cta-box" variant="scale">
          <h2>Pronto para acelerar o Magnus Waves?</h2>
          <p>Comece no Starter, evolua para Advanced ou desbloqueie paralelismo ilimitado no Premium.</p>
          <div className="plans-hero-actions">
            <a href="#planos" className="plans-btn plans-btn--primary plans-btn--lg">
              Escolher um plano
              <ArrowRight size={18} />
            </a>
            <ViewTransitionLink to="/login" className="plans-btn plans-btn--ghost plans-btn--lg">
              Já tenho acesso
            </ViewTransitionLink>
          </div>
        </ScrollReveal>
      </section>

      <footer className="plans-footer">
        <p>© {new Date().getFullYear()} Magnus Mind · Magnus Waves™</p>
        <div className="plans-footer-links">
          <ViewTransitionLink to="/admin/login">Admin</ViewTransitionLink>
          <ViewTransitionLink to="/login">Login</ViewTransitionLink>
          <a href="https://magnusmind.io" target="_blank" rel="noreferrer">
            magnusmind.io
          </a>
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="plans-footer-instagram">
            <Instagram size={15} aria-hidden />
            @magnusmind.io
          </a>
        </div>
      </footer>
    </div>
  );
}
