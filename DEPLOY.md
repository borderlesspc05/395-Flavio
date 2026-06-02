# Deploy — Magnus Mind (395-flavio)

Arquitetura híbrida: **Netlify** (frontend) + **Render** (backend/API).

## Frontend (Netlify)

### Novo site / nova conta Netlify

Se o deploy antigo (`395-flavio2.netlify.app` ou outra conta) não reflete o código atual, **crie um site novo** — não é obrigatório apagar o antigo.

1. Acesse [app.netlify.com](https://app.netlify.com) com a **conta correta** (ou crie uma nova).
2. **Add new project** → **Import an existing project** → **GitHub**.
3. Autorize o GitHub e escolha o repositório: `lucasmonteiro9996/395-Flavio`.
4. Branch: `main`.
5. Confirme (o `netlify.toml` na raiz já define build e publish):

| Campo | Valor |
|-------|--------|
| Build command | `npm run build` |
| Publish directory | `dist` |

6. **Site configuration → Environment variables** — adicione todas abaixo (ou use os valores de `.env.production` no repo).

7. **Deploy site** e anote a URL gerada (ex.: `https://nome-aleatorio.netlify.app`).

8. **Firebase Console** → projeto `magnusmind-d42ec` → **Authentication** → **Settings** → **Authorized domains** → adicione o domínio Netlify novo (sem `https://`).

9. **Render** (API) → variável `CORS_ORIGIN` → inclua a URL nova do Netlify, separada por vírgula:
   ```
   https://SEU-SITE.netlify.app,https://395-flavio2.netlify.app,http://localhost:5173
   ```
   Salve e faça **Manual Deploy** no Render se necessário.

10. (Opcional) **Domain management** no Netlify → domínio customizado (ex. `app.magnusmind.io`).

O arquivo `netlify.toml` na raiz já cuida do redirect SPA (`/*` → `index.html`).

### “No repositories found” no Netlify

**Colaborador no GitHub ≠ repositório visível no Netlify.**  
O Netlify só lista repositórios da conta GitHub que **instalou o app Netlify** e que **concedeu acesso** ao repo.

Repositório atual: `https://github.com/lucasmonteiro9996/395-Flavio` (dono: `lucasmonteiro9996`).

Escolha **uma** opção:

#### Opção A — Dono do repo conecta (recomendado)

1. Login no Netlify com a conta GitHub **`lucasmonteiro9996`** (dona do repo).
2. Ou: dono vai em GitHub → **Settings** → **Applications** → **Netlify** → **Configure** → marcar o repo `395-Flavio` (ou “All repositories”).
3. No Netlify, **Add new project** → o repo deve aparecer.

Depois, em **Site configuration → General → Members**, convide a equipe na conta Netlify (não basta ser colaborador só no GitHub).

#### Opção B — Nova conta Netlify + fork

1. Na conta GitHub **nova**, faça **Fork** de `lucasmonteiro9996/395-Flavio`.
2. Netlify → login com **essa** conta GitHub.
3. GitHub → **Settings** → **Applications** → **Netlify** → autorizar e selecionar o **fork**.
4. Importar o fork no Netlify (branch `main`).
5. Manter o fork atualizado com `git pull upstream` ou sync no GitHub.

#### Opção C — Organização no GitHub

1. Criar uma **Organization** (ex. `magnusmind` ou `borderless`).
2. Transferir ou duplicar o repo para a org.
3. Instalar **Netlify GitHub App** na **organização** e conceder acesso ao repo.
4. Time entra na org + no site Netlify como membros.

#### Opção D — Deploy sem Git (rápido para testar)

Na pasta do projeto (com `npm run build` já rodado):

```bash
npm install -g netlify-cli
npm run build
netlify login
netlify sites:create
netlify deploy --prod --dir=dist
```

Configure variáveis `VITE_*` no painel do site criado (**Site configuration → Environment variables**), depois **Trigger deploy** ou rode `netlify deploy --prod` de novo.

#### Conferir permissões no GitHub

1. https://github.com/settings/installations → **Netlify** → **Configure**.
2. Em **Repository access**, escolha **Only select repositories** e adicione `395-Flavio` (ou o fork).
3. Salve e no Netlify clique em **Refresh repositories** (ou desconecte/reconecte GitHub em **User settings → GitHub**).

### Variáveis obrigatórias no Netlify

1. Conecte o repositório no [Netlify](https://app.netlify.com).
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Variáveis de ambiente:

| Variável | Exemplo |
|----------|---------|
| `VITE_API_BASE_URL` | URL do **Web Service** no Render (ex.: `https://three95-flavio-fcha.onrender.com` — confira no painel; o nome do host muda se recriar o serviço) |
| `VITE_FIREBASE_API_KEY` | ver `.env.production` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `magnusmind-d42ec.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `magnusmind-d42ec` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `magnusmind-d42ec.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `981919789399` |
| `VITE_FIREBASE_APP_ID` | `1:981919789399:web:46f31e0ad8e164f54e8e12` |
| `VITE_FIREBASE_MEASUREMENT_ID` | `G-5QHZ9D7E9V` |

O arquivo `netlify.toml` já configura SPA redirects (`/*` → `index.html`).

## Firebase (cliente — Firestore)

A **Onda 2** persiste o **Gate Zero** na coleção **`blueprintGate`**, com ID do documento = **UID do usuário** (mesmo padrão de `initialForms`). Campos usados: `selectedPath` (`A` ou `B`), `aiRecommendedPath`, `rationale`, `skipped`, `confirmedAt`.

Configure regras do Firestore para que cada usuário leia/escreva apenas o próprio documento, por exemplo: `request.auth != null && request.auth.uid == documentId` em `match /blueprintGate/{userId}`.

**Passo a passo e regra completa:** [`docs/FIRESTORE-RULES.md`](./FIRESTORE-RULES.md) (coleção `blueprintGate` + `initialForms`).

## Backend (Render)

1. Crie um **Web Service** com **Root Directory** = `server` (obrigatório).
2. Build: `npm install --include=dev && npm run build` (com `NODE_ENV=production`, o npm pula `devDependencies` — o `--include=dev` garante o `tsc` e os `@types/*`)
3. Start: `npm start`
4. Health check path: `/api/health`
5. Copie variáveis de `server/.env.example` (OpenRouter, Firebase Admin, Serper/Tavily, WhatsApp).

### Firebase `FIREBASE_PRIVATE_KEY` no Render (erro `invalid-credential` / DECODER)

1. Firebase Console → projeto `magnusmind-d42ec` → ⚙️ **Project settings** → **Service accounts** → **Generate new private key** (baixa um `.json`).
2. Abra o JSON e copie **somente** estes três campos para variáveis separadas no Render:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (**não** cole o JSON inteiro numa variável só)
3. O valor de `private_key` no JSON já vem com `\n` no meio. Cole **uma linha só** no Render, **com aspas** em volta, por exemplo:
   ```
   "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANB...\n-----END PRIVATE KEY-----\n"
   ```
4. **Não** cole com Enter quebrando linha no painel do Render.
5. **Não** use `GOOGLE_APPLICATION_CREDENTIALS` no Render Free.
6. Salve → **Save and deploy**.

**Erro `DECODER routines::unsupported` ao iniciar a API:** o Node não conseguiu ler o PEM da `FIREBASE_PRIVATE_KEY`. Confira:

- Cole **só** o valor de `private_key` do JSON do Firebase (inclui `-----BEGIN PRIVATE KEY-----` … `-----END PRIVATE KEY-----`), não o JSON inteiro.
- **Uma linha** no Render, com `\n` no meio como no JSON original (não quebre o PEM com Enter no painel).
- **Aspas retas** `"..."` em volta do valor inteiro são aceitas; evite copiar de Word/PDF (aspas curvas `“` corrompem o PEM — o servidor tenta normalizar, mas o ideal é colar do JSON bruto).
- Gere **nova chave** no Firebase (Service accounts → Generate new private key) se suspeitar de truncamento ou edição manual.

Ou use o blueprint `render.yaml` na raiz do repositório (Render → Blueprint).

**"Cannot GET /api/health" (HTML):** o Render está subindo o **frontend** (Vite), não a API. Corrija em **Settings**:

| Campo | Valor |
|-------|--------|
| Root Directory | `server` |
| Build Command | `npm install --include=dev && npm run build` |
| Start Command | `npm start` |

Se Root Directory estiver vazio, use na raiz: Build `npm run render-build`, Start `npm run render-start` (scripts no `package.json` da raiz). Ver `scripts/RENDER-CONFIGURACAO.txt`.

Resposta correta de `/api/health`: JSON `{"status":"ok",...}` — não HTML `Cannot GET`.

## Desenvolvimento local

```bash
# Terminal 1 — API
cd server && npm install && npm run dev

# Terminal 2 — Frontend
npm install && npm run dev
```

O Vite faz proxy de `/api` para `http://localhost:3001`.

## Timeouts

- Chamadas gerais: **90s** (`AXIOS_TIMEOUT`)
- Chat Consultoria IA: **120s** (`CHAT_TIMEOUT`)

Isso evita erros em cold start do Render (plano gratuito).

### Gate Zero (classificação IA)

- **POST** `/api/ai/blueprint-gate` — body JSON: `{ "diagnosticContext": "texto do canvas 1.1–1.5" }`. Resposta: `{ "reply": "...", "parsed": { "recommendedPath", "rationale", "pathASignals", "pathBSignals", "questionForUser" } }`. Não cria conversa no histórico de chat.
- Timeout: usa o mesmo limite de chat (120s) no cliente.

#### Mensagem “sugestão local” ou erro 404 no Gate Zero

Se o app mostrar aviso de **sugestão local** ou a rede retornar **404** em `/api/ai/blueprint-gate`, o serviço no Render **não está com o código da API atual** (ou o Root Directory não é `server`).

1. Render → seu **Web Service** da API → **Settings**.
2. Confirme **Root Directory** = `server`, **Build Command** = `npm install --include=dev && npm run build`, **Start Command** = `npm start`.
3. **Commits:** o `main` do GitHub ligado ao Render precisa incluir `server/src/routes/ai.ts` com `router.post('/blueprint-gate', ...)`.
4. **Manual Deploy** (ou push que dispare build) e aguarde o build terminar.
5. Teste no navegador: `POST https://SEU-SERVICO.onrender.com/api/ai/blueprint-gate` com body JSON (ferramenta tipo Thunder Client) — deve responder **200** com JSON, não 404.

Variável **`OPENROUTER_API_KEY`** no Render continua necessária para a classificação ser feita pela **IA real** (sem chave, o servidor usa heurística no endpoint, não o cliente).

## Stripe (planos + checkout)

No **Render** (`server`), além das variáveis de `server/.env.example`:

| Variável | Onde obter |
|----------|------------|
| `STRIPE_SECRET_KEY` | Stripe → Desenvolvedores → Chaves da API |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → signing secret |
| `STRIPE_PRICE_STARTER` / `ADVANCED` / `PREMIUM` | Catálogo de produtos → ID do preço (`price_...`) |
| `FRONTEND_URL` | URL do Netlify (ex.: `https://395-flavio2.netlify.app`) |
| `CORS_ORIGIN` | Inclua a mesma URL do Netlify |

Webhook Stripe: `https://SEU-SERVICO.onrender.com/api/billing/webhook`  
Eventos: `checkout.session.completed`, `customer.subscription.deleted`

Detalhes: [`docs/STRIPE-PLANOS.md`](./docs/STRIPE-PLANOS.md)

Sem Stripe configurado, o checkout usa `/mock-checkout` (pagamento simulado) e redireciona para `/register`.
