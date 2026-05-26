# Estimativa em relação ao escopo do projeto

*(Versão "MVP" e versão "Robusta" com base no escopo gerado a partir das referências do projeto Magnus Mind - People Sprint / MM People Sprint 90+)*

---

## 1. Visão Geral

Com base na estrutura já existente da plataforma Magnus Mind — frontend React (Vite), backend Express no Render, autenticação Firebase, jornada Magnus Waves em quatro ondas e integração Open Router com RAG — esta etapa contempla a consolidação do produto People Sprint em ambiente de produção (Netlify + Render), refinamento das ondas do fluxo Miro e homologação ponta a ponta até a jornada completa operar com estabilidade aceitável para usuários reais.

A estimativa considera o código atual no repositório `395-flavio`, incluindo normalização da API Render (`apiNormalize`), Magnus Waves Progress, Human-to-Business Canvas, Consultoria IA, Objetivos, Equipe, Relatórios e Histórico, sem reimplementar do zero a autenticação Firebase nem o motor de chat.

---

## 2 — Deploy Netlify, Render e Firebase em Produção

🔹 **Explicação inicial:**  
Publicar o painel web em HTTPS no Netlify e garantir que o frontend aponte corretamente para a API no Render, com variáveis de ambiente, CORS e health check validados.

🔹 **Detalhamento técnico:**
- Configuração de `VITE_API_BASE_URL` e `VITE_FIREBASE_*` no Netlify
- Web Service Render com Root Directory `server` e `/api/health` em JSON
- `FIREBASE_PRIVATE_KEY` e credenciais Admin no Render (formato uma linha)
- `CORS_ORIGIN` incluindo domínio Netlify e localhost
- Authorized domains no Firebase Console
- Timeouts 90s/120s para cold start do Render Free
- Rebuild e smoke-test do export web (`dist`)

☑ **MVP:** 2 dias  
✅ **Robusta:** 3 dias

---

## 3 — Onda 1 — Diagnóstico / Human-to-Business Canvas

🔹 **Explicação inicial:**  
Consolidar o canvas de diagnóstico (etapas 1.1 a 1.5) com persistência Firestore, gate para ondas seguintes e alinhamento visual ao board Miro.

🔹 **Detalhamento técnico:**
- Formulário inicial com badges Decoding, Gap Scan, System Scan, Team Scan, Solution Pick
- Persistência em `initialForms` e leitura no dashboard
- Mapa de estágios do negócio e descrições por fase
- Banner/gate quando diagnóstico incompleto
- Validação de campos obrigatórios e estados vazios
- Copy e UX alinhados ao manifesto People Sprint

☑ **MVP:** 3 dias  
✅ **Robusta:** 4 dias

---

## 4 — Onda 2 — Design / MM Blueprint e Consultoria IA

🔹 **Explicação inicial:**  
Garantir que o chat de consultoria estratégica funcione em produção com histórico, modelos, RAG e sugestões de objetivos integradas ao fluxo Blueprint.

🔹 **Detalhamento técnico:**
- Chat Open Router + RAG + busca web opcional (Serper/Tavily)
- Normalização de respostas Render (`conversation`, `messages`, `reply`)
- Histórico de conversas e seleção de modelos
- `BlueprintConfigPage` e fluxo Outcome Forge / Build / Impact Evaluation
- Sugestões de objetivos a partir do contexto do chat
- Tratamento de erros, retry e layout responsivo (drawer histórico)

☑ **MVP:** 3 dias  
✅ **Robusta:** 4 dias

---

## 5 — Onda 3 — Difusão / Objetivos, Equipe e Follow-up

🔹 **Explicação inicial:**  
Operacionalizar Make the Move com CRUD de objetivos, gestão de equipe e acompanhamento de prazos e responsáveis.

