import { ViewTransitionLink } from './navigation/ViewTransitionLink';
import { ArrowLeft } from 'lucide-react';
import { CursorGlowBackground } from './CursorGlowBackground';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  backTo?: { href: string; label: string };
  cardClassName?: string;
}

export function AuthLayout({ title, subtitle, children, footer, backTo, cardClassName }: AuthLayoutProps) {
  const isProjectsPage = cardClassName?.includes('projects');

  return (
    <div
      className={`auth-page auth-page--refined${isProjectsPage ? ' auth-page--projects' : ''}`}
    >
      <CursorGlowBackground />
      {backTo && (
        <ViewTransitionLink to={backTo.href} className="auth-page-back">
          <ArrowLeft size={16} aria-hidden />
          <span>{backTo.label}</span>
        </ViewTransitionLink>
      )}
      <div className="auth-container">
        <div className={`auth-card auth-card-vivid auth-card--compact${cardClassName ? ` ${cardClassName}` : ''}`}>
          <header className="auth-card-head">
            <img
              src="/icone-magnusmind.svg"
              alt=""
              className="auth-card-mark"
              width={44}
              height={44}
            />
            <div className="auth-card-head-copy">
              <p className="auth-eyebrow">Magnus Mind</p>
              <h1 className="auth-form-heading">{title}</h1>
              {subtitle ? <p className="auth-card-sub">{subtitle}</p> : null}
            </div>
          </header>
          {children}
          {footer ? <p className="auth-footer">{footer}</p> : null}
        </div>
      </div>
    </div>
  );
}
