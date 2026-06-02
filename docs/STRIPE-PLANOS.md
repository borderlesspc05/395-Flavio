# Stripe — planos Magnus Mind

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

## Variáveis (Render / `server/.env`)

| Variável | Descrição |
|----------|-----------|
| `STRIPE_SECRET_KEY` | Chave secreta (`sk_...`) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret do endpoint webhook (`whsec_...`) |
| `STRIPE_PRICE_STARTER` | Price ID assinatura Starter |
| `STRIPE_PRICE_ADVANCED` | Price ID assinatura Advanced |
| `STRIPE_PRICE_PREMIUM` | Price ID assinatura Premium |
| `FRONTEND_URL` | URL do Netlify (ex.: `https://395-flavio2.netlify.app`) |

## Webhook no Stripe Dashboard

- **URL:** `https://SUA-API.onrender.com/api/billing/webhook`
- **Eventos:** `checkout.session.completed`, `customer.subscription.deleted`

## Desenvolvimento sem Stripe

Sem `STRIPE_SECRET_KEY`, o checkout em `development` redireciona para login em modo demo (`demo=1`). O claim com `demo: true` grava o plano em memória/Firestore para testes.

## Endpoints

| Método | Rota | Uso |
|--------|------|-----|
| POST | `/api/billing/checkout-session` | `{ planId }` → `{ url, sessionId }` |
| POST | `/api/billing/claim` | `{ userId, email, checkoutSessionId?, demo?, planId? }` |
| GET | `/api/billing/plan?userId=` | Plano ativo e limite de concorrência |
| POST | `/api/billing/webhook` | Stripe (body raw) |
