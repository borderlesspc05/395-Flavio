import app from './app';
import { env } from './config/env';
import { isStripeConfigured } from './services/stripeBilling';

const port = env.port;

app.listen(port, () => {
  console.log(`[magnusmind] Server listening on http://localhost:${port}`);
  console.log(`[magnusmind] Environment: ${env.nodeEnv}`);
  if (isStripeConfigured()) {
    console.log('[magnusmind] Stripe: configurado (Checkout hospedado)');
  } else {
    console.log('[magnusmind] Stripe: NÃO configurado — checkout usará /mock-checkout');
  }
});
