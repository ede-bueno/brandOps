# Documentação de Regras de Negócio e KPIs - BrandOps

Este documento detalha as fórmulas e fontes de dados utilizadas para o cálculo dos indicadores financeiros e operacionais no sistema.

## 1. Receita e Vendas

### Receita Operacional Bruta (ROB)
- **Definição:** Valor total dos pedidos antes de quaisquer descontos.
- **Fórmula:** `Receita Líquida (RLD) + Descontos`.
- **Fonte:** Somatório de `order_value` + `discount_value` dos pedidos com status "Pago".

### Receita Líquida Disponível (RLD)
- **Definição:** Valor real que entra na operação após os descontos aplicados no checkout.
- **Fórmula:** Valor líquido dos pedidos pagos.
- **Fonte:** Somatório de `order_value` da `Lista de Pedidos.csv`.

### Ticket Médio (AOV)
- **Definição:** Valor médio gasto por pedido.
- **Fórmula:** `RLD / Número de Pedidos Pagos`.

---

## 2. Eficiência Operacional (KPIs de Venda)

### Itens Vendidos (Units Sold)
- **Definição:** Quantidade total de peças comercializadas.
- **Regra de Unificação:** Para garantir a integridade, o sistema utiliza o campo `items_in_order` do cabeçalho do pedido como fonte primária.
- **Por que?** Evita subestimação caso a `Lista de Itens.csv` esteja incompleta ou falte o detalhamento de algum produto específico.

### Peças por Pedido (IPT - Items Per Transaction)
- **Definição:** Média de itens contidos em cada venda.
- **Fórmula:** `Total de Itens Vendidos / Número de Pedidos Pagos`.

### Receita por Peça
- **Definição:** Quanto cada item vendido contribui para a receita líquida.
- **Fórmula:** `RLD / Total de Itens Vendidos`.

---

## 3. Gestão de Custos e Margens

### CMV (Custo de Mercadoria Vendida)
- **Definição:** Custo de aquisição ou produção dos itens vendidos.
- **Regra:** Aplicado item a item com base em regras de SKU ou Tipo de Produto.
- **Ajuste Temporal:** O sistema respeita a data de vigência do custo (ex: reajustes de fornecedor).

### Margem de Contribuição
- **Definição:** O que sobra para pagar as despesas fixas após os custos variáveis.
- **Fórmula:** `RLD - CMV - Comissões de Marketplace - Investimento em Mídia`.

### Resultado Líquido (Lucro/Prejuízo)
- **Definição:** Resultado final da operação no período.
- **Fórmula:** `Margem de Contribuição - Despesas Fixas`.

---

## 4. Saneamento de Dados
- **is_ignored:** Todo item marcado como ignorado na interface de Saneamento é excluído de **todos** os cálculos acima (Receita, Itens, Custos, Mídia).
- **Justificativa:** Obrigatória para rastrear o motivo de exclusão de outliers ou erros de integração.
