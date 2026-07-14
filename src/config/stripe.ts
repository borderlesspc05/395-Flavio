/** Chave publicável Stripe (bundle do Vite). Nunca use sk_ no frontend. */
export const STRIPE_PUBLISHABLE_KEY =
  (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined)?.trim() || '';

export const isStripePublishableConfigured = Boolean(
  STRIPE_PUBLISHABLE_KEY.startsWith('pk_'),
);
