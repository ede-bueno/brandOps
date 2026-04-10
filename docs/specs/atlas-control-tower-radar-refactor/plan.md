# Plan: Refatoração do Radar da Torre do Atlas

## 1. Resumo técnico

A implementação deve reutilizar a estrutura já consolidada na `Mesa do Atlas`, sem criar uma linguagem paralela.

O foco é reorganizar composição e CTA, não reescrever a lógica de sinais.

## 2. Arquivos e módulos impactados

- `components/AtlasControlTowerHome.tsx`
- `app/globals.css`
- eventualmente `components/ui-shell.tsx` se faltar primitive adequada

## 3. Estratégia de implementação

1. revisar a composição atual do `Radar`
2. definir a hierarquia canônica:
   - sinal dominante
   - sinais relacionados
   - próximo movimento
3. reduzir redundâncias de contexto e chips
4. alinhar spacing, CTA e rail lateral ao padrão da `Mesa`

## 4. Decisões de arquitetura

- preservar a lógica existente de `signals`
- não mover regra de negócio para a view
- reaproveitar `StackItem`, `SurfaceCard` e primitives de shell

## 5. Riscos técnicos

- quebrar a alternância entre `Mesa` e `Radar`
- introduzir novo padrão visual fora do design system
- duplicar função entre rail lateral e bloco principal

## 6. Estratégia de validação

- `npm run type-check`
- `npm run lint`
- validar `/dashboard`
- revisar troca entre `Mesa` e `Radar`
- revisar cliques dos CTAs principais
