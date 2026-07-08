# Roadmap operacional — Magnus Mind (395-Flavio)

Documento de referência para priorizar melhorias, deploy e evolução do produto.  
**Última revisão:** 06/07/2026  
**Uso:** consultar antes de cada sprint; marcar itens concluídos; não duplicar escopo entre tracks.

---

## Estado atual (resumo)

| Área | Status |
|------|--------|
| MVP funcional | ✅ Landing, auth, dashboard, ondas 1–3, IA, planos |
| Segurança API | ✅ Token Firebase, ciclos via API, rate limit reset senha |
| Stripe produção | ❌ `stripeConfigured: false` no Render |
| Firestore rules publicadas | ⚠️ Verificar se `firestore.rules` do repo está no Firebase |
| Testes automatizados | ❌ Nenhum |
| Responsivo / layout | ⚠️ Melhorado localmente — header 2 linhas, KPI 2 cols mobile, landing/auth |
| Código local não deployado | ⚠️ Registro, escolher projeto, logo, `GET /api/cycles` |

**URLs de referência**

- Frontend: https://395-flavio2.netlify.app  
- API: https://three95-flavio-fcha.onrender.com  
- Repo (novo remoto): https://github.com/borderlesspc05/395-Flavio  

---

## Track A — Deploy e go-live (crítico)

Objetivo: produção alinhada ao código e cobrança real opcional.

### A1. Publicar código pendente

- [ ] Commit + push da branch `feature/plan-project-limits` (ou merge em `main`)
- [ ] Deploy Netlify (front) + Render (API)
- [ ] Smoke test pós-deploy (checklist abaixo)

**Arquivos recentes (sessão 06/07):**

- `src/pages/RegisterPage.tsx`, `src/utils/authReady.ts`, `src/components/ProtectedRoute.tsx`
- `src/pages/ProjectSelectPage.tsx`, `src/styles/project-select.css`
- `src/components/AuthLayout.tsx`, `src/assets/icone-magnusmind.svg`
- `server/src/routes/cycles.ts`, `src/services/diagnosticCycles.ts`
- `src/pages/PlansLandingPage.tsx` (remoção link Admin no footer)

### A2. Firestore

- [ ] `firebase deploy --only firestore:rules`
- [ ] Atualizar `docs/FIRESTORE-RULES.md` (hoje desatualizado: ciclos só leitura no cliente)
- [ ] Testar: listar ciclos, criar via API, excluir, sem `permission-denied`

### A3. Variáveis de ambiente

**Render**

- [ ] `CORS_ORIGIN` com URL Netlify atual
- [ ] `FIREBASE_WEB_API_KEY` (esqueci a senha)
- [ ] `STRIPE_SECRET_KEY`, `STRIPE_PRICE_*`, `STRIPE_WEBHOOK_SECRET`
- [ ] `RESEND_API_KEY`, `EMAIL_FROM` (domínio verificado)
- [ ] `FRONTEND_URL`

**Netlify**

- [ ] `VITE_API_BASE_URL`, `VITE_FIREBASE_*`

**Firebase Auth**

- [ ] Domínio Netlify em *Authorized domains*

### A4. Stripe (quando cliente estiver pronto)

- [ ] Rodar `npm run stripe:health --prefix server` com chaves live
- [ ] Webhook → `POST /api/billing/webhook`
- [ ] Desativar ou restringir `/mock-checkout` em produção
- [ ] Doc: `docs/STRIPE-PLANOS.md`

### A5. Smoke test pós-deploy (manual)

1. Landing → mock ou Stripe checkout → registro → **entra no sistema** (sem pedir login de novo)
2. Escolher projeto: lista visível com zoom 100% e 125%
3. Starter: 1 ciclo — criar bloqueado, existente clicável
4. Esqueci a senha
5. Criar/excluir ciclo (API)
6. Dashboard `/dashboard/inicio` em desktop e mobile

---

## Track B — Produto e dados reais

Objetivo: reduzir mocks e fechar fluxos comerciais.

