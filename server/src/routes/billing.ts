import { Router, Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { requireUser } from '../middleware/userAuth';
import { AppError } from '../utils/errors';
import {
  createCheckoutSession,
  fulfillCheckoutSession,
  handleStripeWebhook,
  isStripeConfigured,
} from '../services/stripeBilling';
import {
  getPlanSummaryForUser,
  getSubscriptionByEmail,
  linkSubscriptionToUser,
} from '../services/subscriptions';
import { isPlanId } from '../services/plans';

const router = Router();

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

router.get('/status', (_req: Request, res: Response) => {
  res.json({ stripeConfigured: isStripeConfigured() });
});

router.post('/checkout-session', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { planId } = req.body;
    if (!planId || typeof planId !== 'string') {
      throw new AppError(400, 'planId é obrigatório (starter, advanced, premium).');
    }
    const session = await createCheckoutSession(planId);
    res.json(session);
  } catch (err) {
    next(err);
  }
});

/** Após login/registro: vincula assinatura (email) ao userId Firebase */
router.post('/claim', requireUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { checkoutSessionId, planId: demoPlanId } = req.body;
    const userId = req.userId;
    const authenticatedEmail = req.userEmail ? normalizeEmail(req.userEmail) : '';
    const requestedEmail =
      typeof req.body.email === 'string' ? normalizeEmail(req.body.email) : authenticatedEmail;

    if (!authenticatedEmail) {
      throw new AppError(400, 'A conta autenticada precisa ter um email válido.');
    }
    if (requestedEmail !== authenticatedEmail) {
      throw new AppError(403, 'Use o mesmo email da conta autenticada para vincular a assinatura.');
    }

    const email = authenticatedEmail;
    let linked = null;

    const existingSub = await getSubscriptionByEmail(email);
    if (existingSub?.userId && existingSub.userId !== userId) {
      throw new AppError(409, 'Esta assinatura já está vinculada a outro usuário.');
    }
    if (existingSub && (existingSub.status === 'active' || existingSub.status === 'past_due')) {
      linked = existingSub.userId ? existingSub : await linkSubscriptionToUser(email, userId);
    }

    if (!linked && checkoutSessionId && typeof checkoutSessionId === 'string') {
      const isDemoSession =
        checkoutSessionId.startsWith('demo_') || req.body.demo === true;

      if (isDemoSession) {
        if (env.nodeEnv === 'production') {
          throw new AppError(403, 'Checkout demo não é permitido em produção.');
        }

        const fromSession = checkoutSessionId.match(/^demo_(starter|advanced|premium)_/)?.[1];
        const planId =
          demoPlanId && isPlanId(demoPlanId)
            ? demoPlanId
            : fromSession && isPlanId(fromSession)
              ? fromSession
              : null;

        if (!planId) {
          throw new AppError(400, 'Plano da simulação não identificado.');
        }

        const { upsertSubscriptionFromCheckout } = await import('../services/subscriptions');
        await upsertSubscriptionFromCheckout({
          email,
          planId,
          stripeCheckoutSessionId: checkoutSessionId,
        });
      } else {
        const fulfilled = await fulfillCheckoutSession(checkoutSessionId);
        if (fulfilled) {
          if (normalizeEmail(fulfilled.email) !== email) {
            throw new AppError(
              400,
              'O email da conta deve ser o mesmo usado no pagamento Stripe.'
            );
          }
        }
      }
    }

    const subscription = await getSubscriptionByEmail(email);
    if (subscription?.userId && subscription.userId !== userId) {
      throw new AppError(409, 'Esta assinatura já está vinculada a outro usuário.');
    }
    if (
      subscription &&
      (subscription.status === 'active' || subscription.status === 'past_due') &&
      !subscription.userId
    ) {
      linked = await linkSubscriptionToUser(email, userId);
    }

    const { syncUserProfilePlan } = await import('../services/subscriptions');
    const planId = await syncUserProfilePlan(userId);
    const summary = await getPlanSummaryForUser(userId);

    const { upsertUserProfile } = await import('../services/users');
    await upsertUserProfile({
      userId,
      email,
      displayName:
        typeof req.body.displayName === 'string' ? req.body.displayName : req.userDisplayName,
      planId,
    });

    res.json({
      ok: true,
      linked: Boolean(linked),
      hasActiveSubscription: subscription?.status === 'active',
      ...summary,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/plan', requireUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await getPlanSummaryForUser(req.userId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

export async function billingWebhookHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const signature = req.headers['stripe-signature'];
    const rawBody = req.body as Buffer;
    await handleStripeWebhook(rawBody, typeof signature === 'string' ? signature : undefined);
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

export default router;
