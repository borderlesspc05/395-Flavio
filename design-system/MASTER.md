# Magnus Mind — Design System

**Direção:** consultoria estratégica premium · dark navy · acentos azul elétrico + dourado discreto  
**Tom:** refinado, confiável, inteligente — não genérico “AI slop”

## Tipografia

| Uso | Fonte | Peso |
|-----|-------|------|
| Títulos (h1–h3) | Sora | 600–700 |
| Corpo / UI | Plus Jakarta Sans | 400–600 |

## Cores (tokens)

| Token | Valor | Uso |
|-------|-------|-----|
| `--primary-dark` | `#0a192f` | Fundo principal |
| `--accent-blue` | `#60a5fa` | Ações, links, ícones |
| `--accent-vivid` | `#3b82f6` | CTA primário |
| `--gold-logo` | `#b08d57` | Detalhe de marca |
| `--bg-card` | rgba(17,42,74,.65) | Cards |
| `--border-card` | rgba(96,165,250,.22) | Bordas |

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
