import { FormEvent, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import {
  ArrowRight,
  Check,
  Globe2,
  KeyRound,
  Loader2,
  Shield,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { auth } from '../config/firebase';
import { useLocale } from '../context/LocaleContext';
import { usePlan } from '../context/PlanContext';
import { LOCALES, LOCALE_LABELS, type Locale } from '../constants/locales';
import { translations } from '../i18n/translations';

const LOCALE_MONOGRAM: Record<Locale, string> = {
  pt: 'Pt',
  en: 'En',
  es: 'Es',
};

function formatMemberDate(iso: string | undefined, locale: Locale): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const tag = locale === 'pt' ? 'pt-BR' : locale === 'es' ? 'es-ES' : 'en-US';
  return d.toLocaleDateString(tag, { day: '2-digit', month: 'long', year: 'numeric' });
}

function getInitials(name: string, email: string): string {
  const trimmed = name.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
    return `${first}${second}`.toUpperCase() || '?';
  }
  return email[0]?.toUpperCase() ?? '?';
}

function firebasePasswordError(
  code: string,
  errors: {
    wrongPassword: string;
    requiresRecentLogin: string;
    generic: string;
  }
): string {
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return errors.wrongPassword;
  }
  if (code === 'auth/requires-recent-login') {
    return errors.requiresRecentLogin;
  }
  return errors.generic;
}

