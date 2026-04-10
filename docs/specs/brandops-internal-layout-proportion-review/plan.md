# Plan Template

## 1. Resumo técnico

A implementação deve consolidar uma camada de tokens visuais orientada pela gramática da sidebar e propagar essa linguagem para superfícies, tabs, rails, metric strips e cards internos. Depois da fundação global, as rotas principais devem ser revisadas domínio por domínio para corrigir proporção, quebra de linha, largura de rail e uso de espaço.

## 2. Arquivos e módulos impactados

- `app/globals.css`
- `components/ui-shell.tsx`
- `components/AppShell.tsx` se algum token ou primitive precisar alinhar navegação e conteúdo
- páginas principais:
  - `app/(app)/dashboard/page.tsx`
  - `app/(app)/dre/page.tsx`
  - `app/(app)/sales/page.tsx`
  - `app/(app)/cost-center/page.tsx`
  - `app/(app)/cmv/page.tsx`
  - `app/(app)/media/MediaWorkspace.tsx`
  - `app/(app)/traffic/page.tsx`
  - `app/(app)/product-insights/ProductInsightsWorkspace.tsx`
  - `app/(app)/feed/page.tsx`
  - `app/(app)/import/page.tsx`
  - `app/(app)/sanitization/page.tsx`
  - `app/(app)/integrations/page.tsx`

## 3. Estratégia de implementação

1. definir tokens de proporção e superfície inspirados na sidebar
2. alinhar `tabs`, `subtabs`, `panels`, `cards`, `metric strips` e `inline metrics`
3. revisar `WorkspaceSplitLayout` e derivados para larguras mais reais
4. revisar páginas principais por domínio
5. validar `type-check`, `lint`, `build` e rotas críticas

## 4. Decisões de arquitetura

- a sidebar vira a referência de gramática visual do produto
- toda decisão de raio, borda, superfície e largura deve nascer em token
- a correção macro deve acontecer na base compartilhada antes dos ajustes por página
- as páginas devem usar o mínimo possível de CSS ad hoc

## 5. Riscos técnicos

- excesso de override local pode anular a camada global
- mudanças agressivas de largura podem quebrar tabelas ou gráficos em telas menores
- pode ser necessário revisar rotas uma a uma mesmo após a consolidação global

## 6. Estratégia de validação

- `npm run type-check`
- `npm run lint`
- `npm run build`
- validação manual por domínio em `white` e `dark`
- checagem visual das primeiras dobras nas rotas principais