🔹 **Detalhamento técnico:**
- Objetivos estratégicos: CRUD, filtros, prioridades, export CSV
- Integração sugestões IA e ações rápidas no dashboard
- Minha equipe: membros, performance, habilidades
- Histórico de atividades com datas relativas
- Recomendações dinâmicas no hub (objetivos em aberto)
- Navegação numerada por onda no menu lateral

☑ **MVP:** 3 dias  
✅ **Robusta:** 4 dias

---

## 6 — Onda 4 — Domínio / MID, Relatórios e Loop Contínuo

🔹 **Explicação inicial:**  
Entregar o Magnus Intelligence Dashboard com relatórios consolidados, estatísticas Kirkpatrick 4 e retorno ao diagnóstico quando necessário.

🔹 **Detalhamento técnico:**
- Geração e visualização de relatórios via API
- Normalização conteúdo, resumo e stats (`apiNormalize`)
- Cards de estatísticas no dashboard (objetivos, equipe, relatórios)
- Mensagem de loop contínuo (retomar passo 1 / subir de nível)
- Atividade recente e integração com Firebase Analytics
- Estados de carregamento e vazios em todas as telas MID

☑ **MVP:** 2 dias  
✅ **Robusta:** 3 dias

---

## 7 — Homologação Ponta a Ponta e Entrega

🔹 **Explicação inicial:**  
Executar validação final do sistema em produção com perfis reais e publicação definitiva da stack operacional.

🔹 **Detalhamento técnico:**
- Testes E2E de login Firebase e jornada completa (4 ondas)
- Validação conta demo e fluxo Formulário → IA → Objetivos → Relatórios
- Correções de regressão no frontend web
- Checklist de aceite (`CHECKLIST.md`) com instalação piloto
- Redeploy Netlify e restart/manual deploy Render
- Suporte pós-go-live na versão robusta

☑ **MVP:** 1 dia  
✅ **Robusta:** 2 dias

---

## 📌 Estimativas Gerais

### Estimativa MVP — **14 dias**

Contempla:
- Deploy Netlify + Render + Firebase operacional
- Onda 1 — Human-to-Business Canvas completo com gate
- Onda 2 — Consultoria IA e MM Blueprint em produção
- Onda 3 — Objetivos, equipe e follow-up integrados ao hub
- Onda 4 — Relatórios MID e loop contínuo
- Homologação E2E e redeploy final

| Etapa | MVP |
|-------|-----|
| 2. Deploy | 2 |
| 3. Onda 1 | 3 |
| 4. Onda 2 | 3 |
| 5. Onda 3 | 3 |
| 6. Onda 4 | 2 |
| 7. Homologação | 1 |
| **Total** | **14** |

### Estimativa Robusta — **20 dias**

Contempla:
- Todos os fluxos do MVP refinados
- Tratamento ampliado de falhas de API, cold start Render e chat IA
- Blueprint Config e prompts RAG revisados para produção
- Responsividade e acessibilidade revisadas em todas as ondas
- Checklist de aceite ampliado (Miro + manifesto)
- Ajustes pós-homologação e documentação operacional (`DEPLOY.md`)
- Estabilização operacional da primeira semana em produção

| Etapa | Robusta |
|-------|---------|
| 2. Deploy | 3 |
| 3. Onda 1 | 4 |
| 4. Onda 2 | 4 |
| 5. Onda 3 | 4 |
| 6. Onda 4 | 3 |
| 7. Homologação | 2 |
| **Total** | **20** |

---

## Disclaimer

Todos os passos são, claro, estimados, neste planejamento, mas pensando com margens para resolução de potenciais bugs, dificuldades que podem surgir em cada etapa de desenvolvimento, pelo fato do desenvolvimento de software em si já ser um serviço complexo.

Claro, apenas sugestões, pois a decisão sempre será de vocês e seguiremos buscando agregar o máximo possível dentro dela.

Agradecemos a gentileza, e estamos à disposição.

---

*PDF: `docs/Estimativa_395-MagnusMind.pdf` · Gerar novamente: `python scripts/gerar_estimativa_pdf.py`*
