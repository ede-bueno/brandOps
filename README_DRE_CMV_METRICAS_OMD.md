# Documentação Funcional e de Cálculo
## DRE, CMV e Métricas Financeiras/Operacionais

**Projeto:** OMD Financeiro / Multi-marca POD  
**Destino:** Implementação no Antigravity  
**Status:** Especificação canônica v1

---

## 1. Objetivo

Definir, de forma canônica, as regras de negócio, os cálculos e os critérios de saneamento para geração de:

- DRE mensal
- Contribuição diária
- Resumo diário, semanal e mensal
- Métricas de mídia e eficiência operacional
- CMV histórico por vigência
- Regras de exclusão lógica de anomalias da Meta

Este documento deve ser tratado como **fonte de verdade** para implementação.

---

## 2. Contexto de negócio

A operação é de **print on demand**. A produção é terceirizada via INK. O sistema precisa consolidar dados de vendas, itens, catálogo e mídia paga para demonstrar a saúde financeira de cada marca.

### Premissas

1. O sistema é **multi-marca**.
2. Cada registro deve pertencer explicitamente a uma marca (`brand_id`).
3. O histórico **não pode ser apagado** em novas importações.
4. O CMV muda ao longo do tempo e deve ser aplicado pela **data da venda**.
5. Relatórios da Meta podem conter **anomalias** e precisam ser saneáveis.
6. O foco inicial é financeiro, mas a arquitetura deve permitir evolução futura para inteligência operacional.

---

## 3. Fontes oficiais de dados

### 3.1 Arquivos CSV da versão inicial

- `Meta Export.csv`
- `feed_facebook.csv`
- `Pedidos Pagos.csv`
- `Lista de Pedidos.csv`
- `Lista de Itens.csv`

### 3.2 Papel de cada arquivo

#### `Meta Export.csv`
Fonte de mídia da Meta Ads. Deve alimentar:
- gasto
- impressões
- alcance
- cliques
- compras Meta
- valor de conversão
- métricas derivadas (CTR, CPC, CPM, CPA/CPP, ROAS, CVR)

#### `Pedidos Pagos.csv`
Fonte financeira principal do pedido. Deve alimentar:
- pedido
- data do pedido
- cliente
- status de pagamento
- valor bruto do pedido
- desconto
- receita líquida de desconto
- origem
- rastreio

#### `Lista de Pedidos.csv`
Fonte auxiliar para reconciliação de pedido com SKU/ID de produto. Deve alimentar:
- pedido
- data
- produto
- SKU / ID produto
- quantidade

#### `Lista de Itens.csv`
Fonte principal do detalhe dos itens vendidos. Deve alimentar:
- pedido
- data
- cliente
- produto
- especificações
- quantidade
- valor bruto do item
- peças reais
- faturamento por item
- CMV aplicado por item

#### `feed_facebook.csv`
Catálogo comercial e de produto. Deve alimentar:
- produto/título
- SKU/ID
- preço
- sale price
- imagem
- URL
- atributos do catálogo
- enriquecimento de produto
- suporte futuro para recomendação operacional

---

## 4. Princípios de implementação

### 4.1 Ingestão incremental obrigatória

O sistema deve operar com:
- staging
- normalização
- deduplicação
- upsert incremental

### 4.2 Regras obrigatórias

- Nunca apagar a base inteira em nova importação.
- Inserir linhas novas.
- Atualizar linhas alteradas.
- Ignorar duplicatas perfeitas.
- Preservar histórico.
- Recalcular agregados somente da marca impactada.
- Registrar log de importação.

### 4.3 Idempotência

Executar o mesmo upload duas vezes não pode duplicar resultados.

---

## 5. Modelo conceitual mínimo

## 5.1 Entidades principais

### `brands`
- id
- name
- status
- created_at

### `users`
- id
- brand_id nullable para super admin
- role (`super_admin`, `brand_owner`)
- email

### `imports`
- id
- brand_id
- source_type
- file_name
- imported_by
- imported_at
- rows_received
- rows_inserted
- rows_updated
- rows_ignored
- rows_rejected
- status

