# MM Blueprint — Onda 2 · Design (Magnus Waves)

> Alinhado ao board Miro: **2 — MM Blueprint** → **Caminho A** ou **Caminho B** → **MM Blueprint — final result** → **3 — Make the Move**

---

## Decisão recomendada: Gate Zero (IA + usuário)

**Não deixar só a IA nem só o usuário.**

| Papel | Responsabilidade |
|-------|------------------|
| **IA** | Lê o diagnóstico 1.1–1.5, classifica sinais, **recomenda** Caminho A ou B com justificativa curta |
| **Usuário** | **Confirma ou corrige** a decisão (override explícito) antes de abrir Outcome Forge |

Regra Magnus: *treinamento nunca é ponto de partida — é consequência diagnóstica.* A IA propõe; o líder valida.

---

## 2.0 — Gate Zero (decisão-mestre)

### Caminho A — Treinamento se aplica

Quando o diagnóstico indicou predominantemente:

- Gap de habilidade
- Gap de comportamento treinável
- Gap de liderança prática
- Gap de transferência para o trabalho
- Sistema minimamente funcional

### Caminho B — Treinamento NÃO se aplica

Quando o diagnóstico indicou predominantemente:

- Gap estrutural
- Falha de processo
- Falta de clareza
- Decisão mal definida
- Excesso de fricção sistêmica
- Problema de contexto ou governança

### Saída do Gate

- `path`: `A` | `B`
- `recommendedBy`: `ai` | `user`
- `rationale`: texto curto
- `confirmedAt`: timestamp

---

## Caminho A — MM Blueprint (treinamento)

Fluxo sequencial obrigatório (Miro):

```
2.1 Outcome Forge → 2.2 Build → 2.3 Impact Evaluation → MM Blueprint final result
```

### 2.1 — Outcome Forge (ATD Module 3)

**Mapa mental cognitivo (IA):**

```
INPUT CLIENTE (necessidade)
  ↓
Necessidade organizacional (classificação)
  ↓
Performance Skill Gap (capacidade ausente — nunca solução)
  ↓
Outcome Statement [verbo + adjetivo + substantivo] — resultado observável
  ↓
Gate: há aprendizagem necessária?
  ↓ SIM
Learning Objectives (Bloom — nível mínimo necessário, sem inflação)
```

**Regras:**

- Learning Objectives **só depois** do Outcome Statement
- Outcome ≠ Objective (não misturar)
- Evitar verbos vagos: "entender", "aprender", "conhecer"
- Formato LO: *Ao final, o participante será capaz de: [verbo Bloom] + [objeto] + [contexto]*

**Validação do Outcome (IA):** observável? resultado (não atividade)? acontece no trabalho?

### 2.2 — Build (ATD Modules 4–6, estrutura tipo Excel)

Pré-requisito: Outcome Forge validado.

| Seção | Conteúdo |
|-------|----------|
| 1 | Identidade do programa (nome, público, obrigatoriedade, compliance) |
| 2 | Âncora no Outcome |
| 3 | Learning Objectives × Bloom × KSA |
| 4 | Métodos instrucionais (Table 5.1) |
| 5 | Mídia e formato (presencial, virtual, e-learning, blended…) |
| 6 | Aplicação no trabalho (transferência, job aids, papel do gestor) |
| 7 | Preview Impact Evaluation |

**Curadoria (cliente):** Universidades corporativas, academias, trilhas existentes, conteúdos regulatórios, especialistas internos. **A IA orquestra; não substitui curadoria.**

**Saída IA (prompt Build):** desenho do programa, roadmap, sequência de módulos, pontos de avaliação, indicações de onde buscar conteúdo (sem criar conteúdo novo).

### 2.3 — Impact Evaluation (4 camadas)

| Camada | O quê | Quando |
|--------|-------|--------|
| 1 | Percepção da experiência | Final do programa |
| 2 | Percepção de aprendizagem | Final / módulo |
| 3 | Aplicação no trabalho | 30–90 dias |
| 4 | Impacto organizacional | Design agora; medição ao longo do tempo |

**Saída IA:** mapa de medição, riscos, decisão (escalar / ajustar / reforçar Sprint 90+ / redesenhar).

**Envio aos participantes + dashboard:** definir na implementação (links de survey, Firestore, agregação no MID).

---

## Caminho B — MM Blueprint (não-treinamento)

Fluxo paralelo no Miro (sem 2.1–2.3 de treinamento):

### 2.1B — Outcome Forge sistêmico

- Pergunta-guia: *Se o sistema funcionasse bem, o que aconteceria de forma consistente?*
- Formato: `[PROCESSO/DECISÃO/FLUXO] opera de forma [PADRÃO], gerando [RESULTADO OBSERVÁVEL]`
- Sem "pessoas aprendendo" — sistemas funcionando

### 2.2B — Build sistêmico

Tipos: redesign de processo, governança, papéis, ferramentas/IA, playbooks, rituais.  
Roadmap: Simplificação → Estruturação → Sustentação.  
Treinamento só como apoio pontual, nunca eixo.

### 2.3B — Impact Evaluation sistêmico

Métricas: tempo de ciclo, retrabalho, variabilidade, conflitos de decisão, dependência de heróis, KPIs operacionais existentes.

---

## Convergência → Difusão

Ambos os caminhos geram **MM Blueprint — final result** antes de:

**3 — Make the Move** (Onda 3 · Difusão)

Ordem frequente na prática: *Sistema primeiro → Pessoas depois* (B estabiliza, depois A ou Sprint 90+).

---

## Integração no produto (395-flavio)

| Artefato | Uso |
|----------|-----|
| `src/constants/blueprintFlow.ts` | Gate, caminhos, etapas, prompts-base, `buildGateContextAppendix` |
| `src/pages/ConsultoriaIAPage.tsx` | **Gate Zero (UI)** + chat Design + injeção de contexto após confirmação |
| `src/components/GateZeroPanel.tsx` | Painel 2.0: sugestão IA, escolha A/B, Firestore `blueprintGate` |
| `src/services/blueprintGate.ts` | Leitura/gravação Firestore `blueprintGate/{uid}` |
| `server/src/services/blueprintGate.ts` | `POST /api/ai/blueprint-gate` (sem persistir conversa) |
| `src/pages/BlueprintConfigPage.tsx` | Skills/prompts editáveis (Outcome Forge, Build, Impact…) |
| Firestore | `blueprintGate/{userId}` — ver `DEPLOY.md` |
| `docs/FLUXO-PROJETO.md` | Mapa geral das 4 ondas |

---

## Frase-âncora Magnus

> Quando o problema é humano, desenvolvemos pessoas.  
> Quando o problema é estrutural, redesenhamos o sistema.  
> Quando os dois se encontram, orquestramos.

---

*Atualizado com especificação Flávio — maio/2026*