| ID | Item | Situação | Próximo passo |
|----|------|----------|----------------|
| B1 | Perfil colaborador `/colaborador/:id` | Mock (`mockEmployeeProfile.ts`) | API + dados do ciclo/membro |
| B2 | E-mail equipe (Resend) | Teste só para email da conta | Verificar domínio em produção |
| B3 | RAG Supabase | `RAG_ENABLED=false` | Seguir `docs/RAG-SUPABASE.md` |
| B4 | WhatsApp | Stub | Tokens + webhook se for requisito |
| B5 | IA sem chave | Modo demo em várias rotas | Garantir `OPENAI_API_KEY` no Render |
| B6 | Onboarding | Melhorado localmente | Validar em produção após deploy |
| B7 | Diagnóstico por conversa | Pendente no CHECKLIST | IA preenche com confirmação do usuário |

---

## Track C — Segurança e qualidade

| ID | Item | Ação |
|----|------|------|
| C1 | Testes E2E | Playwright: landing → registro → 1 ciclo → dashboard |
| C2 | Testes API | Rotas auth, cycles quota, billing claim |
| C3 | Monitoramento | Alertas 5xx Render; log estruturado em claim/billing |
| C4 | Admin | Sem link público (feito); rotas `/admin` só para emails allowlist |
| C5 | Cold start Render | Plano pago ou health ping se UX for afetada |

---

## Track D — Responsivo e arquitetura visual (prioridade alta)

Objetivo: layout equilibrado em **desktop, tablet e mobile** — blocos bem posicionados, sem tudo empilhado sem hierarquia.

### Problemas observados (06/07 — iPhone / dashboard)

1. **Header:** seletor de ciclo truncado (`DIAGNÓS...`); pouco espaço entre menu, ciclo e avatar  
2. **Hub (MID):** cards KPI em coluna única no mobile — perda de escaneabilidade  
3. **Grids:** vários breakpoints colapsam para `1fr` cedo demais (ex.: `mid-exec-kpi-grid` → 1 coluna em `<640px`)  
4. **Padding/margens:** conteúdo colado nas bordas no mobile  
5. **Inconsistência:** cada página tem seu próprio CSS responsivo; falta sistema unificado de containers  
6. **Landing / auth / dashboard:** três “sistemas” de layout diferentes  

### Princípios de layout (adotar no projeto)

```
┌─────────────────────────────────────────────────────────┐
│  App shell (sidebar + header fixos, main rolável)      │
├──────────┬──────────────────────────────────────────────┤
│ Sidebar  │  Page container (max-width + padding fluido)   │
│ (drawer  │  ┌────────────────────────────────────────┐  │
│  mobile) │  │ Section grid (CSS Grid, não só stack)  │  │
│          │  │  [ hero / overview ]  [ meta / chips ] │  │
│          │  │  [ KPI ] [ KPI ] [ KPI ]  (2 col mobile)│  │
│          │  └────────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────────┘
```

**Tokens de container (proposta)**

| Token | Desktop | Tablet | Mobile |
|-------|---------|--------|--------|
| `--page-max` | 1280px | 100% | 100% |
| `--page-pad-x` | 1.5rem | 1.25rem | 1rem |
| `--section-gap` | 1.25rem | 1rem | 0.85rem |
| `--card-pad` | 1.35rem | 1.15rem | 1rem |

**Breakpoints padrão (unificar)**

- `sm`: 480px  
- `md`: 768px  
- `lg`: 1024px  
- `xl`: 1280px  

Evitar dezenas de breakpoints ad hoc (`720px`, `760px`, `1100px`…) — migrar gradualmente para os quatro acima.

### D1. Shell do dashboard (primeiro)

**Arquivos:** `DashboardLayout.tsx`, `cycle-selector.css`, `layout-system.css`, `theme-refined.css`

- [x] Header mobile: duas linhas — linha 1: menu + título; linha 2: seletor de ciclo
- [x] Cycle selector: badge “Diagnóstico” em linha separada no mobile; menu bottom sheet
- [x] `min-width: 0` e layout flex no header
- [ ] Sidebar drawer: overlay com foco trap; fechar ao navegar (parcial — fecha ao navegar)

### D2. Hub / MID (`/dashboard/inicio`)

**Arquivos:** `src/components/mid/MidDashboard.tsx`, `src/styles/mid-dashboard.css`

