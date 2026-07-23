# Checklist de entrega — Magnus Mind (395-Flavio)

Documento de validação do que foi implementado na plataforma.

**Repositório:** https://github.com/lucasmonteiro9996/395-Flavio  
**Frontend (Netlify):** https://395-flavio2.netlify.app  
**API (Render):** use a URL do seu Web Service (ex.: `https://three95-flavio-fcha.onrender.com`).

---

## Referências de produto e marca

| Recurso | Link |
|---------|------|
| Fluxo / jornada (Miro) | [Board Miro](https://miro.com/welcomeonboard/OHFhOTB0LzkrTHNSUE41STIranBkRVdkUzQwS0l3RFZqT0NuV1BnNnozTVZ5aEFaOHZRL1p1WEV3bStqbzRrU08vVCtLNnRKc0VVRDRUVGgwS0huZVFXOXo0SWtaMngyOHhITERvZC9TbmMwN2JiQUlsa0g5RlphVnVHQnFxTlB3VHhHVHd5UWtSM1BidUtUYmxycDRnPT0hdjE=?share_link_id=192123947908) |
| Site / cores | [magnusmind.io](https://magnusmind.io/) |
| Doc fluxo | `docs/FLUXO-PROJETO.md` |
| Manifesto MVP (People Sprint) | `docs/MANIFESTO-MVP.md` |
| Doc marca | `docs/MARCA-MAGNUSMIND.md` |

---

## Checklist — sessão 21/07/2026 (fase lock, Design → Difusão, UX)

### Cascata de trancamento de fases

- [x] **Regra** — fase posterior liberada ⇒ fases anteriores travadas (somente visualização + cadeado na sidebar)
- [x] **Design aberto** — trava Diagnóstico + Solution Pick automaticamente
- [x] **Difusão aberta** — trava Design (e anteriores)
- [x] **Domínio aberto** — trava Difusão (e anteriores)
- [x] **Normalize + merge** — locks do ciclo + `localStorage` em OR (não perde lock se API devolver `phaseLocks` vazio)
- [x] **Evento** — `mm:phase-locks-changed` sincroniza sidebar e ciclo ativo
- [x] **Badge** — “Diagnóstico pendente” some quando Diagnóstico está travado (não volta no `refreshCycles`)
- [x] **Scans** — runner em read-only quando fase Diagnóstico está locked

### Design — concluir e validação

- [x] **Aviso no rodapé** — “Falta validar X de N planos…”
- [x] **CTA principal** — “Concluir Design e ir para Difusão” só com todos validados
- [x] **Opção** — “Avançar sem validar todos” com confirmação; salva planos e segue para Difusão

### Difusão (drawer / Action Canvas)

- [x] Critérios do Design no drawer de entrega e Mobilização
- [x] Drawer via portal (`document.body`), z-index alto, footer sticky
- [x] Feedback explícito de save + toast; fecha só após sucesso
- [x] Sign-off redesenhado; iniciativas numeradas 1, 2, 3…
- [x] `TeamMemberCombobox` com portal (lista não cortada)

### Hub Diagnóstico + cards de info + MID

- [x] Hub sem cards grandes Completo/Focado; copy sob o hero; Diagnóstico completo como 1º card
- [x] Modais info (`PhaseInfoButton` / `Modal` size `info`) com copy clara
- [x] KPI MID — verso do card mais legível (significado, próximos passos, fonte)

### Sidebar

- [x] Collapse = chevron sob o logo; fases travadas com ícone Lock + estilo cinza

### Arquivos principais

- `src/types/phaseLock.ts`, `src/services/phaseLock.ts`, `src/context/CycleContext.tsx`
- `src/components/DashboardLayout.tsx`, `src/pages/DesignPlansPage.tsx`
- `src/pages/ObjetivosPage.tsx`, `src/components/domain/DomainWaveWorkspace.tsx`
- `src/components/diffusion/DiffusionWorkspace.tsx`, estilos `design-plans.css` / `diffusion-v2.css`

### Validação rápida (manual)

- [ ] Abrir Design → Diagnóstico cinza + cadeado; badge pendente some
- [ ] Rodapé Design com planos pendentes → aviso + “Avançar sem validar todos”
- [ ] Abrir Difusão → Design travado; abrir Domínio → Difusão travada

---

## Checklist — sessão 29/05/2026 (Action Canvas, memória IA, UI Difusão)

### Onda 3 — Action Canvas (Make the Move)

- [x] **Backend** — CRUD `GET/POST/PATCH/DELETE` em `/api/action-canvases`
- [x] Limites: até **5** canvases, **10** entregas, **8** riscos por canvas
- [x] Tipos `ActionCanvas`, entregas, riscos, sign-off (`sim`/`não`/`pendente`), `fechado`
- [x] Coleção `actionCanvases` em storage + registro em `server/src/app.ts`
- [x] **Frontend** — `ActionCanvasPanel.tsx` com fluxo em 4 passos (A mudança → Execução → Riscos → Sign-off)
- [x] Lista lateral de iniciativas, barra de progresso, cards de entrega com pills 🟢🟡🔴
- [x] Sign-off SIM/NÃO → encerra e aparece no **MID (Hub)** (`DashboardHome`)
- [x] Página **Difusão** com abas: `1 · Action Canvas` | `2 · Objetivos estratégicos`
- [x] Estilos dedicados: `src/styles/action-canvas.css` + import em `main.tsx`
- [x] Passo **3.0 Action Canvas** em `magnusWaves.ts`; Difusão ativa após diagnóstico

### Correção CRUD — excluir Action Canvas

- [x] Causa: `DELETE`/`PATCH` sem `userId` → backend usava `demo-user` → 404
- [x] Fix em `src/services/api.ts`: `remove` e `update` enviam `userId` na query (como `list`/`create`)
- [x] Excluir na lista lateral e no rodapé do editor, com confirmação e mensagem de erro

### UX e visual do Action Canvas (frontend-design)

- [x] Direção editorial Magnus Mind: **Newsreader** + **Figtree**, bronze `#af9270`, warm `#ffbc7d`
- [x] Painel com borda em gradiente, textura sutil, animações (entrada, troca de passo, `prefers-reduced-motion`)
- [x] Stepper em timeline; **removida** linha horizontal que cortava os passos
- [x] Anel de quota **1/5** (sem label “iniciativas” no centro)
- [x] Skeleton de carregamento; botões Voltar / Próximo / Salvar / Excluir refinados

### Memória Magnus Waves (IA interligada)

- [x] Servidor: `server/src/services/magnusMemory.ts` — monta contexto único (diagnóstico → Gate → canvases → objetivos)
- [x] Sync: `POST /api/magnus-memory/sync` — persiste texto do diagnóstico/Gate no servidor
- [x] **Chat Consultoria IA** — bloco “Memória Magnus Waves” no system prompt de cada mensagem
- [x] **Sugestões de objetivos** — usam memória completa (inclui Action Canvas encerrados)
- [x] Cliente: `magnusWavesMemory.ts`, `magnusMemorySync.ts` — sync ao salvar diagnóstico, Gate Zero, canvas
- [x] `loadDesignDiffusionContext` passa a usar memória unificada
- [x] Banner **Memória Magnus Waves** na Difusão e na Consultoria IA (`MagnusMemoryBanner.tsx`)

### Action Canvas gerado por IA

- [x] `POST /api/action-canvases/suggest` + `actionCanvasSuggest.ts`
- [x] IA propõe 1–3 canvases completos a partir da memória (diagnóstico + Gate Zero)
- [x] Botão **Gerar com IA** no painel (requer diagnóstico completo)
- [x] Modal de revisão → importar selecionados como canvases editáveis
- [x] Fallback / modo demo se `OPENROUTER_API_KEY` ausente

### Layout da página Difusão (Objetivos)

- [x] Ordem: **Cabeçalho Onda 3** → **Abas** → **Memória** → conteúdo
- [x] Espaçamento reduzido (header, banner, tabs, painel mais compactos)
- [x] Cabeçalho Onda 3 em painel próprio (`difusao-wave-header`): eyebrow, título, ícone bronze
- [x] **Sugestões com IA** — botão primário (warm): abre aba Objetivos + gera sugestões no modal
- [x] **MM Blueprint** — botão secundário: navega para Consultoria IA (Design)
- [x] Botões alinhados na mesma linha; responsivo em mobile

### Arquivos principais tocados nesta sessão

| Área | Caminhos |
|------|----------|
| Backend Action Canvas | `server/src/routes/actionCanvases.ts`, `server/src/services/actionCanvasSuggest.ts` |
| Memória IA | `server/src/services/magnusMemory.ts`, `server/src/routes/magnusMemory.ts`, `server/src/services/aiChat.ts`, `objectivesSuggest.ts` |
| Frontend | `src/components/ActionCanvasPanel.tsx`, `MagnusMemoryBanner.tsx`, `src/pages/ObjetivosPage.tsx`, `ConsultoriaIAPage.tsx` |
| Sync / contexto | `src/services/magnusWavesMemory.ts`, `magnusMemorySync.ts`, `designDiffusionContext.ts`, `api.ts` |
| UI | `src/styles/action-canvas.css` |
| Hub | `src/pages/DashboardHome.tsx` (canvases encerrados no MID) |

### Validar após deploy / local

- [ ] Reiniciar backend: `npm run dev --prefix server`
- [ ] Front: `npm run dev` (um processo Vite)
- [ ] Completar diagnóstico → confirmar Gate Zero → Difusão
- [ ] Criar / editar / **excluir** Action Canvas (usuário logado)
- [ ] **Gerar com IA** → importar → revisar passos 1–4
- [ ] Chat Consultoria: banner de memória com chips ativos
- [ ] **Sugestões com IA** no header da Difusão → modal com objetivos
- [ ] Encerrar canvas (sign-off) → conferir bloco no dashboard (MID)

### Pendente / próximos passos (opcional)

- [ ] IA **escrever** campos do diagnóstico por conversa (com confirmação antes de gravar no Firebase)
- [ ] Amarrar canvases encerrados explicitamente no copy da Consultoria (tooltips / empty states)
- [ ] Testes E2E do fluxo Difusão completo
- [x] **Planos comerciais + Stripe** — checkout, webhook, claim no login, limites Starter 1 / Advanced 3 / Premium ∞ (ver `docs/STRIPE-PLANOS.md`)

---

## Checklist — sessão 02/06/2026 (Stripe, checkout, deploy)

### Landing e planos

1. [x] **Landing pública** — `/` e `/planos` com hero, cards Starter / Advanced / Premium, fluxo Magnus Waves, CTA final
2. [x] **Scroll reveal** — animação ao rolar (`useScrollReveal`, `ScrollReveal`, `prefers-reduced-motion`)
3. [x] **Visual** — `plans-landing.css` (grid 3D, orbs, bronze, Newsreader + Figtree)
4. [x] **Checkout por plano** — `PlanCheckoutButton` chama API e redireciona para pagamento

### Autenticação (login / registro)

5. [x] **Voltar para landing** — botão em login e registro (`AuthLayout` + `auth-btn--back`)
6. [x] **Botões refinados** — `auth-btn--primary` com gradiente, ícone e seta
7. [x] **Banner pós-pagamento** — mensagem no registro quando `?payment=success`

### Pagamento (Stripe + mock)

8. [x] **API billing** — `POST /checkout-session`, `POST /claim`, `GET /plan`, webhook `/api/billing/webhook`
9. [x] **Stripe Checkout** — assinatura com `metadata.planId`; `success_url` → **`/register`**
10. [x] **Checkout mock** — `/mock-checkout` quando Stripe não está configurado (dados de cartão fake)
11. [x] **Fluxo** — plano → pagamento (Stripe ou mock) → **registro** → claim do plano → dashboard
12. [x] **Assinaturas** — coleção `subscriptions` (email + `userId` + `planId`)
13. [x] **Docs** — `docs/STRIPE-PLANOS.md` + seção Stripe em `DEPLOY.md`

### Limites por plano (concorrência)

14. [x] **Starter** — 1 requisição simultânea (IA/sugestões/relatórios)
15. [x] **Advanced** — 3 requisições simultâneas
16. [x] **Premium** — ilimitado
17. [x] **Servidor** — `withConcurrencyLimit` em chat, blueprint-gate, suggest objetivos/canvas, generate relatório
18. [x] **Cliente** — fila em `requestConcurrency.ts` + interceptor Axios; `PlanContext` carrega plano após login

### Deploy e Git

19. [x] **Build** — `npm run build` (front + server) OK
20. [x] **Push** — `main` no GitHub (`fb478fe` landing/auth, `88252cb` billing)
21. [x] **Guia deploy** — variáveis Render/Netlify/Stripe documentadas

### Ajustes de UI (sessão)

22. [x] **Botão mock checkout** — texto creme + ícone warm no `mock-checkout-confirm`

### Validar em produção

- [x] Local: chaves Stripe live + 3 price IDs validados (Starter R$97 / Advanced R$147 / Premium R$297)
- [x] Local: Checkout Session cria URL `checkout.stripe.com` (sessão live)
- [x] Código: Checkout sem `payment_method_types` fixo + `allow_promotion_codes`
- [x] `render.yaml`: `STRIPE_PRICE_*` + placeholders `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
- [ ] Render Dashboard: colar `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` (sync:false) + redeploy
- [ ] Stripe: webhook → `https://three95-flavio-fcha.onrender.com/api/billing/webhook`
- [ ] Netlify: `VITE_API_BASE_URL` → API Render + `VITE_STRIPE_PUBLISHABLE_KEY`
- [ ] Firebase: domínio Netlify / sprint.magnusmind.io em **Authorized domains**
- [ ] Teste E2E: plano → pagamento → registro (mesmo email) → dashboard com limite do plano

### Arquivos principais — sessão 02/06

| Área | Caminhos |
|------|----------|
| Billing API | `server/src/routes/billing.ts`, `stripeBilling.ts`, `subscriptions.ts`, `plans.ts`, `concurrency.ts` |
| Checkout mock | `src/pages/MockCheckoutPage.tsx` |
| Landing | `src/pages/PlansLandingPage.tsx`, `PlanCheckoutButton.tsx` |
| Plano no app | `src/context/PlanContext.tsx`, `billingApi.ts`, `claimSubscription.ts` |
| Limites client | `src/services/requestConcurrency.ts`, `api.ts` (interceptor) |

---

## Checklist — sessão 02/06/2026 (Painel administrativo)

### Backend — observabilidade e admin

1. [x] **Log de requisições** — middleware `requestLogger` + coleção `apiRequestLogs` (tipo, rota, status, duração)
2. [x] **Classificação de tipos** — chat, blueprint, objetivos, canvas, relatórios, billing, memória, CRUD, etc.
3. [x] **Classificação de assuntos** — módulos Magnus (Consultoria IA, Difusão, Domínio, Planos, Geral)
4. [x] **Perfis de usuário** — `userProfiles` com contagem de requisições e datas de acesso
5. [x] **API admin** — `GET /api/admin/dashboard`, `PUT /api/admin/settings/plans`
6. [x] **Auth admin** — Firebase token + `ADMIN_EMAILS` (`middleware/adminAuth.ts`)
7. [x] **Script seed** — `npm run seed:admin --prefix server` (conta `admin@gmail.com` / `123456` quando Firebase configurado)
8. [x] **Env** — `ADMIN_EMAILS` documentado em `server/.env.example`

### Frontend — console admin

9. [x] **Rotas** — `/admin/login`, `/admin` com `AdminProtectedRoute`
10. [x] **Login admin** — email admin redireciona para `/admin` após autenticação
11. [x] **Layout premium** — sidebar, atmosfera bronze, Newsreader + Figtree (`admin-panel.css`)
12. [x] **Aba Requisições** — KPIs (tipo e assunto mais usados)
13. [x] **Gráficos** — barras por tipo, barras por assunto, donut de distribuição (`AdminBarChart`, `AdminDonutChart`)
14. [x] **Tabela simplificada** — últimas requisições: **data**, **nome do usuário**, **tipo** (sem ID, método, rota, status)
15. [x] **Aba Usuários** — email, nome, plano, volume, último acesso
16. [x] **Aba Planos** — editar nome, preço (texto/centavos) e limite de concorrência na API

### Deploy

17. [x] **Build** — `npm run build` (front + server) OK
18. [x] **Push** — `main` no GitHub (`88b5cc4` painel admin)
19. [ ] **Produção** — definir `ADMIN_EMAILS` no Render; criar admin no Firebase (seed ou console)

### Arquivos principais — painel admin

| Área | Caminhos |
|------|----------|
| API admin | `server/src/routes/admin.ts`, `services/adminDashboard.ts`, `apiRequestLog.ts`, `users.ts` |
| Middleware | `server/src/middleware/adminAuth.ts`, `requestLogger.ts` |
| UI | `src/pages/AdminPage.tsx`, `AdminLoginPage.tsx`, `styles/admin-panel.css` |
| Gráficos | `src/components/admin/AdminBarChart.tsx`, `AdminDonutChart.tsx` |
| Client API | `src/services/adminApi.ts` |

---

## Checklist — sessão 02/06/2026 (Ciclos, loop contínuo e Firestore)

### Ciclos de diagnóstico e workspace

1. [x] **Ciclo ativo** — `CycleContext` com troca, novo ciclo e snapshot do workspace
2. [x] **Persistência Firestore** — `diagnosticCycles` + `userWorkspace/{uid}` com fallback `localStorage` (`mm.activeCycleId`)
3. [x] **Seletor no header** — `CycleSelector` no dashboard para escolher o ciclo em execução
4. [x] **API por ciclo** — objetivos e Action Canvas filtram por `cycleId` no servidor (`objectives`, `actionCanvases`)
5. [x] **Painel de loop** — `LoopWorkspacePanel` com limpar diagnóstico, novo ciclo e opções avançadas
6. [x] **Reset no backend** — rotas `workspace` + serviço `workspace.ts` (reset, delete por usuário, histórico Magnus)
7. [x] **Diagnóstico inicial** — `InitialFormPage` com Human-to-Business Canvas no rodapé e gravação ao concluir o ciclo
8. [x] **Correção Firestore** — sanitização de `undefined` em `gateSummary` ao atualizar ciclo (`updateDiagnosticCycle`)
9. [x] **Regras Firestore** — `firestore.rules` + `firebase.json` para `userWorkspace` e `diagnosticCycles` (doc `docs/FIRESTORE-RULES.md`)
10. [x] **UI Histórico (Loop 4.2)** — `HistoricoPage` redesenhada: layout 2 colunas, timeline e painel de ciclos (`historico-loop.css`)

### Arquivos principais — ciclos e loop

| Área | Caminhos |
|------|----------|
| Contexto / UI | `src/context/CycleContext.tsx`, `CycleSelector.tsx`, `LoopWorkspacePanel.tsx` |
| Cliente | `src/services/diagnosticCycles.ts`, `cycleWorkspace.ts`, `workspaceLoop.ts` |
| Servidor | `server/src/routes/workspace.ts`, `server/src/services/workspace.ts` |
| Firestore | `firestore.rules`, `firebase.json`, `docs/FIRESTORE-RULES.md` |

---

## Checklist — sessão 02/06/2026 (Equipe, e-mail Resend e perfil do colaborador)

### Equipe, convite e envio transacional

1. [x] **E-mail de desenvolvimento** — `POST /api/team-members/:id/development-email` com resumo personalizado (destaques + melhorias)
2. [x] **Serviço Resend** — `server/src/services/email.ts` (envio real) e fallback modo demonstração no console
3. [x] **Resumo por membro** — `teamDevelopmentEmail.ts` cruza objetivos e entregas do Action Canvas pelo nome do responsável
4. [x] **Correção API equipe** — `teamApi.sendDevelopmentEmail` passa `userId` via `withUserId` (evita 404 com `demo-user`)
5. [x] **Env documentado** — `RESEND_API_KEY`, `EMAIL_FROM`, `FRONTEND_URL` em `server/.env.example`
6. [x] **UI Equipe / Difusão** — `MinhaEquipePage` com envio por membro, avisos demo/sucesso/erro e estilos `equipe-diffusao.css`
7. [x] **Perfil público do colaborador** — rota `/colaborador/:memberId` com `EmployeeProfilePage` (mock: destaques, objetivos, entregas, confirmação de leitura)
8. [x] **Link no convite** — e-mail HTML aponta para **Ver meu perfil de desenvolvimento** (`/colaborador/{id}`)
9. [x] **Dados mock** — `src/data/mockEmployeeProfile.ts` + `employee-profile.css` (visual editorial cream/bronze)
10. [x] **Validação local** — envio com `RESEND_API_KEY` no `server/.env` + reinício do servidor; fluxo testado com sucesso

### Validar em produção (equipe + e-mail)

- [ ] Render: `RESEND_API_KEY`, `EMAIL_FROM`, `FRONTEND_URL` no painel + redeploy da API
- [ ] Resend: domínio verificado para enviar a qualquer membro (teste com `onboarding@resend.dev` só para e-mail da conta)
- [ ] Netlify: deploy do front com rotas `/colaborador/*`
- [ ] Firebase: publicar `firestore.rules` (`firebase deploy --only firestore:rules`)
- [ ] Próximo passo: API pública do perfil com dados reais do ciclo (substituir mock)

### Arquivos principais — equipe e convite

| Área | Caminhos |
|------|----------|
| E-mail | `server/src/services/email.ts`, `teamDevelopmentEmail.ts`, `routes/teamMembers.ts` |
| Perfil | `src/pages/EmployeeProfilePage.tsx`, `src/data/mockEmployeeProfile.ts`, `employee-profile.css` |
| Equipe UI | `src/pages/MinhaEquipePage.tsx`, `src/services/api.ts` |

---

## Checklist — sessão 02/06/2026 (Solution Pick, Design e Consultoria IA)

### Onda 2 — Solution Pick (etapa 1.5)

1. [x] **API** — `POST /api/ai/solution-pick-suggest` + `server/src/services/solutionPickSuggest.ts` (~10 sugestões com score)
2. [x] **UI** — `SolutionPickPanel.tsx`: lista com score, seleção (máx. 5), botão **Ir para Design**
3. [x] **Persistência** — campo `selectedSolutionActionsJson` em `InitialFormData` (`solutionPick.ts`)
4. [x] **Helpers** — `buildDiagnosticContextThroughTeamScan`, exclusão do 1.5 na validação de fases (`diagnosticFlow.ts`)
5. [x] **Estilos** — `solution-pick.css`
6. [x] **Correção seleção** — toggle com `setData` funcional (evita estado desatualizado ao clicar)

### Onda 2 — Design (planos de ação)

7. [x] **Página** — `DesignPlansPage.tsx` em `/dashboard/design`: cards editáveis, validar, chat IA opcional
8. [x] **Fluxo** — concluir Design cria Action Canvases e navega para Difusão (`/dashboard/objetivos`)
9. [x] **Rota e waves** — `App.tsx` + `magnusWaves.ts` apontam Design para `/dashboard/design`
10. [x] **Estilos** — `design-plans.css` (grid 2 colunas de containers, tema bronze)
11. [x] **Bug Solution Pick → Design** — `normalizeFormData` preserva `selectedSolutionActionsJson`; fallback via `navigate` state + `sessionStorage`
12. [x] **Scroll** — classe `design-page-active` separada de `consultoria-ia-active` (main rola normalmente)
13. [x] **Layout** — containers lado a lado restaurados (com scroll corrigido)

### Consultoria IA — redesign e empty state

14. [x] **Layout clean** — histórico em drawer, header slim, mais área de chat (`consultoria-refined.css`)
15. [x] **Memória minimal** — `MagnusMemoryBanner` com prop `minimal` (só chips)
16. [x] **Empty state** — bloco intro agrupado; sugestões em grid 2×2
17. [x] **Cards azuis** — sugestões com gradiente/borda azul como antes (hover com elevação)
18. [x] **Gate Zero CSS** — não sobrescreve mais `.suggestion-button--pill` com estilo bronze

### Diagnóstico e limpeza de UI

19. [x] **Removido** — prévia Human-to-Business Canvas / resumo executivo no rodapé de `InitialFormPage.tsx`

### Qualidade

20. [x] **Build** — `npm run build` (front + server) OK após as alterações
21. [x] **Commit / push** — sessão Solution Pick / Design enviada (`582bef8`)

### Validar manualmente

- [ ] Solution Pick: gerar sugestões → selecionar ações → **Ir para Design**
- [ ] Design: editar planos → validar todos → **Concluir Design** → ver canvases na Difusão
- [ ] Consultoria IA: empty state com cards azuis e textos centralizados
- [ ] E-mail Resend em produção (Render) se ainda não deployado

### Arquivos principais — Solution Pick e Design

| Área | Caminhos |
|------|----------|
| Solution Pick API | `server/src/services/solutionPickSuggest.ts`, `server/src/routes/ai.ts` |
| Solution Pick UI | `src/components/SolutionPickPanel.tsx`, `src/styles/solution-pick.css` |
| Design | `src/pages/DesignPlansPage.tsx`, `src/styles/design-plans.css` |
| Persistência | `src/services/solutionPick.ts`, `src/services/initialForm.ts` |
| Layout dashboard | `src/components/DashboardLayout.tsx` (`design-page-active`) |
| Consultoria | `src/pages/ConsultoriaIAPage.tsx`, `src/styles/consultoria-refined.css` |

---

## Checklist — sessão 29/05/2026 (Landing de planos + auth)

1. [x] **Landing de planos** — `PlansLandingPage.tsx` com hero Magnus Waves, seções Fluxo e Stack, footer com links
2. [x] **Três planos de concorrência** — **Starter** (1 requisição por vez), **Advanced** (3), **Premium** (ilimitado), com cards e visual de slots/∞
3. [x] **Scroll reveal** — `useScrollReveal.ts` + `ScrollReveal.tsx`; conteúdo aparece ao rolar (`prefers-reduced-motion` respeitado)
4. [x] **Visual tecnológico** — `plans-landing.css`: grid perspectiva, orbs, scanline, bronze/Newsreader+Figtree alinhados ao app
5. [x] **Rotas** — `/` e `/planos` → landing; `/login` e `/register` mantidos; 404 redireciona para `/`
6. [x] **CTAs na landing** — botões para criar conta (`/register`) e entrar (`/login`) no hero, cards e bloco final
7. [x] **Voltar para a landing** — login e registro com `backTo` no `AuthLayout` (link para `/`)
8. [x] **Botões de auth refinados** — classes `auth-btn` / `--back` / `--primary` (largura total, ícone, gradiente, seta animada)
9. [x] **Build** — `npm run build` (front + API) sem erros de TypeScript

### Arquivos principais — landing + auth

| Área | Caminhos |
|------|----------|
| Landing | `src/pages/PlansLandingPage.tsx`, `src/styles/plans-landing.css` |
| Animação | `src/hooks/useScrollReveal.ts`, `src/components/ScrollReveal.tsx` |
| Rotas | `src/App.tsx`, `src/main.tsx` |
| Auth | `src/components/AuthLayout.tsx`, `LoginPage.tsx`, `RegisterPage.tsx`, `theme-refined.css` |

---

## Checklist — tudo que fizemos hoje (19/05/2026)

### Correções funcionais (API Render × frontend)

- [x] Identificada causa raiz: API em produção devolve formato diferente do backend local
- [x] Criado `src/services/apiNormalize.ts` (chat, conversas, sugestões, relatórios, modelos)
- [x] Integrado normalização em `src/services/api.ts`
- [x] **Consultoria IA** — chat, nova conversa, histórico e respostas da IA funcionando
- [x] **Sugestões de objetivos** — modal lê `objectives` / `suggestions` + mapeamento de campos
- [x] **Relatórios** — `conteudo`, `resumo` e `stats` gerados a partir de `data` / `insights`
- [x] **Modelos de IA** — `displayName` no seletor

### UI, marca e responsividade

- [x] Design system: `magnus-design.css`, `consultoria-responsive.css`, `theme-refined.css`
- [x] Paleta alinhada ao site [magnusmind.io](https://magnusmind.io/) (`#2F3A4C`, `#AF9270`, `#FFBC7D`, `#F5F3F2`)
- [x] `brand-overrides.css` + tokens em `theme-refined.css`
- [x] Fontes Roboto / Roboto Slab no `index.html`
- [x] Dashboard responsivo e Consultoria IA (drawer de histórico em telas médias)
- [x] Acessibilidade: skip link, `aria-current`, foco no `main`

### Firebase

- [x] SDK configurado — projeto `magnusmind-d42ec` em `src/config/firebase.ts`
- [x] `measurementId` + Google Analytics (`initFirebaseAnalytics`)
- [x] Auth, Firestore e Storage exportados
- [x] Variáveis `VITE_FIREBASE_*` em `.env.development`, `.env.production` e `.env.example`

### Produto — Manifesto e Miro (MM People Sprint 90+)

- [x] Documentado manifesto em `docs/MANIFESTO-MVP.md`
- [x] Fluxo Miro completo em `docs/FLUXO-PROJETO.md` (4 ondas + sub-etapas)
- [x] Constantes do fluxo: `src/constants/magnusWaves.ts`
- [x] Componente **Magnus Waves** no dashboard (`MagnusWavesProgress.tsx`)
- [x] **Onda 1** — Human-to-Business Canvas™ (formulário com badges 1.1–1.5)
- [x] **Onda 2** — MM Blueprint (People Sprint IA + gate se diagnóstico incompleto)
- [x] **Onda 3** — Difusão / Make the Move (Objetivos + Equipe)
- [x] **Onda 4** — MID / Kirkpatrick 4 + loop (Relatórios + Histórico)
- [x] Menu lateral numerado por onda; copy das telas alinhada ao Miro
- [x] `docs/MARCA-MAGNUSMIND.md` com paleta oficial

### Repositório e qualidade

- [x] Build de produção validado (`npm run build`)
- [x] Push no GitHub — commit `c8e7ec7` (compatibilidade API + UI)
- [x] Push no GitHub — commit `a159960` (Miro, Firebase, marca, ondas)

### Conta para testar

| Campo | Valor |
|-------|-------|
| E-mail | `demo@magnusmind.app` |
| Senha | `MagnusMind2026!` |

---

## Sessão de 19/05/2026 — resumo em 8 tópicos

1. **API Render compatível** — `apiNormalize.ts` corrige chat, sugestões e relatórios.
2. **Funcionalidades críticas** — Consultoria IA, sugestões e relatórios voltaram a funcionar.
3. **UI + marca Magnus Mind** — cores do site, responsividade e design system.
4. **Firebase conectado** — `magnusmind-d42ec` com Auth, Firestore, Analytics.
5. **Manifesto People Sprint** — documentado em `docs/MANIFESTO-MVP.md`.
6. **Fluxo Miro / Magnus Waves** — 4 ondas mapeadas no app e na documentação.
7. **Human-to-Business Canvas** — formulário com etapas 1.1–1.5 do board.
8. **Build OK** — pronto para deploy; validar no Netlify após push.

---

## 1. Plataforma e arquitetura

| Item | Status |
|------|--------|
| Frontend React 19 + Vite 6 + TypeScript | ✅ |
| Backend Express + TypeScript (`server/`) | ✅ |
| Autenticação Firebase (login e registro) | ✅ |
| Firestore — formulário inicial (`initialForms`) | ✅ |
| Deploy híbrido Netlify + Render (`netlify.toml`, `render.yaml`, `DEPLOY.md`) | ✅ |
| Variáveis de ambiente (`.env.example`, `.env.development`, `.env.production`) | ✅ |
| README com início rápido | ✅ |

---

## 2. Integrações e API

| Item | Status |
|------|--------|
| Open Router — chat e modelos de IA | ✅ |
| RAG — frameworks do consultor no contexto das respostas | ✅ |
| API de busca (Serper / Tavily) — configurável | ✅ |
| WhatsApp Cloud API — estrutura e rotas preparadas | ✅ |
| Timeout geral 90s / chat 120s | ✅ |
| Endpoints: objetivos, equipe, relatórios, atividades, IA | ✅ |
| Rota raiz `GET /` com status da API | ✅ |
| Health check `GET /api/health` (Render) | ✅ |
| Respostas 404 em JSON (rotas inexistentes) | ✅ |
| URL padrão da API → Render (sem depender de `localhost:3001`) | ✅ |
| Modo API local via `VITE_USE_LOCAL_API=true` + proxy Vite | ✅ |

---

## 3. Telas e funcionalidades

| Item | Status |
|------|--------|
| Login e registro | ✅ |
| Dashboard — visão geral | ✅ |
| Formulário inicial (5 campos + estágios do negócio) | ✅ |
| Consultoria IA (chat, histórico, modelos, sugestões) — compatível com API Render | ✅ |
| Objetivos estratégicos (CRUD, filtros, CSV, sugestões IA) — compatível com API Render | ✅ |
| Minha equipe (membros, performance, filtros) | ✅ |
| Relatórios (gerar e visualizar) — compatível com API Render | ✅ |
| Histórico de atividades | ✅ |

---

## 4. Dashboard — dados reais

| Item | Status |
|------|--------|
| Estágio do negócio lido do Firestore | ✅ |
| Mapa de descrições por fase (Crescimento, Estabilização, etc.) | ✅ |
| Estatísticas: objetivos, equipe, relatórios | ✅ |
| Estado “Carregando...” antes dos dados | ✅ |
| Recomendações dinâmicas (objetivos em aberto por prioridade) | ✅ |
| Cards de recomendação clicáveis → Objetivos | ✅ |
| Ações rápidas funcionais (navegação + ações automáticas) | ✅ |
| Atividade recente com datas relativas | ✅ |

### Ações rápidas (comportamento)

| Ação | Comportamento |
|------|----------------|
| Editar Formulário | Abre `/dashboard/initial-form` |
| Consultoria IA | Abre `/dashboard/consultoria-ia` |
| Criar Objetivo | Abre Objetivos + modal de criação |
| Gerar Relatório | Abre Relatórios + inicia geração automática |

---

## 5. Interface e experiência visual

| Item | Status |
|------|--------|
| Tema escuro navy com grade no fundo | ✅ |
| Tipografia Plus Jakarta Sans | ✅ |
| Container de login/registro com visual mais vivo (borda e glow) | ✅ |
| Correção da faixa branca na base da tela de auth | ✅ |
| Efeito de brilho seguindo o cursor no fundo (login/registro) | ✅ |
| Sidebar refinada com item ativo em destaque | ✅ |
| Cards com profundidade, bordas e sombras consistentes | ✅ |
| Selos de prioridade ALTA / MÉDIA / BAIXA | ✅ |
| Layout responsivo (mobile e desktop) | ✅ |
| Ações rápidas com `Link` e área de clique corrigida (z-index) | ✅ |

---

## 6. Consultoria IA — correções

| Item | Status |
|------|--------|
| Conexão com API no Render (não mais `localhost:3001` por padrão) | ✅ |
| Normalização de resposta do chat (`conversation` + `messages` → `reply`) | ✅ |
| Carregamento de conversa (`conversation` + `messages` no GET) | ✅ |
| Mensagem de erro clara quando API indisponível | ✅ |
| Botão “Tentar novamente” no erro de conexão | ✅ |
| Histórico de conversas via `/api/ai/conversations` | ✅ |
| Seleção de modelo de IA (`displayName`) | ✅ |
| Layout responsivo da tela de consultoria | ✅ |

---

## 7. Qualidade técnica

| Item | Status |
|------|--------|
| TypeScript no frontend e backend | ✅ |
| Build de produção validado (`npm run build`) | ✅ |
| Rotas protegidas e redirect SPA | ✅ |
| Proxy local `/api` → backend no Vite (modo local) | ✅ |
| Tratamento de estados vazios e carregamento | ✅ |
| CORS configurado para Netlify e localhost | ✅ |

---

## 8. Repositório e deploy

| Item | Status |
|------|--------|
| Código versionado no GitHub | ✅ |
| Branch `main` | ✅ |
| Instruções de deploy em `DEPLOY.md` | ✅ |
| Blueprint Render (`render.yaml`) | ✅ |
| Checklist de entrega (`CHECKLIST.md`) | ✅ |

---

## Checklist — sessão 11/06/2026 (Stripe, admin, suporte e acesso)

1. [x] **Solution Pick** — correção da seleção: reconciliação com a lista atual, IDs estáveis (`sol-1`…`sol-10`) e toggle sem bug de limite fantasma
2. [x] **Admin — notificações** — sininho no topo com alertas de novo usuário, mensagem de suporte e requisição na API (`AdminNotificationsBell`, `GET /api/admin/notifications`)
3. [x] **Admin — Suporte** — bolinha dourada no menu quando há mensagem não lida; some ao abrir a aba (`markAllReadByAdmin`)
4. [x] **Chat de suporte** — widget flutuante no app, API `supportChat`, painel **Suporte** no console admin
5. [x] **Landing** — link oficial do Instagram [@magnusmind.io](https://www.instagram.com/magnusmind.io/) no rodapé
6. [x] **Stripe Checkout real** — redirecionamento para `checkout.stripe.com`, `locale: pt-BR` e guia em `docs/STRIPE-PLANOS.md`
7. [x] **Acesso** — removidos “Criar conta” da landing e “Registre-se” do login; entrada só para quem já tem conta
8. [x] **Registro pós-pagamento** — `/register` bloqueada sem `payment=success` + `session_id` (fluxo Stripe → criar conta)
9. [x] **Admin — criar usuário** — formulário com email, senha, plano e limite de requisições (`POST /api/admin/users`, Firebase Admin)
10. [x] **Admin — editar limites** — tabela com plano e requisições simultâneas editáveis por usuário (`PATCH /api/admin/users/:id`)
11. [x] **Limites por plano** — Starter 1 · Advanced 3 · Premium ilimitado via `concurrency.ts` + claim após checkout
12. [x] **Assinatura recorrente** — webhooks `customer.subscription.updated`, `invoice.payment_failed` e cancelamento (`subscription.deleted`)
13. [x] **Login redesenhado** — card menor, centralizado, botão voltar fora do card (`auth-refined.css`, `AuthLayout`)
14. [x] **Dev Stripe** — log `Stripe: configurado` no boot da API e script `npm run dev:api` na raiz do projeto

### Validar manualmente — 11/06

- [ ] Checkout Stripe → registro → dashboard com plano correto
- [ ] Admin: sininho, bolinha Suporte, criar/editar usuário com limite
- [ ] Widget de suporte no app e resposta no admin
- [ ] Solution Pick: selecionar/deselecionar após atualizar sugestões

### Arquivos principais — sessão 11/06

| Área | Caminhos |
|------|----------|
| Solution Pick | `src/components/SolutionPickPanel.tsx`, `src/services/solutionPick.ts`, `server/src/services/solutionPickSuggest.ts` |
| Stripe / billing | `server/src/services/stripeBilling.ts`, `docs/STRIPE-PLANOS.md`, `server/src/routes/billing.ts` |
| Admin notif. / users | `src/components/admin/AdminNotificationsBell.tsx`, `AdminUsersPanel.tsx`, `server/src/services/adminNotifications.ts`, `adminUsers.ts` |
| Suporte | `src/components/SupportChatWidget.tsx`, `server/src/services/supportChat.ts`, `server/src/routes/support.ts` |
| Auth / landing | `src/styles/auth-refined.css`, `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx`, `src/pages/PlansLandingPage.tsx` |

---

## Checklist — sessão 02/06/2026 (dia completo)

> Tudo implementado nesta sessão de desenvolvimento — **ainda não commitado** no Git (validar localmente antes de deploy).

### Resumo do dia

| # | Tema | Status |
|---|------|--------|
| 1 | Reorganizar fluxo: Consultoria na Equipe + Design com validação | ✅ |
| 2 | Tela de escolha de projeto (card estilo login) antes do dashboard | ✅ |
| 3 | Nome do projeto (criar + concluir diagnóstico) | ✅ |
| 4 | Concluir MID → página de relatórios com geração automática | ✅ |
| 5 | Correção Consultoria IA — carregar conversas do histórico | ✅ |

### 1. Reorganização do fluxo Magnus Waves (Equipe + Design)

- [x] **Consultoria IA / MM Blueprint** — movida para **Equipe** (`/dashboard/minha-equipe?tab=consultoria`), aba **Consultoria IA · Blueprint**
- [x] **Design (Onda 2)** — sidebar aponta para `/dashboard/design` (validação de planos, não mais o chat)
- [x] **Redirect legado** — `/dashboard/consultoria-ia` → Equipe → consultoria
- [x] **`ConsultoriaIAPage`** — props `embedded` e `onBlueprintCommitted`; ao concluir Gate Zero navega para Design
- [x] **`MinhaEquipePage`** — abas **Membros** | **Consultoria IA · Blueprint** com chat em tela cheia na aba consultoria
- [x] **`DesignPlansPage`** — layout dividido: editor de planos + **preview Action Canvas** (`ActionCanvasPreview.tsx`)
- [x] **Sincronização** — validar plano cria canvas na API; edições seguintes sincronizam automaticamente (debounce)
- [x] **Concluir Design** — envia planos para Difusão (`/dashboard/objetivos`)
- [x] **Concluir canvas (diagnóstico)** — navega para `/dashboard/design` (não mais só o hub)
- [x] **Botão “Conversar com IA”** no Design — abre Equipe → consultoria com mensagem pré-preenchida
- [x] **DashboardLayout** — Domínio (MID) abaixo de Difusão na sidebar; estado ativo da Equipe inclui aba consultoria

### 2. Escolha de projeto ao entrar (card estilo login)

- [x] **`ProjectSelectPage`** — tela `/escolher-projeto` fora do dashboard, mesmo visual do login (`AuthLayout` + card central)
- [x] **Fluxo pós-login** — Login e registro vão para `/escolher-projeto` (não entram direto no dashboard)
- [x] **`ProjectGate`** — bloqueia `/dashboard/*` até o usuário escolher ou criar um projeto (`sessionStorage`)
- [x] **Lista de ciclos** — itens clicáveis no card com status e próximo passo (Diagnóstico / Design / Difusão / Domínio)
- [x] **Novo projeto** — cria ciclo em branco e abre o diagnóstico
- [x] **`cycleRouting.ts`** — após escolher, redireciona para a tela certa do fluxo daquele ciclo
- [x] **Trocar projeto** — menu **Projetos** na sidebar e **Escolher projeto** no seletor de ciclos → `/escolher-projeto`
- [x] **Logout** — limpa flag de workspace; próximo login exige nova escolha
- [x] **Hub MID** — painel executivo em `/dashboard/inicio` (ícone Hub na sidebar)
- [x] Removido hub de ciclos dentro do dashboard (`CycleHubPage` → substituído pela tela de escolha)

### 3. Nome do projeto

- [x] **Escolha de projeto (final do card)** — campo **Nome do projeto** + **Criar e iniciar diagnóstico** ao criar ciclo novo
- [x] **Modal “Nome do seu projeto”** — ao clicar **Concluir canvas**, confirma ou ajusta o nome (pré-preenchido se já definiu na entrada)
- [x] **Persistência** — nome salvo em `diagnosticCycles.label` no Firestore
- [x] **Exibição** — nome aparece na escolha de projetos, seletor de ciclos e avisos pós-diagnóstico
- [x] Labels automáticos (`Ciclo N · data`) não são reaproveitados — usuário define o nome do projeto

### 4. Concluir MID → relatório Domínio

- [x] **Bloco “Concluir MID”** no fim da página Difusão (`ObjetivosPage`)
- [x] **Sign-off SIM** no Action Canvas — encerra canvas e vai para `/dashboard/relatorios` com geração automática
- [x] **`RelatoriosPage`** — `autoGenerate` no `location.state` dispara **Gerar relatório completo** e abre o documento
- [x] Aviso visual na página de relatórios quando veio da conclusão da Difusão / sign-off

### 5. Navegação e links atualizados

- [x] `LoginPage`, `RegisterPage`, `AdminProtectedRoute`, `AdminPage` → `/escolher-projeto`
- [x] `DashboardHome` — hub em `/dashboard/inicio`
- [x] `HistoricoPage`, `midDashboard.ts`, `ObjetivosPage` — links de blueprint/consultoria corrigidos
- [x] `App.tsx` — rotas `escolher-projeto`, `inicio`, redirect `dashboard/ciclos`

### 6. Consultoria IA — correção “Não foi possível carregar a conversa”

- [x] **Causa** — `GET /api/ai/conversations/:id` não enviava `userId`; servidor usava `demo-user` → 404
- [x] **Interceptor global** — header `x-user-id` em todas as requisições quando logado (`api.ts`)
- [x] **`aiApi.conversation`** — passa `userId` na query
- [x] **`aiApi.updateTitle` / `updateModel`** — passam `userId` no body
- [x] **UX** — conversa 404 removida do histórico; mensagem orienta a iniciar nova conversa
- [x] Chat, histórico e edição de título/modelo funcionando na aba **Equipe → Consultoria IA**

### 7. Estilos e UI

- [x] `design-plans.css` — workspace editor + preview, cards ativos, preview Action Canvas (`ac-preview`)
- [x] `equipe-diffusao.css` — abas equipe, embed consultoria em altura total
- [x] `consultoria-responsive.css` — modo `consultoria-ia--embedded`
- [x] `project-select.css` — lista + campo nome no final do card de auth
- [x] `action-canvas.css` — painel **Concluir MID** na Difusão
- [x] `cycle-selector.css` — link **Escolher projeto**
- [x] `AuthLayout` — prop `cardClassName` para card mais largo na escolha de projetos

### Validar manualmente — 02/06/2026

- [ ] Login → card de escolha (sem sidebar) → clicar projeto → entra no dashboard na tela correta do ciclo
- [ ] **Novo projeto** — preencher nome no final do card → criar → diagnóstico abre com ciclo nomeado
- [ ] Diagnóstico → **Concluir canvas** → modal confirma/ajusta nome → Design com planos do Solution Pick
- [ ] Design: editar plano → preview atualiza → **Validar e criar canvas** → sincroniza na API
- [ ] Equipe → aba **Consultoria IA · Blueprint** → enviar mensagem → abrir conversa no histórico (sem erro)
- [ ] Equipe → Gate Zero concluído → redireciona para Design
- [ ] Difusão → Action Canvas sign-off **SIM** → relatórios com geração automática
- [ ] Difusão → **Concluir MID e gerar relatório** → mesma página de relatórios
- [ ] Trocar projeto pelo seletor ou menu Projetos → volta ao card de escolha
- [ ] Logout → login de novo → exige escolha de projeto outra vez

### Arquivos principais — sessão 02/06/2026

| Área | Caminhos |
|------|----------|
| Escolha de projeto | `src/pages/ProjectSelectPage.tsx`, `src/components/ProjectGate.tsx`, `src/services/projectWorkspace.ts`, `src/services/cycleRouting.ts` |
| Design + preview | `src/pages/DesignPlansPage.tsx`, `src/components/ActionCanvasPreview.tsx`, `src/styles/design-plans.css` |
| Equipe + IA | `src/pages/MinhaEquipePage.tsx`, `src/pages/ConsultoriaIAPage.tsx`, `src/services/api.ts`, `src/styles/equipe-diffusao.css` |
| Diagnóstico / nome ciclo | `src/pages/InitialFormPage.tsx`, `src/context/CycleContext.tsx` |
| MID / relatório | `src/pages/ObjetivosPage.tsx`, `src/pages/RelatoriosPage.tsx`, `src/components/ActionCanvasPanel.tsx` |
| Rotas / nav | `src/App.tsx`, `src/components/DashboardLayout.tsx`, `src/components/CycleSelector.tsx` |
| Auth / entrada | `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx`, `src/styles/project-select.css` |

### Estatísticas do diff (não commitado)

- **29 arquivos** alterados · **~1014** linhas adicionadas · **~152** removidas
- **6 arquivos novos:** `ActionCanvasPreview`, `ProjectGate`, `ProjectSelectPage`, `cycleRouting`, `projectWorkspace`, `project-select.css`

---

## Estrutura do projeto

```
395-flavio/
├── src/                    # Frontend React
│   ├── components/         # AuthLayout, DashboardLayout, CursorGlowBackground
│   ├── pages/              # Login, Dashboard, IA, Objetivos, Equipe, Relatórios
│   ├── services/           # api.ts, apiNormalize.ts, initialForm.ts
│   ├── config/firebase.ts
│   └── styles/theme-refined.css
├── server/src/             # API Express
│   ├── routes/             # objectives, ai, reports, team, activities, whatsapp
│   └── services/           # openrouter, rag, firebase, search
├── netlify.toml
├── render.yaml
├── DEPLOY.md
└── CHECKLIST.md
```

---

## Como validar localmente

```bash
# API (opcional — ou use API no Render via .env.development)
cd server && npm install && npm run dev

# Frontend
npm install && npm run dev
```

Acesse: **http://localhost:5173** (não abra `localhost:3001` no navegador — essa é só a API).

Teste da API no Render:
- `https://<seu-servico>.onrender.com/`
- `https://<seu-servico>.onrender.com/api/health`

---

## Variáveis necessárias em produção

**Frontend (Netlify):** `VITE_API_BASE_URL`, `VITE_FIREBASE_*`  

**Backend (Render):** `OPENROUTER_API_KEY`, `FIREBASE_*` (Admin), opcional `SERPER_API_KEY` / `TAVILY_API_KEY`, `WHATSAPP_*`, `CORS_ORIGIN`

---

## Conta demo (Firebase)

| Campo | Valor |
|-------|-------|
| E-mail | `demo@magnusmind.app` |
| Senha | `MagnusMind2026!` |

---

## Checklist — sessão 02/06/2026 (scans, transições e visual premium)

> Trabalho da tarde — scans organizacionais, UX de diagnóstico focado, transições de rota e shell premium. **Ainda não commitado.**

1. [x] **Scans organizacionais** — tipos, questionários (cultura, liderança, CX, EX, alinhamento, comunicação, turnover) e persistência em `organizationalScanData`
2. [x] **Hub de scans** — rota `/dashboard/scans` com escolha entre diagnóstico completo e focado
3. [x] **Runner de scan** — rota `/dashboard/scans/:scanId` com formulário por blocos e `ScanFieldControl`
4. [x] **Diagnóstico focado opcional** — um scan temático pode substituir o canvas; sem obrigar todos os temas
5. [x] **Salvar rascunho** — progresso parcial sem validação; **Concluir diagnóstico** exige 100% do scan escolhido
6. [x] **Scans 5 e 6** — Alinhamento Estratégico e Comunicação com conteúdo completo (antes placeholder)
7. [x] **Link no canvas** — botão **Diagnóstico focado** em `InitialFormPage` apontando para o hub de scans
8. [x] **Contexto para IA** — seção “Diagnóstico focado” em `buildDiagnosticContext` (memória / sugestões)
9. [x] **Modal nome do projeto** — CSS do overlay corrigido (centralizado, backdrop, botões alinhados)
10. [x] **Transições de página** — `View Transitions API` + Framer Motion (`AnimatedOutlet`, `view-transitions.css`)
11. [x] **Navegação com transição** — sidebar, links da landing, login, scans e CTAs usam `useViewTransitionNavigate` / `ViewTransitionLink`
12. [x] **Chrome estável** — sidebar e header fixos na animação; conteúdo central transiciona
13. [x] **Visual premium (referência zip)** — `premium-shell.css` com tokens escuros, âmbar Magnus e tipografia display
14. [x] **Stage card** — conteúdo do dashboard dentro de card arredondado com textura e linha dourada no topo
15. [x] **Sidebar refinada** — blur, logo em caixa, indicador ativo, tooltips no modo recolhido
16. [x] **UI dos scans** — cards com hover/glow, badges pill e títulos em Newsreader
17. [x] **Design e Consultoria** — layout fluido (sem stage card) para não quebrar telas largas
18. [x] **Build** — `npm run build` passando após scans, transições e premium shell

---

## Checklist — sessão Onda 4 · Domínio (inteligência organizacional)

> Reestruturação da Onda 4, integração MID, refinamento visual e fluxo real (sem mocks de IA).

### Arquitetura e dados

1. [x] **Tipos** — `src/types/domainWave.ts` (planos, impacto, learning, sustentação, scores)
2. [x] **Utilitários** — `src/utils/domainWave.ts` (derivar planos da Onda 3, métricas, sustainability score, contexto IA)
3. [x] **Persistência** — `src/services/domainWaveStorage.ts` + chave `domainWaveData` em `initialForm.ts` (Firebase)
4. [x] **API IA** — `POST /api/ai/domain-learnings` + `server/src/services/domainLearnings.ts`
5. [x] **Contexto para relatórios** — `server/src/services/domainWaveContext.ts` (lê Domínio do Firestore no dossiê)

### Página Onda 4 (`/dashboard/relatorios`)

6. [x] **Pergunta central** — “O que aprendemos com o que fizemos?” como foco da página
7. [x] **Bloco 1 — Resultado dos Planos** — tabela auto da Difusão + % execução, concluídos, atrasados, Action Velocity
8. [x] **Bloco 2 — Impacto Gerado** — escala 1–5 + evidências por plano concluído
9. [x] **Bloco 3 — Learning & Insights** — 5 campos reflexivos + Top 5 via IA
10. [x] **Bloco 4 — Radar de Sustentação** — 5 critérios (1–5) → Sustainability Score
11. [x] **Componente** — `src/components/domain/DomainWaveWorkspace.tsx`
12. [x] **Relatórios secundários** — seção colapsável “Relatórios e histórico” (dossiê + timeline)

### MID (Magnus Intelligence Dashboard)

13. [x] **5º KPI** — Sustainability Score em `midExecutiveKpis.ts` (ícone shield)
14. [x] **Grid MID** — 5 colunas em `mid-dashboard.css`
15. [x] **Copy MID** — subtítulo atualizado para cinco indicadores

### UI / UX (refinamento)

16. [x] **Visual editorial** — tokens alinhados ao MID (Newsreader, Figtree, bronze/dourado)
17. [x] **Hero assimétrico** — pergunta central + card-resumo de planos
18. [x] **Nav sticky** — âncoras Planos · Impacto · Aprendizados · Sustentação
19. [x] **Skeleton loading** — em vez de texto “Carregando…”
20. [x] **Acessibilidade** — `h1`, labels `htmlFor`, `aria-live`, focus-visible, `tabular-nums`
21. [x] **CSS** — `src/styles/domain-wave.css` + import em `main.tsx`
22. [x] **Ícones no lugar de emojis** — badges de sustentação com Lucide

### Fluxo real (sem demo silencioso)

23. [x] **Top 5 IA** — removido mock; exige LLM configurado; erro explícito se falhar
24. [x] **Dossiê** — removido template “Modo Demonstração”; só gera com IA real
25. [x] **Dossiê enriquecido** — inclui dados do Domínio salvos no prompt
26. [x] **Status IA** — `aiApi.status()` + banner quando `configured: false`
27. [x] **Auto-save** — rascunho do Domínio no Firebase a cada ~2s após edição
28. [x] **Utilitário de erro** — `src/utils/apiError.ts` (`readApiErrorMessage`, `isLlmNotConfiguredApiError`)

### Integração frontend

29. [x] **`aiApi.suggestDomainLearnings`** — em `src/services/api.ts`
30. [x] **`RelatoriosPage.tsx`** — workspace principal + archive + erros de IA no dossiê
31. [x] **Build** — `npm run build` (frontend + server) passando

### Para ativar IA em produção

32. [ ] **Servidor** — `OPENROUTER_API_KEY` ou `OPENAI_API_KEY` em `server/.env`
33. [ ] **Validar** — `GET /api/ai/status` → `{ configured: true }`
34. [ ] **Testar fluxo** — planos na Difusão → preencher Domínio → Top 5 → salvar → ver score no MID → gerar dossiê

---

*Última atualização: 21 de julho de 2026 — cascata de phase lock, Design→Difusão com aviso de validação, UX Difusão/Diagnóstico/MID*
