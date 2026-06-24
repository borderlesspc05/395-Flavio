import { CircleAlert } from 'lucide-react';

type Props = {
  configured: boolean | null;
  unreachable: boolean;
  /** Texto extra quando a IA não está configurada (opcional) */
  notConfiguredDetail?: string;
  className?: string;
};

export function AiStatusAlert({
  configured,
  unreachable,
  notConfiguredDetail,
  className = 'domain-wave-alert domain-wave-alert--warning',
}: Props) {
  if (unreachable) {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'seu domínio';
    return (
      <div className={className} role="status">
        <CircleAlert size={18} aria-hidden />
        <div>
          <strong>API do servidor inacessível</strong>
          <p>
            O frontend não conseguiu falar com o backend. Em desenvolvimento, rode{' '}
            <code>npm run dev:api</code> na pasta <code>server</code> (além do{' '}
            <code>npm run dev</code>). Em produção, no Render adicione{' '}
            <code>{origin}</code> em <code>CORS_ORIGIN</code> e faça redeploy.
          </p>
        </div>
      </div>
    );
  }

  if (configured !== false) return null;

  return (
    <div className={className} role="status">
      <CircleAlert size={18} aria-hidden />
      <div>
        <strong>IA não configurada no servidor</strong>
        <p>
          {notConfiguredDetail ??
            'Recursos com IA exigem OPENROUTER_API_KEY ou OPENAI_API_KEY no backend (Render ou server/.env).'}
        </p>
      </div>
    </div>
  );
}
