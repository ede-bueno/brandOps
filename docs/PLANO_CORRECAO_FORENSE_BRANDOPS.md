# Plano de Correcao Forense - BrandOps

## Objetivo

Alinhar o sistema existente ao objetivo real do produto:

- operacao multi-marca com `SUPER_ADMIN`
- usuarios exclusivos por marca com visao restrita
- importacao de dados reais da Inc e da Meta
- saneamento manual de anomalias da Meta
- CMV por tipo de peca com vigencia historica
- DRE e visoes gerenciais com calculo correto

Este documento consolida o que foi identificado no codigo, nos CSVs de `Exportações` e no banco real do Supabase.

## Diagnostico consolidado

### O que ja esta certo

- O app ja funciona como MVP operacional real.
- O fluxo de importacao Inc + Meta ja existe.
- O sistema ja tem `brands`, `user_profiles`, `brand_members`, `orders`, `order_items`, `media_performance`, `cmv_history`, `cmv_checkpoints`, despesas e logs de importacao.
- Ja existe area de superadmin para lojas e convites.
- Ja existe suporte tecnico para CMV por vigencia e checkpoint.
- Ja existe saneamento manual.

### O que esta desalinhado

- A camada de metricas em `lib/brandops/metrics.ts` mistura conceitos financeiros diferentes:
  - `grossRevenue`
  - `rob`
  - `netRevenue`
  - `rld`
  - `commissionTotal`
  - `netAfterFees`
  - `netResult`
- O banco remoto ja possui dados reais, mas a regra financeira no frontend nao esta totalmente centralizada na camada canonica.
- O banco remoto hoje tem apenas `1` usuario perfilado, embora o modelo deseje usuarios exclusivos por marca.
- O CMV da OMD no banco esta cadastrado apenas com vigencia a partir de `2026-03-01`.
- Os itens anteriores a `2026-03-01` estao sem CMV aplicado no banco.
- Ha uma migration local importante ainda nao aplicada no remoto:
  - `supabase/migrations/20260324010101_omd_financial_canonical_layer.sql`

### Achados objetivos do banco real

- `brands`: `2`
- `user_profiles`: `1`
- `brand_members`: `2`
- `orders`: `235`
- `order_items`: `170`
- `sales_lines`: `163`
- `media_performance`: `5432`
- `cmv_history`: `8`
- `cmv_checkpoints`: `6`
- `expense_categories`: `8`
- `brand_expenses`: `0`
- `import_logs`: `70`
- `products`: `529`

### Achados criticos do CMV

- OMD possui regras de CMV somente com `valid_from = 2026-03-01`.
- `170` itens anteriores a `2026-03-01` estao com `cmv_total_applied = 0`.
- Existem `22` pedidos apos `2026-03-01`, contra `213` pedidos anteriores.
- Isso significa que o historico anterior esta distorcido em DRE, margem bruta e contribuicao.

### Achados dos CSVs reais

Fonte oficial por dominio:

- `Lista de Pedidos.csv`
  - melhor fonte para financeiro do pedido
  - usa `Valor do Pedido`, `Valor do Desconto`, `Comissao`, `Status de Pagamento`
- `Lista de Itens.csv`
  - melhor fonte para pecas reais e valor bruto por item
- `Meta Export.csv`
  - melhor fonte para midia
- `feed_facebook.csv`
  - melhor fonte auxiliar para classificar tipo de peca
- `Pedidos Pagos.csv`
  - util para reconciliacao, nao como unica fonte do DRE

## Regra canonicamente correta

### Financeiro

1. Receita bruta
2. Desconto
3. Receita liquida da venda
4. CMV Inc por tipo de peca e por vigencia
5. Margem bruta
6. Midia Meta saneada
7. Margem de contribuicao
8. Despesas operacionais
9. Resultado

### CMV

- O CMV e por tipo de peca, nao por estampa, cor ou tamanho.
- O frete e pago pelo cliente.
- O CMV deve refletir custos de producao e logistica da Ink.
- A troca de custo em `2026-03-01` deve ser tratada com vigencia historica.

### Acesso

- `SUPER_ADMIN` ve e opera todas as marcas.
- Cada owner deve ver apenas a propria marca.
- Escrita sensivel deve passar por fluxos controlados, nao por permissao ampla na tabela de fatos importados.

## Backlog de correcao

### Fase 1 - Verdade financeira

