# Plan: Polimento Visual Sistêmico do Atlas

## 1. Resumo técnico

Esta frente deve fechar o acabamento perceptivo do Atlas usando a base já criada, sem abrir um novo design system paralelo.

O foco está em:

- contraste e leitura
- composição de cards
- wrapping e largura útil de texto
- relação entre bloco principal e bloco auxiliar
- sidebar colapsável, se fizer sentido prático

## 2. Arquivos e módulos impactados

- `app/globals.css`
- `components/ui-shell.tsx`
- `components/analytics/AnalyticsPrimitives.tsx`
- `components/AppShell.tsx`
- `components/AtlasControlTowerHome.tsx`
- `components/AtlasAnalystPanel.tsx`
- telas principais em `app/(app)/`

## 3. Estratégia de implementação

### Etapa 1: White mode foundation

- reforçar leitura de superfícies
- calibrar borda, sombra e contraste
- melhorar visibilidade de cards e painéis

### Etapa 2: Composição e leitura

- revisar largura útil dos blocos
- corrigir wrapping excessivo
- ajustar distribuição entre coluna principal e lateral

### Etapa 3: Shell e navegação

- revisar header, sidebar e ritmo entre áreas
- prototipar retorno da sidebar colapsável
- validar se o colapso melhora ou piora o uso

### Etapa 4: Fechamento

- aplicar o ajuste às telas prioritárias
- validar white e dark mode
- consolidar o resultado no design system

## 4. Decisões de arquitetura

- não criar novos padrões visuais fora das primitives existentes
- priorizar ajustes em CSS global e componentes compartilhados
- qualquer exceção local deve ser justificada por necessidade real da tela
- a sidebar só volta a colapsar se mantiver clareza de domínio e submenu

## 5. Riscos técnicos

- excesso de sombra ou contraste
- regressão de legibilidade em dark mode
- quebra de layout ao ajustar grids e wraps
- colapso da sidebar gerar perda de orientação

## 6. Estratégia de validação

- `npm run type-check`
- `npm run lint`
- validação manual das rotas principais
- validação de white mode nas telas críticas
- checagem de navegação com sidebar expandida e eventual modo colapsado
