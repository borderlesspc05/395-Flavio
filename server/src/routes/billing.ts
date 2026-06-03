import { Router, Request, Response, NextFunction } from 'express';
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
import { env } from '../config/env';

const router = Router();

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
router.post('/claim', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, checkoutSessionId, planId: demoPlanId } = req.body;
    const userId = (req.body.userId as string) || req.userId;

    if (!userId) {
      throw new AppError(400, 'userId é obrigatório.');
    }
    if (!email || typeof email !== 'string') {
      throw new AppError(400, 'email é obrigatório.');
    }

    let linked = await linkSubscriptionToUser(email, userId);

    if (!linked && checkoutSessionId && typeof checkoutSessionId === 'string') {
      const fulfilled = await fulfillCheckoutSession(checkoutSessionId);
      if (fulfilled) {
        if (
          fulfilled.email &&
          fulfilled.email.toLowerCase() !== email.trim().toLowerCase()
        ) {
          throw new AppError(
            400,
            'O email da conta deve ser o mesmo usado no pagamento Stripe.'
          );
        }
        linked = await linkSubscriptionToUser(email, userId);
      } else if (
        env.nodeEnv === 'development' &&
        req.body.demo === true &&
        demoPlanId &&
        isPlanId(demoPlanId)
      ) {
        const { upsertSubscriptionFromCheckout } = await import('../services/subscriptions');
        await upsertSubscriptionFromCheckout({
          email,
          planId: demoPlanId,
          stripeCheckoutSessionId: checkoutSessionId,
        });
        linked = await linkSubscriptionToUser(email, userId);
      }
    }

    const subscription = linked ?? (await getSubscriptionByEmail(email));
    const summary = await getPlanSummaryForUser(userId);

    const { upsertUserProfile } = await import('../services/users');
    await upsertUserProfile({
      userId,
      email,
      displayName: typeof req.body.displayName === 'string' ? req.body.displayName : undefined,
      planId: summary.planId,
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

router.get('/plan', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.query.userId as string) || req.userId;
    if (!userId) {
      throw new AppError(400, 'userId é obrigatório.');
    }
    const summary = await getPlanSummaryForUser(userId);
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
