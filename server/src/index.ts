import app from './app';
import { env } from './config/env';
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
});
