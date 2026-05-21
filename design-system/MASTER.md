# Magnus Mind — Design System

**Direção:** consultoria estratégica premium · slate `#2F3A4C` · acento ouro `#AF9270` · realce `#FFBC7D`  
**Referência:** [magnusmind.io](https://magnusmind.io/) · fluxo em `docs/FLUXO-PROJETO.md`  
**Tom:** refinado, confiável, humano + IA com propósito

## Tipografia

| Uso | Fonte | Peso |
|-----|-------|------|
| Títulos (h1–h3) | Sora | 600–700 |
| Corpo / UI | Plus Jakarta Sans | 400–600 |

## Cores (tokens)

| Token | Valor | Uso |
|-------|-------|-----|
| `--mm-brand-primary` | `#2F3A4C` | Marca (site) |
| `--mm-brand-accent` | `#AF9270` | CTA / links |
| `--mm-brand-warm` | `#FFBC7D` | Realces |
| `--mm-brand-cream` | `#F5F3F2` | Fundo site (light) |
| `--primary-dark` | `#1a222d` | Fundo app (dark) |
| `--accent-blue` | `#AF9270` | Ações na plataforma |
| `--border-card` | rgba(175,146,112,.22) | Bordas |

## Espaçamento

Escala 4/8px: 4, 8, 12, 16, 24, 32, 48

## Componentes

- Cards: borda sutil, sombra interna, hover com glow azul
- Botões primários: gradiente azul, min-height 44px
- Inputs: fundo escuro, foco com anel 2px
- Page headers: ícone + título + subtítulo alinhados

## Motion

- Entrada de cards: `fadeInUp` 0.4s, stagger 50ms
- Micro-interações: 150–250ms ease-out
- `prefers-reduced-motion`: desativa animações

## Responsivo

- Container queries em `.dashboard-home`
- Sidebar fixa ≥769px; drawer <768px
- Quick actions: 4 → 2 → 1 colunas

## Acessibilidade

- Contraste texto ≥4.5:1
- Focus visible em todos os interativos
- Skip link para conteúdo principal
- Labels visíveis em formulários