### `meta_raw`
- id
- brand_id
- source_import_id
- event_date
- campaign_name
- adset_name
- ad_name
- impressions
- reach
- clicks
- purchases_meta
- conversion_value
- spend
- is_ignored
- ignore_reason
- row_hash

### `orders_paid`
- id
- brand_id
- source_import_id
- order_id
- order_date
- customer_name
- payment_status
- gross_revenue
- discount_value
- net_revenue
- source
- tracking_url
- row_hash

### `order_lines`
- id
- brand_id
- source_import_id
- order_id
- sale_date
- customer_name
- product_name
- product_variant
- sku nullable
- product_id nullable
- quantity
- gross_line_revenue
- cmv_unit_applied
- cmv_total_applied
- row_hash

### `products`
- id
- brand_id
- product_name
- sku nullable
- product_id nullable
- image_url nullable
- product_url nullable
- price nullable
- sale_price nullable
- product_type nullable

### `cmv_history`
- id
- brand_id
- product_name nullable
- sku nullable
- product_type nullable
- cmv_unit
- effective_start_date
- effective_end_date nullable
- is_active

### `fixed_expenses`
- id
- brand_id
- competence_month
- category
- description
- amount

### `anomaly_reviews`
- id
- brand_id
- source_table
- source_row_id
- anomaly_type
- action (`ignored`, `restored`)
- reason
- reviewed_by
- reviewed_at

---

## 6. Regras de normalização

## 6.1 Datas

Todas as datas devem ser convertidas para formato canônico de data local.

Campos de agregação sugeridos:
- `sale_day`
- `sale_week`
- `sale_month`
- `sale_year`

### 6.2 Números monetários

- Armazenar como decimal numérico.
- Não armazenar com símbolo monetário.
- Normalizar entradas com `,` e `.`.

### 6.3 Status de pagamento

Apenas pedidos com status equivalente a **pago** entram no financeiro.

Mapear como pagos, por exemplo:
- pago
- aprovado
- confirmado
- concluído
- capturado

---

## 7. CMV por vigência

## 7.1 Regra central

CMV não é atributo apenas do produto. É atributo do produto **em uma faixa de tempo**.

### 7.2 Regra de busca do CMV

Para cada item vendido, localizar o CMV válido considerando:

1. `brand_id`
2. prioridade de match:
   - SKU
   - product_id
   - product_name
   - product_type
3. data da venda dentro da vigência:
   - `sale_date >= effective_start_date`
   - `sale_date <= effective_end_date` ou `effective_end_date is null`

### 7.3 Persistência histórica obrigatória

No momento do processamento do item vendido, gravar:
- `cmv_unit_applied`
- `cmv_total_applied = quantity * cmv_unit_applied`

### 7.4 Regra histórica

- Mudança de CMV futuro não pode alterar automaticamente vendas passadas.
- Reprocessamento histórico só pode ocorrer por rotina explícita de backfill.

### 7.5 Exemplo

| Produto | CMV | Início | Fim |
|---|---:|---|---|
| Camiseta | 32.90 | 2025-01-01 | 2026-03-01 |
| Camiseta | 36.40 | 2026-03-02 | null |

Venda em `2026-02-28` usa `32.90`.  
Venda em `2026-03-10` usa `36.40`.

---

## 8. Regras de saneamento da Meta

## 8.1 Problema conhecido

Relatórios da Meta podem conter falsas conversões e valores irreais, por exemplo linhas com conversões de `22000` ou `38000` que não ocorreram de fato.

## 8.2 Solução obrigatória

Linhas de Meta devem suportar **exclusão lógica**.

Campos mínimos:
- `is_ignored`
- `ignore_reason`
- `ignored_by`
- `ignored_at`

## 8.3 Regra de cálculo

Toda linha com `is_ignored = true` deve ser excluída de:
- resumos diários
- resumo semanal
- resumo mensal
- DRE
- dashboards
- insights

## 8.4 Sugestões de detecção automática