function StatusBanner({
  kind,
  children,
}: {
  kind: 'success' | 'error';
  children: string;
}) {
  return (
    <p className={`account-banner account-banner--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {kind === 'success' && <Check size={16} aria-hidden />}
      {children}
    </p>
  );
}

export function AccountPage() {
  const { locale, setLocale, t } = useLocale();
  const { plan, loading: planLoading, concurrencyLabel } = usePlan();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [memberSince, setMemberSince] = useState<string | undefined>();
  const [authLoading, setAuthLoading] = useState(true);

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [languageMessage, setLanguageMessage] = useState('');

  const initials = useMemo(() => getInitials(displayName, email), [displayName, email]);
  const planId = plan?.planId ?? 'starter';

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthLoading(true);
      if (user) {
        setDisplayName(user.displayName ?? '');
        setEmail(user.email ?? '');
        setMemberSince(user.metadata.creationTime);
      } else {
        setDisplayName('');
        setEmail('');
        setMemberSince(undefined);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
    setProfileSaving(true);
    setProfileMessage('');
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      setProfileMessage(t.account.profileSaved);
    } catch {
      setProfileMessage(t.account.errors.generic);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordMessage('');

    if (newPassword.length < 6) {
      setPasswordError(t.account.errors.passwordWeak);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t.account.errors.passwordMismatch);
      return;
    }

    const user = auth.currentUser;
    if (!user?.email) return;

    setPasswordSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage(t.account.passwordChanged);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      setPasswordError(firebasePasswordError(code, t.account.errors));
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleLanguageChange = (next: Locale) => {
    setLocale(next);
    setLanguageMessage(translations[next].account.languageSaved);
    window.setTimeout(() => setLanguageMessage(''), 2800);
  };

  const passwordStrength =
    newPassword.length === 0 ? 0 : newPassword.length < 6 ? 1 : newPassword.length < 10 ? 2 : 3;

  return (
    <div className="account-page">
      <div className="account-atmosphere" aria-hidden>
        <div className="account-orb account-orb--gold" />
        <div className="account-orb account-orb--warm" />
        <div className="account-diagonal" />
        <div className="account-grain" />
      </div>

      <header className="account-hero account-reveal">
        <div className="account-hero-copy">
          <p className="account-kicker">
            <Sparkles size={14} aria-hidden />
            {t.account.eyebrow}
          </p>
          <h1>{t.account.title}</h1>
          <p className="account-lede">{t.account.subtitle}</p>
        </div>
        <div className="account-hero-rule" aria-hidden />
      </header>

      <div className="account-layout">
        <aside className="account-identity account-reveal account-reveal--1">
          <div className="account-identity-frame">
            {authLoading ? (
              <div className="account-identity-skeleton" aria-busy="true">
                <div className="account-skel-avatar" />
                <div className="account-skel-line account-skel-line--wide" />
                <div className="account-skel-line" />
              </div>
            ) : (
              <>
                <div className="account-avatar-ring">
                  <div className="account-avatar" aria-hidden>
                    {initials}
                  </div>
                </div>
                <h2 className="account-identity-name">{displayName.trim() || email}</h2>
                <p className="account-identity-email">{email}</p>
                <div className={`account-plan-pill account-plan-pill--${planId}`}>
                  <Shield size={14} aria-hidden />
                  <span>
                    {planLoading ? t.account.planLoading : (plan?.planName ?? 'Starter')}
                  </span>
                </div>
                {!planLoading && (
                  <p className="account-plan-meta">{concurrencyLabel}</p>
                )}
                <dl className="account-identity-stats">
                  <div>
                    <dt>{t.account.memberSince}</dt>
                    <dd>{formatMemberDate(memberSince, locale)}</dd>
                  </div>
                  <div>
                    <dt>{t.account.language}</dt>
                    <dd>{LOCALE_LABELS[locale]}</dd>
                  </div>
                </dl>
              </>
            )}
          </div>
        </aside>

        <div className="account-settings">
          <section className="account-panel account-reveal account-reveal--2" aria-labelledby="acc-profile">
            <div className="account-panel-head">
              <span className="account-panel-index">01</span>
              <div className="account-panel-title">
                <UserRound size={18} aria-hidden />
                <div>
                  <h2 id="acc-profile">{t.account.profileSection}</h2>
                  <p>{t.account.profileHint}</p>
                </div>
              </div>
            </div>

            {authLoading ? (
              <p className="account-muted">{t.account.loading}</p>
            ) : (
              <form className="account-fields" onSubmit={(e) => void handleSaveProfile(e)}>
                <div className="account-field">
                  <label htmlFor="acc-name">{t.account.name}</label>
                  <input
                    id="acc-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    autoComplete="name"
                    placeholder={t.account.name}
                  />
                </div>
                <div className="account-field account-field--readonly">
                  <label htmlFor="acc-email">{t.account.email}</label>
                  <input id="acc-email" type="email" value={email} readOnly aria-readonly />
                  <span className="account-field-note">{t.account.emailHint}</span>
                </div>
                {profileMessage && (
                  <StatusBanner kind={profileMessage === t.account.profileSaved ? 'success' : 'error'}>
                    {profileMessage}
                  </StatusBanner>
                )}
                <button
                  type="submit"
                  className="account-action account-action--primary"
                  disabled={profileSaving}
                >
                  {profileSaving ? (
                    <>
                      <Loader2 size={16} className="account-spin" aria-hidden />
                      {t.account.loading}
                    </>
                  ) : (
                    <>
                      {t.account.saveProfile}
                      <ArrowRight size={16} aria-hidden />
                    </>
                  )}
                </button>
              </form>
            )}
          </section>

          <section className="account-panel account-reveal account-reveal--3" aria-labelledby="acc-security">
            <div className="account-panel-head">
              <span className="account-panel-index">02</span>
              <div className="account-panel-title">
                <KeyRound size={18} aria-hidden />
                <div>
                  <h2 id="acc-security">{t.account.securitySection}</h2>
                  <p>{t.account.securityHint}</p>
                </div>
              </div>
            </div>

            <form className="account-fields account-fields--security" onSubmit={(e) => void handleChangePassword(e)}>
              <div className="account-field">
                <label htmlFor="acc-current-pw">{t.account.currentPassword}</label>
                <input
                  id="acc-current-pw"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="account-password-grid">
                <div className="account-field">
                  <label htmlFor="acc-new-pw">{t.account.newPassword}</label>
                  <input
                    id="acc-new-pw"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                </div>
                <div className="account-field">
                  <label htmlFor="acc-confirm-pw">{t.account.confirmPassword}</label>
                  <input
                    id="acc-confirm-pw"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                </div>
              </div>
              {newPassword.length > 0 && (
                <div className="account-strength" aria-hidden>
                  <span className={`account-strength-bar ${passwordStrength >= 1 ? 'on' : ''}`} />
                  <span className={`account-strength-bar ${passwordStrength >= 2 ? 'on' : ''}`} />
                  <span className={`account-strength-bar ${passwordStrength >= 3 ? 'on' : ''}`} />
                </div>
              )}
              {passwordError && <StatusBanner kind="error">{passwordError}</StatusBanner>}
              {passwordMessage && <StatusBanner kind="success">{passwordMessage}</StatusBanner>}
              <button
                type="submit"
                className="account-action account-action--primary"
                disabled={passwordSaving}
              >
                {passwordSaving ? (
                  <>
                    <Loader2 size={16} className="account-spin" aria-hidden />
                    {t.account.loading}
                  </>
                ) : (
                  <>
                    {t.account.changePassword}
                    <ArrowRight size={16} aria-hidden />
                  </>
                )}
              </button>
            </form>
          </section>

          <section className="account-panel account-panel--locale account-reveal account-reveal--4" aria-labelledby="acc-locale">
            <div className="account-panel-head">
              <span className="account-panel-index">03</span>
              <div className="account-panel-title">
                <Globe2 size={18} aria-hidden />
                <div>
                  <h2 id="acc-locale">{t.account.preferencesSection}</h2>
                  <p>{t.account.preferencesHint}</p>
                </div>
              </div>
            </div>

            <p className="account-locale-label">{t.account.language}</p>
            <div className="account-locale-grid" role="radiogroup" aria-label={t.account.language}>
              {LOCALES.map((code) => {
                const active = locale === code;
                return (
                  <button
                    key={code}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`account-locale-card ${active ? 'is-active' : ''}`}
                    onClick={() => handleLanguageChange(code)}
                  >
                    <span className="account-locale-monogram">{LOCALE_MONOGRAM[code]}</span>
                    <span className="account-locale-name">{LOCALE_LABELS[code]}</span>
                    <span className="account-locale-code">{code}</span>
                    {active && (
                      <span className="account-locale-active" aria-hidden>
                        <Check size={14} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {languageMessage && <StatusBanner kind="success">{languageMessage}</StatusBanner>}
          </section>
        </div>
      </div>
    </div>
  );
}