- [x] KPI grid mobile: **2 colunas** desde 320px (iPhone 375px incluído)
- [x] Rhythm section: 2 colunas a partir de `md` (768px)
- [x] Overview: 2 colunas até `md`, 1 coluna só abaixo de 768px
- [x] Tokens de padding/gap via `layout-system.css`
- [ ] Skeleton/loading com mesma grid do conteúdo (evitar layout shift)

### D3. Páginas de onda (diagnóstico, design, difusão)

**Arquivos:** `action-canvas.css`, `design-plans.css`, `solution-pick.css`, `organizational-scans.css`, `gate-zero-design.css`

- [ ] Auditar cada página: lista de breakpoints → mapa para `sm/md/lg`
- [x] Formulários longos (scans): sticky footer de ações no mobile (`mm-sticky-actions`)
- [ ] Tabelas/listas: scroll horizontal só quando inevitável

### D4. Landing e auth

**Arquivos:** `plans-landing.css`, `auth-refined.css`, `project-select.css`

- [x] Landing: grid de planos 1 → 2 → 3 colunas (480 / 1024px)
- [x] Auth: card fluido `min(34rem, 100% - 2rem)`
- [x] Escolher projeto: scroll natural (sessão anterior)

### D5. Sistema de design (fase 2)

- [x] Extrair utilities em `src/styles/layout-system.css` (tokens, header, sticky actions)
- [ ] Documentar em `design-system/MASTER.md`  
- [ ] Componente `<PageContainer>` / `<SectionGrid>` opcional no React  

### Critérios de aceite — responsivo

- [ ] iPhone SE (375px) e iPhone 14 Pro (393px): sem texto truncado crítico no header  
- [ ] iPad (768px): dashboard com pelo menos 2 colunas de KPI onde fizer sentido  
- [ ] Desktop 1440px: conteúdo centralizado, max-width respeitado, sem faixas vazias estranhas  
- [ ] Zoom 100% e 125%: listas e CTAs visíveis sem scroll “escondido”  
- [ ] `prefers-reduced-motion`: animações desligadas (já parcialmente feito)  

### Ordem sugerida de implementação (UI)

1. Header + cycle selector (impacto em todas as rotas)  
2. MID dashboard grid  
3. Escolher projeto / auth (já em progresso)  
4. Scans + diagnóstico  
5. Design + Difusão + Consultoria  
6. Landing  

---

## Matriz de prioridade

| Prioridade | Track | Esforço | Impacto |
|------------|-------|---------|---------|
| P0 | A1–A3 Deploy + rules | Baixo | Alto |
| P0 | D1 Header mobile | Médio | Alto |
| P1 | D2 MID grid | Médio | Alto |
| P1 | A4 Stripe | Depende cliente | Alto (receita) |
| P1 | C1 Testes E2E mínimos | Médio | Médio |
| P2 | B1 Perfil colaborador real | Alto | Médio |
| P2 | D3–D5 Demais páginas + design system | Alto | Alto |
| P3 | B3 RAG, B4 WhatsApp | Alto | Médio |

---

## Definição de pronto (por entrega)

1. Código mergeado em `main`  
2. Deploy front + API  
3. Smoke test manual documentado (pass/fail)  
4. Sem regressão visível em desktop **e** mobile (screenshot ou device lab)  
5. `npm run build` verde  

---

## Referências cruzadas

| Documento | Conteúdo |
|-----------|----------|
| `CHECKLIST.md` | Histórico de entregas por sessão |
| `DEPLOY.md` | Netlify + Render passo a passo |
| `docs/STRIPE-PLANOS.md` | Stripe e planos |
| `docs/FIRESTORE-RULES.md` | Regras (atualizar após deploy) |
| `docs/FLUXO-PROJETO.md` | Jornada do usuário |
| `design-system/MASTER.md` | Tokens de marca |

---

## Log de execução

| Data | Item | Responsável | Notas |
|------|------|-------------|-------|
| 06/07/2026 | Doc criado | — | Base para tracks A–D |
| 06/07/2026 | Track D (D1–D2, D4 parcial) | — | layout-system, header 2 linhas, KPI 2 cols, landing/auth |

---

*Atualizar este arquivo ao concluir cada item ou ao mudar prioridades.*