Sinalizar como suspeitas linhas com:
- `conversion_value > threshold configurável`
- `spend < 0`
- `ROAS > threshold configurável`
- `CTR > threshold configurável`
- `CPC > threshold configurável`
- `CPM > threshold configurável`
- compras incompatíveis com clique/impressão

### 8.5 Regra operacional

- A detecção automática apenas sugere.
- A decisão final de ignorar é humana.
- Toda ação deve ser auditável.

---

## 9. Cálculos canônicos

## 9.1 Receita Bruta (ROB)

Representa o faturamento bruto antes dos descontos.

### Fórmula

```text
Receita Bruta = soma dos valores brutos dos pedidos pagos
```

Pode ser obtida de:
- `Pedidos Pagos.csv`
- ou agregação dos itens quando necessário

---

## 9.2 Desconto

Valor total de descontos concedidos em pedidos pagos.

### Fórmula

```text
Desconto = soma dos descontos dos pedidos pagos
```

---

## 9.3 Receita Líquida de Desconto (RLD)

Receita após abatimento de descontos.

### Fórmula

```text
RLD = Receita Bruta - Desconto
```

---

## 9.4 CMV

Custo das mercadorias efetivamente vendidas no período.

### Fórmula canônica

```text
CMV = soma de cmv_total_applied dos itens vendidos no período
```

### Observação

Nunca calcular CMV do período usando apenas custo atual do produto. Sempre usar o CMV aplicado no item vendido.

---

## 9.5 Margem Bruta

Resultado da receita líquida após dedução do CMV.

### Fórmula

```text
Margem Bruta = RLD - CMV
```

---

## 9.6 Gasto Ads / Adcost total

Custo de mídia do período.

### Fórmula

```text
Gasto Ads = soma de spend da Meta no período, excluindo linhas ignoradas
```

---

## 9.7 Margem de Contribuição

Resultado após dedução do gasto de mídia sobre a margem bruta.

### Fórmula

```text
Margem de Contribuição = RLD - CMV - Gasto Ads
```

ou equivalentemente:

```text
Margem de Contribuição = Margem Bruta - Gasto Ads
```

---

## 9.8 Resultado

Resultado final após dedução das despesas fixas.

### Fórmula

```text
Resultado = Margem de Contribuição - Despesas Fixas
```

---

## 9.9 Adcost por peça

Quanto de mídia foi gasto por peça real vendida.

### Fórmula

```text
Adcost por peça = Gasto Ads / Peças reais
```

Se `Peças reais = 0`, retornar `null`.

---

## 9.10 Ticket médio

Receita média por peça ou por venda, conforme convenção do sistema.

### Convenção recomendada nesta operação

Usar por **peça real vendida**, porque os prints atuais operam nesse raciocínio.

### Fórmula

```text
Ticket Médio = Receita Bruta / Peças reais
```

Se no futuro houver necessidade de ticket por pedido, criar métrica separada.

---

## 9.11 ROAS bruto

Retorno sobre gasto em mídia usando receita bruta.

### Fórmula

```text
ROAS Bruto = Receita Bruta / Gasto Ads
```

Se `Gasto Ads = 0`, retornar `null`.

---

## 9.12 ROAS líquido

Retorno sobre gasto em mídia usando margem bruta ou contribuição, dependendo da convenção.

### Convenção adotada neste projeto

Usar **Margem Bruta**.

### Fórmula

```text
ROAS Líquido = Margem Bruta / Gasto Ads
```

Se posteriormente quiser uma leitura ainda mais rigorosa, criar indicador adicional de eficiência sobre margem de contribuição.

---

## 9.13 CTR

Taxa de clique.

### Fórmula

```text
CTR = Cliques / Impressões
```

Expressar em percentual.

---

## 9.14 CPC

Custo por clique.

### Fórmula

```text
CPC = Gasto Ads / Cliques
```

---

## 9.15 CPM

Custo por mil impressões.

### Fórmula

```text
CPM = (Gasto Ads * 1000) / Impressões
```

---

## 9.16 CVR Meta

Taxa de conversão reportada pela Meta.

### Fórmula

```text
CVR Meta = Compras Meta / Cliques
```

---

## 9.17 CVR Real

