# Atlas Design System V2

## Objetivo
Criar uma linguagem única para o Atlas, com base estrutural inspirada no Carbon, mas adaptada para um console operacional de leitura analítica, decisão e execução.

## Princípios
- O dado manda na composição.
- Gráfico largo vence card narrativo.
- Contexto deve ser inline, não empilhado.
- Ação tem cor, informação tem neutralidade.
- Dark mode precisa reduzir ruído, não adicionar efeito.
- Navegação, CTA, card, tabela e filtro devem falar o mesmo idioma em todo o sistema.

## Hierarquia canônica
1. Shell global
2. Header da tela
3. Barra local de modos, filtros e ações
4. Blocos dominantes de leitura
5. Tabelas, listas e drill-down

## Contratos de layout

### Header da tela
- `eyebrow`, `title`, `description` e contexto devem caber na mesma faixa em desktop.
- `description` deve ser curta e utilitária.
- `loja`, `período`, `fonte` e outros metadados operacionais devem aparecer como contexto inline.
- Não usar subtítulo empilhado se a informação puder viver na mesma linha.

### KPIs
- KPI é compacto e comparável.
- KPI não deve competir com gráfico.
- Altura alvo: bloco curto, sem copy longa.
- KPI serve para leitura rápida, não explicação editorial.

### Gráficos
- Gráfico de linha, barra e série temporal deve ocupar a largura dominante da seção.
- Nunca deixar gráfico principal espremido por cards narrativos laterais.
- O texto ao redor deve se adaptar ao gráfico.

### Callouts
- Callout existe para decisão ou alerta.
- Deve ser mais leve que card hero.
- No máximo um callout dominante por faixa.

### Tabelas e listas
- Tabela é superfície primária.
- Lista operacional deve parecer lista, não card grid.
- Ação dentro de tabela ou lista deve ser inline e óbvia.

## Contratos visuais

### Superfícies
- Uma superfície base neutra
- Uma superfície secundária discreta
- Uma superfície de destaque só para sinal real
- Evitar gradiente e glow em componentes operacionais comuns

### Borda e raio
- Raio baixo
- Borda leve e consistente
- Sem outlines pesados e sem cápsulas excessivas

### Espaçamento
- Dar mais respiro entre blocos grandes
- Compactar elementos internos de contexto e navegação
- Separar melhor leitura principal de leitura auxiliar

### Cor
- Azul técnico para ação, foco, seleção e CTA
- Vermelho de marca só na camada Atlas/IA e alertas específicos
- Informação neutra não deve parecer CTA

## Componentes canônicos
- `PageHeader`
- `WorkspaceTabs`
- `AnalyticsPanel`
- `AnalyticsKpiCard`
- `AnalyticsCalloutCard`
- `StackItem`
- `SurfaceCard`
- `IntegrationWorkspaceHeader`
- `IntegrationRail`

## Proibições
- Não criar novo card sem mapear para primitive existente
- Não usar pill para contexto neutro
- Não usar badge decorativa como substituto de hierarquia
- Não repetir soluções locais de tabs e toolbar
- Não usar texto longo em coluna estreita

## Lotes prioritários
1. Shell e headers
2. KPI, callout, lista e tabela
3. Mídia, Tráfego, Produtos e DRE
4. Integrações, Admin e módulos operacionais
5. Estados vazios, loading, toasts e modais

## Critério de aceite
- O usuário entende onde está, o que está vendo e qual é o próximo clique em poucos segundos.
- Cards não brigam com gráficos.
- Dark mode fica mais claro em hierarquia do que a versão atual.
- Qualquer tela nova pode ser montada com o mesmo conjunto de primitives.
