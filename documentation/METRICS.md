# Regras de Negócio e Cálculos de Métricas - BrandOps

Este documento detalha a lógica utilizada para o cálculo dos KPIs exibidos no Dashboard e nos relatórios de DRE da BrandOps.

---

## 1. Receita e Vendas

### Receita Operacional Bruta (ROB)
- **Definição:** Soma de todos os `valor_bruto` dos itens vendidos em pedidos com status 'Pago'.
- **Cálculo:** `∑ (Quantidade * Preço de Tabela)`

### Receita Líquida Disponível (RLD)
- **Definição:** Valor total faturado que serve de base para o repasse/cálculo da margem do lojista. No modelo POD, descontos são abatidos, mas a taxa de plataforma/gateway é considerada parte da operação da Ink, não deduzindo da RLD para fins de cálculo de margem bruta do lojista.
- **Cálculo:** `Receita Bruta - Descontos - Cupons`

---

## 2. Custos e Margens

### Custo de Mercadoria Vendida (CMV)
- **Definição:** Custo de produção e logística cobrado pela plataforma (Ink) por cada item vendido.
- **Cálculo:** `∑ (Quantidade Vendida * Custo Unitário da Regra Aplicada)`
- **Regras de Atribuição:**
  1. **Produto Específico:** Busca o custo definido para o nome exato do produto.
  2. **Tipo de Produto:** Se não houver custo por nome, aplica o custo médio definido para a categoria (ex: Camiseta, Calça).
  3. **Fallback:** Se nenhuma regra existir, o CMV é zero (ex exige atenção do gestor).

### Margem CMV (%)
- **Definição:** Representatividade do custo de produção sobre a receita líquida.
- **Cálculo:** `(RLD - CMV) / RLD`

### Margem de Contribuição (Sobra do Lojista)
- **Definição:** O que sobra da venda para o lojista após pagar o custo de produção (CMV) e o investimento em mídia (Ads). Esta é a "comissão" ou lucro bruto operacional do lojista.
- **Cálculo:** `RLD - CMV - Investimento em Ads (Paid Media)`

---

## 3. Eficiência e Equilíbrio

### Ponto de Equilíbrio (Break-even Point)
- **Definição:** O faturamento (RLD) necessário no mês para que o lucro seja zero (empate).
- **Cálculo:** `Total de Despesas Fixas / Margem de Contribuição %`
- *Exemplo: Se a despesa fixa é R$ 10.000 e a Margem de Contribuição é 40%, o Ponto de Equilíbrio é R$ 25.000.*

### MER (Marketing Efficiency Ratio)
- **Definição:** Eficiência global do gasto em mídia em relação ao faturamento total.
- **Cálculo:** `Investimento em Mídia / RLD`

---

## 4. Periodicidade de Cálculo
Os dados são consolidados **mensalmente (Competência)** com base na data do pedido (`order_date`). Os checkpoints de CMV permitem que o gestor trave o custo unitário de um período passado, garantindo que mudanças de fornecedor atuais não alterem retroativamente o histórico da empresa.
