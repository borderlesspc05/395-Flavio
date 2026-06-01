import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CursorGlowBackground } from './CursorGlowBackground';

interface AuthLayoutProps {
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  backTo?: { href: string; label: string };
}

export function AuthLayout({ title, children, footer, backTo }: AuthLayoutProps) {
  return (
    <div className="auth-page">
      <CursorGlowBackground />
      <div className="auth-container">
        <div className="auth-card auth-card-vivid">
          <div className="auth-logo">
            <img
              src="/icone-magnusmind.svg"
              alt="Magnus Mind Icon"
              className="logo-icon"
              style={{ width: 80, height: 80 }}
            />
            <h1 className="auth-title">magnus mind</h1>
          </div>
          {backTo && (
            <nav className="auth-toolbar" aria-label="Navegação da página">
              <Link to={backTo.href} className="auth-btn auth-btn--back">
                <span className="auth-btn-icon" aria-hidden>
                  <ArrowLeft size={18} strokeWidth={2} />
                </span>
                <span className="auth-btn-label">{backTo.label}</span>
              </Link>
            </nav>
          )}
          <h2 className="auth-title auth-form-heading">
            {title}
          </h2>
          {children}
          <p className="auth-footer">{footer}</p>
        </div>
      </div>
    </div>
  );
}
