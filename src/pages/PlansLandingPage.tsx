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
import { PlanCheckoutButton } from '../components/PlanCheckoutButton';
import { useLocale } from '../context/LocaleContext';
import type { Locale } from '../constants/locales';
import type { PlanId } from '../constants/plans';
import { landingTranslations } from '../i18n/landingTranslations';

const METHOD_ICONS = [Compass, LayoutGrid, Radio, Sparkles] as const;
const FEATURED_PLAN_ID = 'advanced';

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
  const { locale } = useLocale();
  const copy = landingTranslations[locale];

  return (
    <div id="top" className="sw-landing">
      <header className="sw-header">
        <div className="sw-container sw-header-inner">
          <a href="#top" className="sw-logo">
            <span className="sw-logo-icon">
              <img src="/icone-magnusmind.svg" alt="" width={24} height={22} aria-hidden />
            </span>
            <span>Sprint</span>
          </a>

          <nav className="sw-nav" aria-label="Principal">
            <a href="#about">{copy.nav.about}</a>
            <a href="#method">{copy.nav.method}</a>
            <a href="#pricing">{copy.nav.pricing}</a>
          </nav>

          <div className="sw-header-actions">
            <LocaleSwitcher />
            <ViewTransitionLink to="/login" className="sw-link-ghost">
              {copy.nav.signIn}
            </ViewTransitionLink>
            <a href="#pricing" className="sw-btn sw-btn--gold">
              {copy.nav.start}
            </a>
          </div>
        </div>
      </header>

      <section className="sw-hero sw-hero-radial" aria-label="Sprint">
        <div className="sw-container sw-hero-grid">
          <div>
            <p className="sw-eyebrow">{copy.hero.eyebrow}</p>
            <h1>
              {copy.hero.title}
              <br />
              <span className="sw-serif">{copy.hero.titleSerif}</span>
            </h1>
            <p className="sw-hero-lead">{copy.hero.lead}</p>
            <div className="sw-hero-actions">
              <a href="#pricing" className="sw-btn sw-btn--gold sw-btn--gold-lg">
                {copy.hero.ctaPrimary}
                <ArrowRight size={16} aria-hidden />
              </a>
              <a href="#method" className="sw-btn sw-btn--outline">
                {copy.hero.ctaSecondary}
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
              <p className="sw-hero-badge-label">{copy.hero.badgeLabel}</p>
              <p className="sw-hero-badge-text">{copy.hero.badgeText}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="sw-section sw-section--border-top sw-about">
        <div className="sw-container">
          <p className="sw-eyebrow">{copy.about.eyebrow}</p>
          <h2>
            {copy.about.title}
            <br />
            <span className="sw-serif">{copy.about.titleSerif}</span>
          </h2>
          <div className="sw-about-copy">
            {copy.about.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 32)}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      <section id="method" className="sw-section sw-navy-section">
        <div className="sw-container">
          <div className="sw-section-head">
            <p className="sw-eyebrow">{copy.method.eyebrow}</p>
            <h2>
              {copy.method.titlePre}
              <span className="sw-serif">{copy.method.titleSerif}</span>
              {copy.method.titlePost}
            </h2>
            <p className="sw-section-lead">{copy.method.lead}</p>
          </div>

          <div className="sw-method-grid">
            {copy.method.steps.map((item, index) => {
              const Icon = METHOD_ICONS[index] ?? Sparkles;
              const step = `0${index + 1}`;
              return (
                <article key={item.title} className="sw-method-card">
                  <div className="sw-method-card-top">
                    <div className="sw-method-icon">
                      <Icon size={20} aria-hidden />
                    </div>
                    <span className="sw-method-step">{step}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              );
            })}
          </div>

          <div className="sw-id-banner">
            <div className="sw-id-banner-icon">
              <ChartLine size={24} aria-hidden />
            </div>
            <div>
              <h3>{copy.method.idTitle}</h3>
              <p>{copy.method.idText}</p>
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
              <p className="sw-float-badge-label">{copy.learn.badgeLabel}</p>
              <p className="sw-float-badge-text">{copy.learn.badgeText}</p>
            </div>
          </div>

          <div className="sw-split-copy">
            <h2>
              {copy.learn.title}
              <br />
              <span className="sw-serif">{copy.learn.titleSerif}</span>
            </h2>
            <p className="sw-section-lead">{copy.learn.lead}</p>
            <ul className="sw-checklist">
              {copy.learn.features.map((feature) => (
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
            <p className="sw-eyebrow">{copy.decisions.eyebrow}</p>
            <h2>
              {copy.decisions.title}
              <br />
              <span className="sw-serif">{copy.decisions.titleSerif}</span>
            </h2>
            <div className="sw-decisions-copy">
              {copy.decisions.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 32)}>{paragraph}</p>
              ))}
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
            <h2>{copy.pricing.title}</h2>
            <p className="sw-section-lead">{copy.pricing.lead}</p>
            <p className="sw-pricing-tagline">{copy.pricing.tagline}</p>
          </div>

          <div className="sw-pricing-grid">
            {copy.pricing.plans.map((plan) => {
              const featured = plan.id === FEATURED_PLAN_ID;
              return (
                <article
                  key={plan.id}
                  className={`sw-pricing-card ${featured ? 'sw-pricing-card--featured' : ''}`}
                >
                  {featured ? <span className="sw-pricing-star" aria-hidden>★</span> : null}
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
                  <PlanCheckoutButton
                    planId={plan.id as PlanId}
                    className={`sw-btn ${featured ? 'sw-btn--gold' : 'sw-btn--outline-card'} sw-btn--block`}
                  >
                    {copy.pricing.contact}
                  </PlanCheckoutButton>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="cta" className="sw-section sw-cta sw-hero-radial sw-section--border-top">
        <div className="sw-container" style={{ maxWidth: '56rem' }}>
          <h2>
            {copy.cta.title} <span className="sw-serif">{copy.cta.titleSerif}</span>
          </h2>
          <p className="sw-cta-lead">{copy.cta.lead}</p>
          <div className="sw-cta-actions">
            <a href="#pricing" className="sw-btn sw-btn--gold sw-btn--gold-xl">
              {copy.cta.button}
              <ArrowRight size={16} aria-hidden />
            </a>
          </div>
        </div>
      </section>

      <footer className="sw-footer">
        <div className="sw-container sw-footer-inner">
          <div className="sw-footer-grid">
            <div className="sw-footer-brand">
              <div className="sw-logo">
                <span className="sw-logo-icon">
                  <img src="/icone-magnusmind.svg" alt="" width={24} height={22} aria-hidden />
                </span>
                <span>Sprint</span>
              </div>
              <p>{copy.footer.tagline}</p>
            </div>

            <div>
              <h4>{copy.footer.ecosystem}</h4>
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
              <h4>{copy.footer.sprintColumn}</h4>
              <ul className="sw-footer-links">
                <li>
                  <a href="#method">{copy.footer.method}</a>
                </li>
                <li>
                  <a href="#pricing">{copy.footer.pricing}</a>
                </li>
                <li>
                  <a href="#cta">{copy.footer.start}</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="sw-footer-bottom">
            <span>
              © {new Date().getFullYear()} Magnus Mind. {copy.footer.rights}
            </span>
            <span className="sw-footer-mark">MAGNUS MIND · SPRINT</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
