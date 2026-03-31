# Guia de Transição: Antigravity para Codex (OpenAI)

Este documento detalha as implementações recentes, o estado atual do sistema BrandOps e os próximos passos críticos para a continuidade do projeto via Codex.

---

## 1. Implementações Recentes (Antigravity + Codex)

### 1.1 Camada Canônica de KPIs e DRE
- **Migração de KPI:** Implementada a migração `20260331023100_add_order_count_to_kpis.sql` que adiciona `order_count` às funções de agregação de KPIs, permitindo o cálculo de Ticket Médio por pedido de forma nativa no Supabase.
- **Refatoração de Métricas:** Centralização da lógica de cálculo em `lib/brandops/metrics.ts` para suportar tanto os relatórios diários quanto o DRE mensal.

### 1.2 Frontend e User Experience
- **Navegação (Sidebar):** Reorganização da barra lateral para agrupar funcionalidades por domínio (Financeiro, Vendas, Mídia, Operacional).
- **Filtros de Data Dinâmicos:** Implementação de lógica de data relativa (ex: "Últimos 7 dias", "Este Mês") que se ancora na data atual do sistema, evitando disparidade visual nos dashboards.
- **Null-Safety no DRE:** Início do endurecimento da página `app/(app)/dre/page.tsx` para tratar valores nulos retornados pelo backend, prevenindo o "White Screen of Death".

### 1.3 Integrações
- **GA4 Sync:** Ajustes na sincronização de itens do Google Analytics 4 para remover duplicidade de métricas compatíveis.
- **Meta Ads API operacional:** Implementado o fluxo de sincronização real em `lib/integrations/meta.ts`, com rotas para sync manual por loja e cron. O sistema mantém o modo híbrido por marca (`manual_csv`, `api`, `disabled`) e respeita `manualFallback` quando a API estiver ativa.
- **Fonte efetiva da mídia:** O dataset agora escolhe a fonte da mídia pela configuração da integração e pelo campo `delivery` (`api` x `csv`), evitando misturar upload manual com sync automática.

---

## 2. Pendências Críticas (Backlog Imediato)

### 2.1 Automação da Meta Ads API
- **Objetivo:** Consolidar a Meta API como fonte oficial por loja, mantendo o CSV como fallback.
- **Status:** Primeira versão já implementada.
- **Próximos passos:**
  - validar a sync real da loja `Oh My Dog` em produção com `META_ACCESS_TOKEN`
  - evoluir para automação diária confiável via cron
  - revisar, no futuro, se vale reintroduzir breakdowns de placement/device com nova estratégia de hash no banco

### 2.2 Finalização da Robustez do DRE
- **Erro Conhecido:** O relatório DRE ainda pode travar se encontrar datas nulas em marcas sem histórico.
- **Status:** null-safety principal já reforçado em `lib/brandops/metrics.ts`, mas ainda precisa de revisão funcional completa na tela `app/(app)/dre/page.tsx`.
- **Tarefa restante:** auditar cenários de marca vazia / período sem histórico e garantir fallback visual sem branco.

### 2.3 Conciliação de CMV Histórico
- **Contexto:** O CMV da marca *Oh My Dog* mudou em Março/2026.
- **Tarefa:** Validar se a função de reprocessamento em `supabase/migrations/20260330000001_reprocess_omd_cmv.sql` foi aplicada corretamente a todas as linhas históricas e se o dashboard de CMV reflete a margem real corrigida.

---

## 3. Erros Conhecidos e Pontos de Atenção

| Erro / Problema | Causa Provável | Impacto |
| :--- | :--- | :--- |
| **Crash "Cannot read properties of null (reading 'date')"** | Retorno de `ordered_kpis` com lacunas temporais no Supabase RPC. | Impede a visualização do dashboard em marcas novas. |
| **Divergência de Ticket Médio** | Conflito entre "peças reais" e "pedidos" em diferentes áreas da UI. | Gera confusão analítica entre camada INK e BrandOps. |
| **Persistência de Saneamento** | Re-uploads de CSV podem, em alguns casos, "resetar" o status de linhas ignoradas. | Perda de trabalho manual do operador. |
| **Granularidade da Meta Ads API** | Se futuramente reativarmos breakdowns de placement/device, o `row_hash` atual do banco precisará evoluir para não colapsar linhas diferentes no mesmo anúncio/dia. | Pode distorcer mídia se a sync ficar mais granular do que o banco suporta. |

---

## 4. Arquivos Críticos para Referência
1. `lib/brandops/metrics.ts`: Motor de cálculo do sistema.
2. `supabase/migrations/20260324010101_omd_financial_canonical_layer.sql`: A "bíblia" da lógica financeira no banco.
3. `app/(app)/dre/page.tsx`: Componente principal do DRE (necessita de refino de null-safety).
4. `lib/integrations/meta.ts`: Sync real da Meta Ads API.
5. `app/api/admin/brands/[brandId]/integrations/meta/sync/route.ts`: Sync manual da Meta por loja.
6. `app/api/cron/meta-sync/route.ts`: Sync automática da Meta por cron.
7. `README_DRE_CMV_METRICAS_OMD.md`: Regras de negócio funcionais.

---

**Assinado:** *Antigravity*
*Documentação gerada em 31/03/2026 para transição ao Codex.*
