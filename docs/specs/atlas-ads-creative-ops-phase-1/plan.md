# Plan: Atlas Ads Creative Ops - Fase 1

## 1. Resumo técnico

Esta fase adiciona uma nova camada operacional à área de mídia, dedicada à decisão por `ad` e `creative`.

O plano é manter a mesma filosofia do Atlas:

- cálculo e classificação no backend
- narrativa e priorização no frontend
- IA apenas como narradora e copiloto

## 2. Arquivos e módulos impactados

### Backend e domínio

- `lib/brandops/types.ts`
- `lib/brandops/metrics.ts`
- `lib/brandops/database.ts`
- `lib/integrations/meta.ts`
- novos módulos sugeridos:
  - `lib/brandops/ad-decision.ts`
  - `lib/brandops/ad-decision-types.ts`

### Frontend

- `app/(app)/media/page.tsx`
- `app/(app)/media/MediaWorkspace.tsx`
- possível nova rota:
  - `app/(app)/media/ads/page.tsx`
- componentes novos sugeridos:
  - `components/media/AdsDecisionWorkspace.tsx`
  - `components/media/AdsPriorityRail.tsx`
  - `components/media/AdDecisionTable.tsx`

### Atlas IA

- `components/AtlasControlTowerHome.tsx`
- `components/AtlasAnalystPanel.tsx`

### Documentação

- `docs/ATLAS_PRD_VIVO.md`
- `docs/specs/atlas-ads-creative-ops-phase-1/*`

## 3. Estratégia de implementação

1. modelar tipos e estrutura de decisão por anúncio
2. consolidar dados Meta no nível `ad` e `creative`
3. criar motor determinístico com reason codes
4. expor relatório operacional de ads no backend
5. construir a nova superfície em `Mídia`
6. conectar uma síntese curta do Atlas IA às saídas estruturadas

## 4. Decisões de arquitetura

- não misturar esta fase com automação social ou criação de conteúdo
- não depender de IA para classificar anúncio
- manter `campaign` como contexto, mas `ad` como unidade principal de decisão
- ligar `creative` quando o dado existir; quando não existir, degradar com clareza
- preservar a home de mídia e adicionar a nova camada como trilha dedicada

## 5. Riscos técnicos

- inconsistência de disponibilidade de campos na `Meta API`
- anúncios sem mapeamento confiável para criativo
- dificuldade de cruzar anúncio com produto/estampa na primeira fase
- risco de criar uma tela redundante se a priorização não for forte o bastante

## 6. Estratégia de validação

- `type-check`
- `lint`
- `build`
- validação de runtime em:
  - `/media`
  - `/media/ads` se a nova rota existir
- revisão manual da hierarquia visual
- revisão da coerência entre:
  - melhor anúncio para escalar
  - principal criativo a revisar
  - principal alvo de pausa
