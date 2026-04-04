# Atlas - Contrato de Design System

## Premissa

O design system do `Atlas` existe para reduzir ruído visual, aumentar velocidade de leitura e garantir aderência entre telas analíticas, operacionais e administrativas.

Regra principal:

- os dados chamam atenção
- os componentes sustentam a leitura
- o sistema nunca deve parecer um conjunto de telas independentes

## Fonte de verdade

Ordem oficial de decisão visual:

1. tokens semânticos em [C:\Users\edebu\.codex\worktrees\def7\BrandOps-new\app\globals.css](C:\Users\edebu\.codex\worktrees\def7\BrandOps-new\app\globals.css)
2. primitivas reutilizáveis em:
   - [C:\Users\edebu\.codex\worktrees\def7\BrandOps-new\components\MetricCard.tsx](C:\Users\edebu\.codex\worktrees\def7\BrandOps-new\components\MetricCard.tsx)
   - [C:\Users\edebu\.codex\worktrees\def7\BrandOps-new\components\ui-shell.tsx](C:\Users\edebu\.codex\worktrees\def7\BrandOps-new\components\ui-shell.tsx)
   - [C:\Users\edebu\.codex\worktrees\def7\BrandOps-new\components\AppShell.tsx](C:\Users\edebu\.codex\worktrees\def7\BrandOps-new\components\AppShell.tsx)
3. páginas e módulos

Nenhuma tela deve inventar estilos fora dessa ordem sem justificativa forte.

## Tokens obrigatórios

Todos os componentes devem nascer de tokens semânticos, não de hex solto.

Categorias mínimas:

- superfícies
  - `surface`
  - `surface-container`
  - `surface-container-low`
  - `surface-container-high`
- bordas
  - `atlas-border-soft`
  - `atlas-border-muted`
- texto
  - `on-surface`
  - `on-surface-variant`
  - `ink-muted`
- semântica
  - positivo
  - negativo
  - alerta
  - info

## Regras de composição

### Cards

- o card não pode chamar mais atenção que o dado
- borda sempre suave
- sombra curta e leve
- sem brilho agressivo
- sem contorno preto no light
- sem contorno branco no dark

### KPIs

- KPI não deve depender de borda forte para parecer importante
- destaque vem de:
  - valor
  - semântica de cor
  - ícone discreto
  - microacento superior
- cards de KPI devem compartilhar a mesma estrutura de:
  - label
  - valor
  - ajuda
  - ação opcional

### Tabelas

- tabela é estrutura primária do SaaS
- listas densas não devem virar parede de cards
- quando houver muitas colunas:
  - usar aba
  - usar subtabs
  - usar painel lateral
  - antes de recorrer a rolagem excessiva
- zebra, hover e cabeçalho precisam ser discretos

### Toolbars e busca

- toda toolbar deve parecer da mesma família
- campos de busca, selects e filtros precisam ter:
  - mesma altura
  - mesmo raio
  - mesmo contraste
  - mesma espessura de borda

### CTAs e botões

- botões não podem variar de escala sem motivo
- usar só quatro classes mentais:
  - primário
  - secundário
  - ghost
  - destrutivo

### Tabs

- tabs e subtabs existem para reduzir rolagem
- não devem virar enfeite
- toda tab precisa responder:
  - qual modo estou vendo
  - o que muda ao trocar

## Regras por tipo de tela

### Analítica

Toda tela analítica deve ter:

- leitura executiva
- detalhe estruturado
- área de apoio para navegação

Evitar:

- empilhar cards grandes sem síntese
- transformar tabela densa em pilha de cartões verticais

### Operacional

Toda tela operacional deve ter:

- ação principal clara
- filtros consistentes
- feedback de processamento
- histórico ou livro operacional rastreável

### Admin

Admin pode ter semântica própria, mas nunca outro design system.

## Regras de copy

O Atlas não explica a própria interface para o usuário.

Evitar frases como:

- "sem alongar a tela"
- "resumo curto"
- "parede de texto"
- "meta interface"

O sistema deve falar de:

- operação
- impacto
- risco
- próxima ação

## Regras de scroll

- sidebar fixa
- header fixo
- rolagem só no conteúdo
- abas devem ser usadas para evitar páginas excessivamente longas

## Checklist de aderência

Antes de considerar uma tela aderente ao design system:

1. usa tokens semânticos centrais
2. não tem borda agressiva
3. não usa CTA desproporcional
4. não mistura padrões de busca/select
5. não substitui tabela por cards sem necessidade
6. não depende de rolagem excessiva para leitura principal
7. light e dark estão coerentes

## Meta

O objetivo do `Atlas` não é parecer um dashboard bonito.

O objetivo é parecer um sistema operacional de decisão:

- calmo
- preciso
- técnico
- confiável
- escalável como SaaS
