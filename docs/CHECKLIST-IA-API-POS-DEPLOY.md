# Checklist — IA + API (pós-correções)

Use após merge/deploy para validar **Consultoria IA**, **Gate Zero** e **OpenRouter**.

**Referências:** `DEPLOY.md` · `docs/FIRESTORE-RULES.md` · `server/.env.example`

---

## 1. Repositório e build (local)

- [ ] `git pull` na branch que o Render/Netlify usam (`main` ou a configurada).
- [ ] Na raiz: `npm run build` (frontend + `postbuild` da API).
- [ ] Opcional: `cd server && npm run build && npm start` e testar `GET http://localhost:3001/api/health`.

---

## 2. API no Render

- [ ] **Root Directory** = `server`.
- [ ] **Build:** `npm install --include=dev && npm run build`.
- [ ] **Start:** `npm start`.
- [ ] Variável **`OPENROUTER_API_KEY`** definida (mesmo valor pode ser diferente do `server/.env` local — cada ambiente tem o seu).
- [ ] Firebase Admin: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (ver `DEPLOY.md`).
- [ ] **`CORS_ORIGIN`** inclui a URL do Netlify em uso (e `http://localhost:5173` se testar local).
- [ ] **Manual Deploy** concluído sem erro nos logs.

### Rotas críticas (produção)

Substitua `BASE` pela URL do serviço (ex.: `https://three95-flavio.onrender.com`).

| Verificação | Esperado |
|---------------|----------|
| `GET BASE/api/health` | JSON `status: ok` |
| `GET BASE/api/ai/models` | Lista de modelos |
| `POST BASE/api/ai/blueprint-gate` com body `{"diagnosticContext":"teste processo sistema"}` | **200** + JSON com `parsed.recommendedPath` — **não** 404 |

Se `blueprint-gate` retornar **404**, o deploy ainda está com código antigo ou Root Directory errado.

---

## 3. Frontend (Netlify ou local)

- [ ] `VITE_API_BASE_URL` aponta para a **mesma** API validada acima.
- [ ] Deploy do site (ou `npm run dev` com proxy para API local).
- [ ] Login Firebase ok no domínio do site.

### Consultoria IA + Gate Zero

- [ ] Diagnóstico Onda 1 concluído → painel **Gate Zero** visível.
- [ ] **Sugerir caminho com IA:** sem 404 → resposta com texto da OpenRouter (não só heurística local).
- [ ] Se aparecer aviso de **sugestão local / 404**: corrigir deploy da API (passo 2) e testar de novo.
- [ ] **Confirmar** caminho A ou B: sem `permission-denied` no Firestore (regras `blueprintGate` publicadas).
- [ ] Enviar mensagem no chat: resposta coerente; aviso amarelo de **modo demonstração** só se a API estiver **sem** `OPENROUTER_API_KEY`.
- [ ] Layout: scroll do `main`, Gate Zero e campo de mensagem acessíveis (sem precisar zoom).

---

## 4. Segurança

- [ ] Nenhum commit de `.env`, `server/.env`, `scripts/render.env` ou JSON de service account.
- [ ] Chaves OpenRouter só em **Render** / **.env local ignorado pelo git**.

---

## 5. GitHub

- [ ] `git status` limpo após push.
- [ ] Render (e Netlify, se aplicável) **redeploy** após o push para pegar o último `main`.

---

*Última revisão do checklist: alinhado ao Gate Zero (`POST /api/ai/blueprint-gate`), fallback local em 404, flag `demoMode` no chat e documentação em `DEPLOY.md`.*
