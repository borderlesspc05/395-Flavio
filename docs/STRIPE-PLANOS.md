# Stripe — planos Magnus Mind

## O que já está no código

Com `STRIPE_SECRET_KEY` configurada, o botão da landing chama `POST /api/billing/checkout-session` e redireciona para a **tela hospedada do Stripe Checkout** (a mesma UI da captura de tela — email, cartão, país Brasil, botão Assinar). Sem a chave, em dev cai no `/mock-checkout`.

## Fluxo

1. Usuário escolhe **Starter**, **Advanced** ou **Premium** na landing (`/`).
2. API cria sessão Stripe Checkout → redirecionamento para pagamento.
3. Após pagamento, Stripe redireciona para `/register?payment=success&session_id=...`.
4. Usuário **cria a conta** com o **mesmo email** do checkout.
5. `POST /api/billing/claim` vincula assinatura ao `userId` Firebase.
6. Limites de requisições simultâneas:
   - **Starter:** 1
   - **Advanced:** 3
   - **Premium:** ilimitado

## Coordenadas — o que pegar no Stripe Dashboard

### 1. Chave secreta

**Stripe Dashboard → Developers → API keys → Secret key**

- Teste: `sk_test_...`
- Produção: `sk_live_...`
- Cole em `server/.env` → `STRIPE_SECRET_KEY`

### 2. Três preços (assinatura mensal em BRL)

**Product catalog → + Add product** (repita para cada plano)

| Plano no app | Nome sugerido no Stripe | Tipo | Moeda |
|--------------|------------------------|------|-------|
| `starter` | Magnus Mind Starter | Recurring · Monthly | BRL |
| `advanced` | Magnus Mind Advanced | Recurring · Monthly | BRL |
| `premium` | Magnus Mind Premium | Recurring · Monthly | BRL |

Depois de salvar cada produto, abra o **Price** criado e copie o ID (`price_...`):

| Variável `.env` | Valor |
|-----------------|-------|
| `STRIPE_PRICE_STARTER` | `price_...` do Starter |
| `STRIPE_PRICE_ADVANCED` | `price_...` do Advanced |
| `STRIPE_PRICE_PREMIUM` | `price_...` do Premium |

### 3. Webhook

**Developers → Webhooks → Add endpoint**

| Campo | Valor |
|-------|-------|
| URL (produção) | `https://SUA-API.onrender.com/api/billing/webhook` |
| Eventos | `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed` |

Copie o **Signing secret** (`whsec_...`) → `STRIPE_WEBHOOK_SECRET`

**Local (opcional):** Stripe CLI

```bash
stripe listen --forward-to localhost:3001/api/billing/webhook
```

Use o `whsec_...` que o CLI imprimir no `.env` local.

### 4. URL do frontend

| Ambiente | `FRONTEND_URL` |
|----------|----------------|
| Local | `http://localhost:5173` |
| Netlify | `https://seu-app.netlify.app` |

Usada em `success_url` e `cancel_url` do Checkout.

### 5. Conferir

Reinicie o server e abra:

`GET http://localhost:3001/api/billing/status` → `{ "stripeConfigured": true }`

Na landing, clique em um plano → deve abrir `checkout.stripe.com` em português.

**Cartão de teste:** `4242 4242 4242 4242` · validade futura · CVC qualquer.

## Variáveis (Render / `server/.env`)

| Variável | Descrição |
|----------|-----------|
| `STRIPE_SECRET_KEY` | Chave secreta (`sk_...`) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret do endpoint webhook (`whsec_...`) |
| `STRIPE_PRICE_STARTER` | Price ID assinatura Starter |
| `STRIPE_PRICE_ADVANCED` | Price ID assinatura Advanced |
| `STRIPE_PRICE_PREMIUM` | Price ID assinatura Premium |
| `FRONTEND_URL` | URL do Netlify (ex.: `https://395-flavio2.netlify.app`) |

## Desenvolvimento sem Stripe

Sem `STRIPE_SECRET_KEY`, o checkout em `development` redireciona para login em modo demo (`demo=1`). O claim com `demo: true` grava o plano em memória/Firestore para testes.

## Endpoints

| Método | Rota | Uso |
|--------|------|-----|
| POST | `/api/billing/checkout-session` | `{ planId }` → `{ url, sessionId }` |
| POST | `/api/billing/claim` | `{ userId, email, checkoutSessionId?, demo?, planId? }` |
| GET | `/api/billing/plan?userId=` | Plano ativo e limite de concorrência |
| POST | `/api/billing/webhook` | Stripe (body raw) |