1. Revisar e simplificar `lib/brandops/types.ts`
2. Reescrever a semantica de `lib/brandops/metrics.ts`
3. Centralizar a verdade financeira nas views/RPCs da camada canonica
4. Alinhar frontend para consumir a camada canonica, nao recalcular conceitos concorrentes

Arquivos-alvo:
- `lib/brandops/types.ts`
- `lib/brandops/metrics.ts`
- `lib/brandops/canonical-ingest.ts`
- `supabase/migrations/20260324010101_omd_financial_canonical_layer.sql`
- `app/(app)/dashboard/page.tsx`
- `app/(app)/dre/page.tsx`

### Fase 2 - CMV historico

1. Definir tabela de custos antiga da OMD para periodo anterior a `2026-03-01`
2. Manter tabela nova para periodo a partir de `2026-03-01`
3. Garantir tipos canonicos unicos:
   - Regata
   - Cropped (tee)
   - Infantil (tee)
   - Camiseta classica/fem
   - Peruana
   - Oversized
   - Cropped moletom
   - Sueter moletom
   - Hoodie moletom
4. Melhorar o vinculo item -> tipo usando:
   - catalogo/feed
   - heuristica textual
   - fallback manual
5. Reaplicar checkpoint historico para os itens antigos

Arquivos-alvo:
- `lib/brandops/csv.ts`
- `lib/brandops/database.ts`
- `lib/brandops/metrics.ts`
- `app/(app)/cmv/page.tsx`
- `supabase/migrations/20260320010501_brandops_cmv_expenses_sanitization.sql`
- `supabase/migrations/20260320010601_brandops_cmv_checkpoint_sales_line_match.sql`
- `supabase/migrations/20260323010101_brandops_cmv_checkpoint_date.sql`

### Fase 3 - Multi-marca e seguranca

1. Criar usuarios exclusivos por marca
2. Revisar `brand_members`
3. Rever permissao ampla de escrita nas tabelas operacionais
4. Manter owners com leitura da propria marca e escrita apenas via fluxos especificos
5. Revisar convites de superadmin em API

Arquivos-alvo:
- `lib/brandops/admin.ts`
- `app/api/admin/invitations/route.ts`
- `app/api/admin/brands/route.ts`
- `app/api/admin/brands/[brandId]/route.ts`
- policies em `supabase/migrations`

### Fase 4 - Importacao e qualidade de dados

1. Tornar obrigatoria a definicao de fonte oficial por dominio
2. Revisar parser da Meta por cabecalho duplicado
3. Padronizar logs de importacao com diagnostico por arquivo
4. Garantir idempotencia sem ambiguidade entre `Lista de Pedidos`, `Lista de Itens` e `Pedidos Pagos`

Arquivos-alvo:
- `lib/brandops/csv.ts`
- `lib/brandops/database.ts`
- `lib/brandops/canonical-ingest.ts`

### Fase 5 - Interface e confianca operacional

1. Ajustar telas para refletir a camada canonica
2. Deixar claro quando um numero vem de dado bruto, saneado ou consolidado
3. Mostrar status de cobertura do CMV
4. Mostrar alertas quando houver itens sem match de CMV

Arquivos-alvo:
- `app/(app)/dashboard/page.tsx`
- `app/(app)/dre/page.tsx`
- `app/(app)/cmv/page.tsx`
- `app/(app)/sanitization/page.tsx`
- `app/(app)/import/page.tsx`

## Ordem de execucao recomendada

1. Aplicar auditoria repetivel do banco
2. Corrigir semantica financeira
3. Corrigir CMV historico
4. Reprocessar dados da OMD
5. Revisar acesso multi-marca
6. Validar telas e relatorios

## Criterios de aceite

- OMD deve ter CMV correto antes e depois de `2026-03-01`
- Owners devem enxergar somente sua marca
- `SUPER_ADMIN` deve enxergar todas
- DRE, dashboard e visoes gerenciais devem bater com os CSVs reais
- O sistema deve sinalizar itens sem CMV ou linhas de midia ignoradas
- Nenhuma nova importacao pode apagar historico

## Arquivos para abrir primeiro

- `lib/brandops/metrics.ts`
- `lib/brandops/types.ts`
- `lib/brandops/database.ts`
- `lib/brandops/canonical-ingest.ts`
- `README_DRE_CMV_METRICAS_OMD.md`
- `documentation/METRICS.md`
- `supabase/migrations/20260324010101_omd_financial_canonical_layer.sql`
- `app/(app)/dre/page.tsx`
- `app/(app)/cmv/page.tsx`

