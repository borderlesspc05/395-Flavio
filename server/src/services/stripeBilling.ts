import Stripe from 'stripe';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
import { isPlanId, type PlanId } from './plans';
import { upsertSubscriptionFromCheckout } from './subscriptions';

let stripeClient: ReturnType<typeof Stripe> | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(env.stripe.secretKey);
}

function getStripe(): ReturnType<typeof Stripe> {
  if (!env.stripe.secretKey) {
    throw new AppError(503, 'Pagamentos Stripe não configurados no servidor.');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(env.stripe.secretKey);
  }
  return stripeClient;
}

function priceIdForPlan(planId: PlanId): string {
  const map: Record<PlanId, string | undefined> = {
    starter: env.stripe.priceStarter,
    advanced: env.stripe.priceAdvanced,
    premium: env.stripe.pricePremium,
  };
  const priceId = map[planId];
  if (!priceId) {
    throw new AppError(
      503,
      `Preço Stripe não configurado para o plano ${planId}. Defina STRIPE_PRICE_${planId.toUpperCase()}.`
    );
  }
  return priceId;
}

export async function createCheckoutSession(planId: string): Promise<{ url: string; sessionId: string }> {
  if (!isPlanId(planId)) {
    throw new AppError(400, 'Plano inválido. Use starter, advanced ou premium.');
  }

  if (!isStripeConfigured()) {
    const sessionId = `demo_${planId}_${Date.now()}`;
    const url = `${env.frontendUrl}/mock-checkout?session_id=${encodeURIComponent(sessionId)}&plan=${planId}&demo=1`;
    return { url, sessionId };
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    locale: 'pt-BR',
    payment_method_types: ['card'],
    line_items: [{ price: priceIdForPlan(planId), quantity: 1 }],
    success_url: `${env.frontendUrl}/register?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.frontendUrl}/planos?payment=cancelled`,
    metadata: { planId },
    subscription_data: {
      metadata: { planId },
    },
  });

  if (!session.url) {
    throw new AppError(500, 'Não foi possível iniciar o checkout Stripe.');
  }

  return { url: session.url, sessionId: session.id };
}

export async function fulfillCheckoutSession(sessionId: string): Promise<{
  email: string;
  planId: PlanId;
} | null> {
  if (sessionId.startsWith('demo_')) {
    const match = sessionId.match(/^demo_(starter|advanced|premium)_/);
    if (!match || !isPlanId(match[1])) return null;
    return { email: '', planId: match[1] };
  }

  if (!isStripeConfigured()) return null;

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription'],
  });

  if (session.payment_status !== 'paid' && session.status !== 'complete') {
    return null;
  }

  const planIdRaw = session.metadata?.planId;
  if (!planIdRaw || !isPlanId(planIdRaw)) {
    throw new AppError(400, 'Sessão de pagamento sem plano válido.');
  }

  const email =
    session.customer_details?.email ??
    session.customer_email ??
    '';

  if (!email) {
    throw new AppError(400, 'Email não encontrado na sessão de pagamento.');
  }

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;

  await upsertSubscriptionFromCheckout({
    email,
    planId: planIdRaw,
    stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
    stripeSubscriptionId: subscriptionId,
    stripeCheckoutSessionId: session.id,
  });

  return { email, planId: planIdRaw };
}

export async function handleStripeWebhook(
  rawBody: Buffer,
  signature: string | undefined
): Promise<void> {
  if (!env.stripe.webhookSecret) {
    throw new AppError(503, 'STRIPE_WEBHOOK_SECRET não configurado.');
  }
  if (!signature) {
    throw new AppError(400, 'Assinatura Stripe ausente.');
  }

  const stripe = getStripe();
  const event = stripe.webhooks.constructEvent(rawBody, signature, env.stripe.webhookSecret);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as {
        metadata?: { planId?: string };
        customer_details?: { email?: string | null };
        customer_email?: string | null;
        customer?: string | { id?: string };
        subscription?: string | { id?: string };
        id: string;
      };
      const planIdRaw = session.metadata?.planId;
      const email = session.customer_details?.email ?? session.customer_email;
      if (!email || !planIdRaw || !isPlanId(planIdRaw)) break;

      await upsertSubscriptionFromCheckout({
        email,
        planId: planIdRaw,
        stripeCustomerId:
          typeof session.customer === 'string' ? session.customer : session.customer?.id,
        stripeSubscriptionId:
          typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
        stripeCheckoutSessionId: session.id,
      });
      break;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object as {
        id: string;
        status: string;
        metadata?: { planId?: string };
      };
      const { updateSubscriptionByStripeId } = await import('./subscriptions');
      const status =
        sub.status === 'active'
          ? 'active'
          : sub.status === 'past_due' || sub.status === 'unpaid'
            ? 'past_due'
            : 'cancelled';
      const patch: { status: 'active' | 'past_due' | 'cancelled'; planId?: import('./plans').PlanId } =
        { status };
      if (sub.metadata?.planId && isPlanId(sub.metadata.planId)) {
        patch.planId = sub.metadata.planId;
      }
      await updateSubscriptionByStripeId(sub.id, patch);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as { subscription?: string | null };
      const subId = typeof invoice.subscription === 'string' ? invoice.subscription : undefined;
      if (subId) {
        const { updateSubscriptionByStripeId } = await import('./subscriptions');
        await updateSubscriptionByStripeId(subId, { status: 'past_due' });
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as { id: string };
      const { cancelSubscriptionByStripeId } = await import('./subscriptions');
      await cancelSubscriptionByStripeId(sub.id);
      break;
    }
    default:
      break;
  }
}
