# Plan: BrandOps Operational Console Reframe

## 1. Resumo técnico

A refatoração deve reorganizar o front-end em torno de floorplans operacionais, mantendo o backend e os contratos de dados o mais estáveis possível.

A estratégia não é "mudar a cor dos cards". É trocar a arquitetura visual do sistema:

- `BrandOps` como produto
- `Atlas` como agente de IA
- `Torre de Controle` como dashboard hub
- workspaces operacionais para as demais áreas

## 2. Arquivos e módulos impactados

### Shell e primitives

- `C:\BrandOps\BrandOps-new\components\AppShell.tsx`
- `C:\BrandOps\BrandOps-new\components\ui-shell.tsx`
- `C:\BrandOps\BrandOps-new\components\analytics\AnalyticsPrimitives.tsx`
- `C:\BrandOps\BrandOps-new\app\globals.css`
- `C:\BrandOps\BrandOps-new\lib\branding.ts`

### Controle

- `C:\BrandOps\BrandOps-new\app\(app)\dashboard\page.tsx`
- `C:\BrandOps\BrandOps-new\components\AtlasControlTowerHome.tsx`
- `C:\BrandOps\BrandOps-new\components\AtlasAnalystPanel.tsx`

### Financeiro

- `C:\BrandOps\BrandOps-new\app\(app)\dre\page.tsx`
- `C:\BrandOps\BrandOps-new\app\(app)\sales\page.tsx`
- `C:\BrandOps\BrandOps-new\app\(app)\cost-center\page.tsx`
- `C:\BrandOps\BrandOps-new\app\(app)\cmv\page.tsx`

### Aquisição

- `C:\BrandOps\BrandOps-new\app\(app)\media\MediaWorkspace.tsx`
- `C:\BrandOps\BrandOps-new\app\(app)\traffic\page.tsx`
- `C:\BrandOps\BrandOps-new\app\(app)\product-insights\ProductInsightsWorkspace.tsx`

### Operação e plataforma

- `C:\BrandOps\BrandOps-new\app\(app)\feed\page.tsx`
- `C:\BrandOps\BrandOps-new\app\(app)\import\page.tsx`
- `C:\BrandOps\BrandOps-new\app\(app)\sanitization\page.tsx`
- `C:\BrandOps\BrandOps-new\app\(app)\integrations\page.tsx`
- `C:\BrandOps\BrandOps-new\app\(app)\settings\page.tsx`
- `C:\BrandOps\BrandOps-new\app\(app)\admin\stores\page.tsx`

## 3. Estratégia de implementação

### Fase 1 — Identidade e shell

- renomear a aplicação para `BrandOps`
- posicionar `Atlas` como agente de IA
- revisar header global, sidebar, contexto de marca e recorte
- simplificar a linguagem de topo das telas

### Fase 2 — Biblioteca de floorplans

- criar primitives canônicas para:
  - `DashboardHubLayout`
  - `ListReportLayout`
  - `WorklistLayout`
  - `SplitWorkspaceLayout`
  - `ObjectWorkspaceLayout`
- evitar novas composições improvisadas por página

### Fase 3 — Torre de Controle

- consolidar a Torre como o dashboard principal do sistema
- manter KPIs, alertas e visão executiva aqui
- reduzir redundâncias de dashboard fora daqui

### Fase 4 — Domínio financeiro

- `DRE`: list report histórico
- `Livro de lançamentos`: worklist/list report
- `CMV`: list report + inspector
- `Receita e vendas`: resumo leve + vistas operacionais

### Fase 5 — Domínio de aquisição

- `Mídia`: home enxuta e telas específicas por entidade
- `Tráfego`: gráfico principal + tabela/lista, sem excesso de cards
- `Produtos`: ranking/lista + inspector lateral

### Fase 6 — Operação e plataforma

- `Catálogo`, `Importação`, `Saneamento`: worklists de verdade
- `Integrações` e `Settings`: object workspaces
- `Admin > Lojas`: gestão multi-marca com foco em seleção e edição

### Fase 7 — Integração do Atlas

- Atlas aparece como agente contextual
- entrada por drawer, side panel, command surface ou bloco contextual
- Atlas não deve definir a estrutura principal das telas

## 4. Decisões de arquitetura

- preservar APIs, datasets e regras de negócio
- mover complexidade visual para primitives compartilhadas
- usar `shadcn/ui` como base de primitives reaproveitáveis
- usar `Material 3` como referência de estrutura e interação, não como skin
- usar floorplans inspirados por `SAP Fiori` e `Cloudscape` para áreas operacionais
- remover KPIs e cards como default de página

## 5. Riscos técnicos

- espalhar estilos locais e perder consistência durante a migração
- manter páginas antigas com estruturas duplicadas, como aconteceu em alguns workspaces
- aumentar esforço de refatoração se os floorplans não forem centralizados
- trocar o nome do produto parcialmente e criar ambiguidade entre `BrandOps` e `Atlas`

## 6. Estratégia de validação

- `npm run type-check`
- `npm run lint`
- `npm run build`
- validação de runtime das rotas principais
- revisão manual da primeira dobra de cada domínio
- validação de descoberta: usuário novo precisa encontrar dashboard, DRE e operação sem hesitação
