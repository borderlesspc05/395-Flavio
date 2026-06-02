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

*Última atualização: 19 de maio de 2026 — checklist do dia revisado após alinhamento Miro*
