import { getById, create, update, COLLECTIONS } from './storage';
import { PLANS, type PlanId, isPlanId } from './plans';
import { nowIso } from '../utils/id';

export interface PlanSettingsEntry {
  name: string;
  priceLabel: string;
  priceCents: number;
  concurrencyLimit: number | null;
}

export type PlanSettingsMap = Record<PlanId, PlanSettingsEntry>;

const SETTINGS_DOC_ID = 'global';

const DEFAULT_SETTINGS: PlanSettingsMap = {
  starter: {
    name: 'Starter',
    priceLabel: 'R$ 59,00 / mês',
    priceCents: 5900,
    concurrencyLimit: 1,
  },
  advanced: {
    name: 'Advanced',
    priceLabel: 'R$ 149,00 / mês',
    priceCents: 14900,
    concurrencyLimit: 3,
  },
  premium: {
    name: 'Premium',
    priceLabel: 'R$ 399,00 / mês',
    priceCents: 39900,
    concurrencyLimit: null,
  },
};

export interface AdminSettingsDoc {
  id: string;
  plans: PlanSettingsMap;
  updatedAt: string;
}

export async function getPlanSettings(): Promise<PlanSettingsMap> {
  const doc = await getById<AdminSettingsDoc>(COLLECTIONS.adminSettings, SETTINGS_DOC_ID);
  if (!doc?.plans) return { ...DEFAULT_SETTINGS };
  return {
    starter: { ...DEFAULT_SETTINGS.starter, ...doc.plans.starter },
    advanced: { ...DEFAULT_SETTINGS.advanced, ...doc.plans.advanced },
    premium: { ...DEFAULT_SETTINGS.premium, ...doc.plans.premium },
  };
}

export async function savePlanSettings(plans: Partial<PlanSettingsMap>): Promise<PlanSettingsMap> {
  const current = await getPlanSettings();
  const merged: PlanSettingsMap = {
    starter: { ...current.starter, ...plans.starter },
    advanced: { ...current.advanced, ...plans.advanced },
    premium: { ...current.premium, ...plans.premium },
  };

  const payload = {
    plans: merged,
    updatedAt: nowIso(),
  };

  const existing = await getById<AdminSettingsDoc>(COLLECTIONS.adminSettings, SETTINGS_DOC_ID);
  if (existing) {
    await update(COLLECTIONS.adminSettings, SETTINGS_DOC_ID, payload);
  } else {
    await create(COLLECTIONS.adminSettings, SETTINGS_DOC_ID, payload);
  }

  return merged;
}

export async function getConcurrencyLimitFromSettings(planId: PlanId): Promise<number | null> {
  const settings = await getPlanSettings();
  return settings[planId]?.concurrencyLimit ?? PLANS[planId].concurrencyLimit;
}

export function validatePlanSettingsInput(body: unknown): Partial<PlanSettingsMap> {
  if (!body || typeof body !== 'object' || !('plans' in body)) {
    return {};
  }
  const raw = (body as { plans: Record<string, unknown> }).plans;
  const out: Partial<PlanSettingsMap> = {};

  for (const key of ['starter', 'advanced', 'premium'] as PlanId[]) {
    if (!isPlanId(key) || !raw[key] || typeof raw[key] !== 'object') continue;
    const entry = raw[key] as Record<string, unknown>;
    out[key] = {
      name: typeof entry.name === 'string' ? entry.name : DEFAULT_SETTINGS[key].name,
      priceLabel: typeof entry.priceLabel === 'string' ? entry.priceLabel : DEFAULT_SETTINGS[key].priceLabel,
      priceCents: typeof entry.priceCents === 'number' ? entry.priceCents : DEFAULT_SETTINGS[key].priceCents,
      concurrencyLimit:
        entry.concurrencyLimit === null
          ? null
          : typeof entry.concurrencyLimit === 'number'
            ? entry.concurrencyLimit
            : DEFAULT_SETTINGS[key].concurrencyLimit,
    };
  }

  return out;
}
