/**
 * Verifica se a conta Stripe do cliente está pronta (dados, banco, preços).
 * Uso: npm run stripe:health --prefix server
 *
 * Requer STRIPE_SECRET_KEY em server/.env (sk_test_... ou sk_live_...).
 */
import path from 'path';
import dotenv from 'dotenv';
import Stripe from 'stripe';

const serverEnvPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: serverEnvPath, override: true });
dotenv.config();

function mask(value: string | undefined): string {
  if (!value) return '(não definido)';
  if (value.length <= 8) return '***';
  return `${value.slice(0, 7)}…${value.slice(-4)}`;
}

function ok(flag: boolean): string {
  return flag ? '✓' : '✗';
}

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const priceStarter = process.env.STRIPE_PRICE_STARTER?.trim();
  const priceAdvanced = process.env.STRIPE_PRICE_ADVANCED?.trim();
  const pricePremium = process.env.STRIPE_PRICE_PREMIUM?.trim();
  const frontendUrl = process.env.FRONTEND_URL?.trim();

  console.log('\n=== Magnus Mind — Stripe health check ===\n');

  if (!secretKey) {
    console.log('STRIPE_SECRET_KEY: ausente');
    console.log('\nA API em produção também responde stripeConfigured: false sem essa chave.');
    console.log('Peça ao cliente a Secret key (teste ou live) e cole em server/.env ou no Render.\n');
    process.exit(1);
  }

  const mode = secretKey.startsWith('sk_live_') ? 'LIVE' : 'TEST';
  console.log(`Modo da chave: ${mode}`);
  console.log(`STRIPE_SECRET_KEY: ${mask(secretKey)}`);
  console.log(`STRIPE_WEBHOOK_SECRET: ${webhookSecret ? mask(webhookSecret) : '(não definido)'}`);
  console.log(`FRONTEND_URL: ${frontendUrl ?? '(não definido)'}`);
  console.log('');

  const stripe = new Stripe(secretKey);

  const account = await stripe.accounts.retrieve({
    expand: ['external_accounts'],
  });

  const externalAccounts = account.external_accounts?.data ?? [];
  const bankAccounts = externalAccounts.filter((a) => a.object === 'bank_account');

  const chargesEnabled = Boolean(account.charges_enabled);
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const detailsSubmitted = Boolean(account.details_submitted);
  const currentlyDue = account.requirements?.currently_due ?? [];
  const pastDue = account.requirements?.past_due ?? [];

  console.log('--- Conta Stripe ---');
  console.log(`${ok(detailsSubmitted)} Dados da empresa enviados (details_submitted)`);
  console.log(`${ok(chargesEnabled)} Cobranças habilitadas (charges_enabled)`);
  console.log(`${ok(payoutsEnabled)} Repasses habilitados (payouts_enabled)`);
  console.log(`${ok(bankAccounts.length > 0)} Conta bancária cadastrada (${bankAccounts.length})`);

  if (bankAccounts.length > 0) {
    for (const bank of bankAccounts) {
      if (bank.object !== 'bank_account') continue;
      const last4 = bank.last4 ?? '????';
      const bankName = bank.bank_name ?? 'Banco';
      const status = bank.status ?? 'unknown';
      console.log(`    · ${bankName} ·••• ${last4} — status: ${status}`);
    }
  }

  if (currentlyDue.length > 0) {
    console.log(`\nPendências (currently_due): ${currentlyDue.join(', ')}`);
  }
  if (pastDue.length > 0) {
    console.log(`Atrasadas (past_due): ${pastDue.join(', ')}`);
  }

  console.log('\n--- Preços no .env ---');
  const prices: Array<{ label: string; id?: string }> = [
    { label: 'STRIPE_PRICE_STARTER', id: priceStarter },
    { label: 'STRIPE_PRICE_ADVANCED', id: priceAdvanced },
    { label: 'STRIPE_PRICE_PREMIUM', id: pricePremium },
  ];

  for (const { label, id } of prices) {
    if (!id) {
      console.log(`${ok(false)} ${label}: não definido`);
      continue;
    }
    try {
      const price = await stripe.prices.retrieve(id);
      const active = price.active;
      const currency = price.currency?.toUpperCase() ?? '?';
      const amount = price.unit_amount != null ? (price.unit_amount / 100).toFixed(2) : '?';
      console.log(
        `${ok(active)} ${label}: ${mask(id)} — ${currency} ${amount} — ${price.recurring?.interval ?? 'one-time'}`
      );
    } catch {
      console.log(`${ok(false)} ${label}: ${mask(id)} — inválido ou de outra conta`);
    }
  }

  const ready =
    detailsSubmitted &&
    chargesEnabled &&
    bankAccounts.length > 0 &&
    Boolean(priceStarter && priceAdvanced && pricePremium);

  console.log('\n--- Resumo ---');
  if (ready && payoutsEnabled) {
    console.log('Conta pronta para testes de checkout reais.');
  } else if (ready && !payoutsEnabled) {
    console.log('Checkout pode funcionar; repasses ainda aguardando aprovação do Stripe.');
  } else {
    console.log('Ainda faltam itens antes do go-live. Veja os ✗ acima.');
  }

  if (!webhookSecret) {
    console.log('\nDica: configure STRIPE_WEBHOOK_SECRET para o claim automático via webhook.');
  }

  if (mode === 'TEST') {
    console.log('\nCartão de teste: 4242 4242 4242 4242 · validade futura · CVC qualquer.');
  }

  console.log('');
}

main().catch((err) => {
  console.error('Erro ao consultar Stripe:', err instanceof Error ? err.message : err);
  process.exit(1);
});