Taxa de conversão real baseada em peças ou vendas reais.

### Convenção adotada

Usar peças reais vendidas.

### Fórmula

```text
CVR Real = Peças reais / Cliques
```

---

## 9.18 Peças reais

Quantidade real de itens vendidos.

### Fórmula

```text
Peças reais = soma das quantidades dos itens vendidos no período
```

Fonte principal: `Lista de Itens.csv`

---

## 10. Estrutura do DRE

## 10.1 Linhas obrigatórias

1. Receita Bruta
2. (-) Desconto
3. (=) Receita Líquida de Desconto
4. (-) CMV
5. (-) Adcost
6. (=) Margem de Contribuição
7. (-) Despesas Fixas
8. (=) Resultado

## 10.2 Despesas fixas mínimas previstas

- Salário Ede
- IA
- Serviços
- Equipamentos
- Outros

### Fórmula das despesas fixas

```text
Despesas Fixas = soma das despesas fixas da competência
```

### Fórmula do resultado

```text
Resultado = Receita Líquida de Desconto - CMV - Adcost - Despesas Fixas
```

---

## 11. Estrutura da Contribuição Diária

## 11.1 Colunas mínimas

- Dia
- ROB
- Desconto
- RLD
- CMV
- Adcost
- Contribuição

## 11.2 Percentuais sugeridos

Usar RLD como base percentual para leitura gerencial.

### Fórmulas percentuais

```text
Desconto % RLD = Desconto / RLD
CMV % RLD = CMV / RLD
Adcost % RLD = Adcost / RLD
Contribuição % RLD = Contribuição / RLD
```

Onde:

```text
Contribuição = RLD - CMV - Adcost
```

Se `RLD = 0`, retornar `null` ou `0` conforme padrão visual escolhido, sem distorcer cálculo.

---

## 12. Resumos

## 12.1 Resumo Diário

Campos mínimos:
- Data
- Gasto Ads
- Impressões
- Cliques
- Compras Meta
- Peças reais
- Faturamento bruto
- CMV
- Margem bruta
- Adcost
- Ticket
- ROAS bruto
- ROAS líquido
- CTR
- CPC
- CPM
- CVR Meta
- CVR Real

## 12.2 Resumo Semanal

Mesmos indicadores do diário, agregados por semana.

### Convenção

Usar chave do tipo:

```text
YYYY-SW
```

Exemplo: `2026-S10`

## 12.3 Resumo Mensal

Mesmos indicadores do diário, agregados por mês.

### Convenção

Usar chave do tipo:

```text
YYYY-MM
```

Exemplo: `2026-03`

---

## 13. Regras de agregação

## 13.1 Períodos

Toda agregação deve respeitar:
- `brand_id`
- período
- exclusão de linhas ignoradas

## 13.2 Base de verdade por domínio

### Financeiro do pedido
Usar `orders_paid`.

### Itens vendidos / peças reais / CMV
Usar `order_lines`.

### Mídia
Usar `meta_raw` com `is_ignored = false`.

### Despesas fixas
Usar `fixed_expenses` por competência.

---

## 14. Deduplicação e chaves naturais

## 14.1 Regras sugeridas

### Pedidos pagos
Chave natural sugerida:

```text
brand_id + order_id
```

### Itens
Prioridade de chave:

```text
brand_id + order_id + sku + product_name + product_variant
```

Se não houver chave confiável suficiente, gerar `row_hash_normalized`.

### Meta
Chave sugerida:

```text
brand_id + event_date + campaign_name + adset_name + ad_name
```

Se houver granularidade adicional relevante no export, incorporar na chave.

---

## 15. Auditoria

Toda ação sensível deve gerar log:
- upload de arquivo
- update em linha existente
- item ignorado/restaurado
- mudança de CMV
- backfill de CMV
- mudança de despesa fixa

Campos mínimos do log:
- actor_user_id
- action_type
- target_table
- target_id
- payload_before nullable
- payload_after nullable
- created_at

---

## 16. Regras de interface e relatórios

## 16.1 Dashboard executivo

