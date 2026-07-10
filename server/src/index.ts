import app from './app';
import { env } from './config/env';
import { isEmailConfigured, isResendSandboxFrom } from './services/email';
import { isStripeConfigured } from './services/stripeBilling';

const port = env.port;

const host = process.env.HOST ?? '0.0.0.0';

app.listen(port, host, () => {
  console.log(`[magnusmind] Server listening on http://localhost:${port}`);
  if (host === '0.0.0.0') {
    console.log(`[magnusmind] LAN: use http://<seu-ip>:${port} (celular na mesma rede)`);
  }
  console.log(`[magnusmind] Environment: ${env.nodeEnv}`);
  if (isStripeConfigured()) {
    console.log('[magnusmind] Stripe: configurado (Checkout hospedado)');
  } else {
    console.log('[magnusmind] Stripe: NÃO configurado — checkout usará /mock-checkout');
  }
  if (isEmailConfigured() && env.email.resendApiKey) {
    if (isResendSandboxFrom()) {
      const testHint = env.email.testRecipient
        ? ` (dev: redirecionando para ${env.email.testRecipient})`
        : ' — defina EMAIL_FROM ou RESEND_TEST_RECIPIENT';
      console.log(`[magnusmind] Resend: modo sandbox (onboarding@resend.dev)${testHint}`);
    } else {
      console.log(`[magnusmind] Resend: configurado (remetente: ${env.email.from})`);
    }
  } else if (!isEmailConfigured()) {
    console.log('[magnusmind] E-mail: modo demonstração (sem RESEND_API_KEY)');
  }
});
