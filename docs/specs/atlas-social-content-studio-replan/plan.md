# Plan: Atlas Social Content Studio Replan

## Estratégia

Recomeçar a funcionalidade do ponto de vista do fluxo, não do layout atual.

## Etapas

1. consolidar as fontes de verdade que vão alimentar o estúdio
2. modelar a seleção de `produto + anúncio + insight`
3. desenhar a nova arquitetura da tela
4. ligar destinos sociais e aprovação humana
5. só então reconstruir a interface

## Superfícies prováveis

- `app/(app)/creative-ops/page.tsx`
- `lib/brandops/creative-ops.ts`
- `lib/brandops/types.ts`
- `app/api/admin/brands/[brandId]/creative-ops/*`
- `app/(app)/media/MediaWorkspace.tsx`
- `app/(app)/feed/page.tsx`

## Riscos

- puxar catálogo e mídia sem uma união clara entre produto e anúncio
- criar editor social antes da seleção da base criativa
- tentar publicar sem resolver primeiro o contrato de integração

## Decisão operacional

Enquanto isso não for redesenhado, a funcionalidade fica fora do menu principal e fora dos atalhos de mídia.