Deve exibir pelo menos:
- gasto ads
- faturamento bruto
- RLD
- CMV
- margem bruta
- adcost
- ticket médio
- ROAS bruto
- ROAS líquido
- peças reais
- resultado

## 16.2 Prioridade visual

A leitura deve privilegiar:
1. saúde financeira
2. eficiência de mídia
3. tendência temporal
4. discrepâncias entre Meta e venda real

---

## 17. Insights mínimos

O sistema pode gerar insights simples, por exemplo:
- aumento de adcost semana contra semana
- queda de ROAS bruto e líquido
- margem de contribuição negativa
- discrepância relevante entre compras Meta e peças reais
- campanha com gasto relevante e retorno baixo
- piora de CMV percentual sobre RLD

Esses insights são auxiliares. Nunca substituem os cálculos canônicos.

---

## 18. Pseudocódigo de cálculo

```text
para cada brand_id:
  importar arquivos em staging
  normalizar colunas
  deduplicar
  executar upsert nas tabelas canônicas

  para cada order_line sem cmv aplicado:
    localizar cmv vigente pela data da venda
    gravar cmv_unit_applied
    gravar cmv_total_applied

  excluir logicamente da camada analítica toda linha meta com is_ignored = true

  gerar agregações diárias:
    receita_bruta
    desconto
    rld
    pecas_reais
    cmv
    gasto_ads
    margem_bruta
    margem_contribuicao
    métricas de mídia

  agregar diário em semanal
  agregar diário em mensal
  montar DRE mensal
```

---

## 19. Regras de fallback

## 19.1 Se Meta vier sem dados válidos no dia

- manter venda real do dia normalmente
- métricas dependentes de mídia podem ficar `null`

## 19.2 Se item vendido não encontrar CMV vigente

- marcar linha para revisão
- não inventar custo
- permitir fallback controlado apenas se a operação definir regra explícita

## 19.3 Se houver conflito entre pedido e item

- item continua sendo base para peças reais
- pedido continua sendo base financeira do pedido
- divergências devem aparecer na auditoria/reconciliação

---

## 20. Decisões canônicas finais

1. **RLD = Receita Bruta - Desconto**
2. **CMV = soma de cmv_total_applied**
3. **Margem Bruta = RLD - CMV**
4. **Margem de Contribuição = RLD - CMV - Gasto Ads**
5. **Resultado = Margem de Contribuição - Despesas Fixas**
6. **ROAS Bruto = Receita Bruta / Gasto Ads**
7. **ROAS Líquido = Margem Bruta / Gasto Ads**
8. **Adcost = Gasto Ads / Peças reais**
9. **Ticket = Receita Bruta / Peças reais**
10. **CVR Real = Peças reais / Cliques**
11. **Meta ignorada não entra em cálculo**
12. **CMV deve respeitar vigência e snapshot histórico no item vendido**
13. **Importação deve ser incremental e idempotente**
14. **Toda segregação deve ocorrer por brand_id**

---

## 21. Checklist de implementação no Antigravity

- [ ] criar modelo multi-marca com `brand_id`
- [ ] implementar upload + staging
- [ ] implementar normalização por cabeçalho e fallback por nome de arquivo
- [ ] implementar deduplicação e upsert
- [ ] implementar `cmv_history`
- [ ] implementar aplicação de CMV por vigência no item vendido
- [ ] implementar `is_ignored` para Meta
- [ ] implementar auditoria
- [ ] implementar agregações diária, semanal e mensal
- [ ] implementar DRE mensal
- [ ] implementar contribuição diária
- [ ] implementar validações e sinalização de anomalias
- [ ] implementar isolamento por marca

---

## 22. Critério de aceite

A implementação estará correta quando:

1. Reimportar o mesmo CSV não duplicar resultados.
2. Importar 2025 e depois 2026 preservar todo o histórico.
3. Mudança de CMV futura não alterar meses passados.
4. Ignorar uma linha anômala da Meta recalcular os painéis corretamente.
5. Os números de DRE, resumo semanal e contribuição diária baterem com os cálculos canônicos deste documento.
6. Cada proprietário só enxergar os dados da própria marca.

