# Motor de Decisão de Estampas e Mídia

## Objetivo

Transformar a leitura de `GA4`, `Meta` e `INK` em recomendações operacionais objetivas, reduzindo a dependência de interpretação manual de métricas soltas.

O foco não é “mostrar mais números”. O foco é responder:

- qual estampa merece ganhar mais distribuição
- qual estampa precisa de mais tráfego antes de qualquer conclusão
- qual estampa está recebendo atenção, mas pede revisão de vitrine/mockup/PDP
- quais anúncios merecem escalar, manter, revisar ou pausar

## Tese do produto

O sistema deve separar duas decisões diferentes:

1. `Insights de Estampas`
- decisão orientada a produto
- usa principalmente `GA4`
- valida com venda real da `INK`

2. `Decisão de Mídia`
- decisão orientada a orçamento/anúncio
- usa principalmente `Meta API`
- valida com venda real da `INK` e, quando possível, sinais do `GA4`

## Fontes de verdade

### Venda real

Fonte principal:
- exportações CSV da `INK`

Campos e leituras:
- `Lista de Pedidos.csv` para visão comercial
- `Lista de Itens.csv` para peças reais e aplicação de `CMV`

Regra:
- quando houver divergência entre plataforma de mídia e venda real, a `INK` continua sendo a referência para faturado, pedidos e itens vendidos.

### Produto e intenção de compra

Fonte principal:
- `GA4`

Sinais atualmente sincronizados por item:
- `itemViews`
- `itemsAddedToCart`
- `itemsCheckedOut`
- `itemPurchaseQuantity`
- `itemRevenue`

Taxas derivadas:
- `addToCartRate`
- `checkoutRate`
- `purchaseRate`

### Mídia paga

Fonte principal:
- `Meta API`

Sinais principais:
- investimento
- alcance
- impressões
- cliques
- CTR
- CPC
- CPM
- compras
- valor de compra

## Problema que esta camada resolve

O painel original de produtos mostrava:
- muita métrica
- pouca hierarquia
- pouca explicação sobre o que fazer

Isso gerava uma tela informativa, mas não decisória.

O motor de decisão corrige isso ao transformar sinais em:
- ação sugerida
- confiança
- racional auditável

## Decisões de produto implementadas

Saídas atuais:

- `scale_now`
- `boost_traffic`
- `review_listing`
- `watch`

### 1. Escalar agora

Critério base:
- amostra confortável de visualizações
- taxa de adição ao carrinho forte
- e sinal de checkout, compra ou venda real

Leitura operacional:
- a estampa já demonstrou tração suficiente para ganhar distribuição

Ação sugerida:
- aumentar exposição em catálogo, coleção e mídia controlada

### 2. Dar mais tráfego

Critério base:
- sinal promissor
- mas ainda sem amostra forte o bastante para cravar validação

Leitura operacional:
- não deve ser descartada
- ainda precisa de distribuição antes da decisão final

Ação sugerida:
- ampliar visibilidade mínima e reavaliar em nova janela

### 3. Revisar vitrine

Critério base:
- boa atenção
- baixa resposta proporcional em carrinho/checkout/compra

Leitura operacional:
- o gargalo parece estar no mockup, miniatura, PDP, peça base ou enquadramento visual

Ação sugerida:
- revisar a apresentação antes de aumentar mídia

### 4. Observar

Critério base:
- sem amostra suficiente
- ou sem sinal forte

Leitura operacional:
- ainda não é hora de escalar nem cortar

Ação sugerida:
- manter em monitoramento

## Estrutura atual no código

Arquivos principais:

- [page.tsx](C:\BrandOps\BrandOps-new\app\(app)\product-insights\page.tsx)
- [metrics.ts](C:\BrandOps\BrandOps-new\lib\brandops\metrics.ts)
- [types.ts](C:\BrandOps\BrandOps-new\lib\brandops\types.ts)
- [ga4.ts](C:\BrandOps\BrandOps-new\lib\integrations\ga4.ts)

Pontos principais:

- `buildProductInsights(...)`
  consolida os sinais por estampa + tipo de peça

- `aggregateRealProductSignals(...)`
  cruza a leitura do GA4 com venda real conciliada via `orderItems`

- `resolveProductDecision(...)`
  transforma sinais em decisão, confiança, ação sugerida e racional

## O que já cruza

Hoje a tela consegue cruzar:

- comportamento do `GA4`
- venda real conciliada da `INK`

Isso permite responder:
- a estampa atrai interesse?
- ela gera intenção de compra?
- isso já virou venda real?

## O que ainda não cruza completamente

A camada ainda não liga perfeitamente:

- estampa
- anúncio específico
- criativo específico
- conjunto/campanha

Por isso:
- já dá para decidir produto muito melhor
- já dá para decidir mídia em outra camada
- mas a leitura unificada “escale este anúncio desta estampa” ainda depende de uma modelagem extra

## Tese para a tela de mídia

A recomendação para `Meta` deve seguir a mesma lógica de decisão, mas com outra pergunta:

- este anúncio merece mais verba?

Saídas planejadas:

- `scale_budget`
- `maintain`
- `review_creative`
- `review_audience`
- `pause`

Sinais prováveis:

- CTR
- CPC
- CPM
- conversão
- ROAS
- compra atribuída
- tendência de eficiência
- comparação com benchmarks da própria loja

## Por que a IA não entra primeiro

IA antes de regra gera texto bonito e decisão opaca.

O caminho recomendado é:

1. motor determinístico
2. benchmark por loja
3. narrador IA opcional

Assim:
- a recomendação continua auditável
- o sistema não vira caixa-preta
- o custo operacional fica baixo

## Onde a IA pode entrar depois

Uso recomendado:
- resumir a decisão em linguagem natural
- priorizar top oportunidades
- explicar trade-offs
- montar plano de ação semanal por loja

Exemplo:
- “Esta estampa mostrou taxa de adição ao carrinho acima da mediana da loja, mas ainda com volume insuficiente. Recomendação: aumentar distribuição e revisar em 7 dias.”

### Importante

A IA não deve calcular o número bruto nem decidir sozinha a partir de dados crus.

Ela deve receber:
- decisão estruturada
- confiança
- reason codes
- contexto da loja

E apenas narrar ou priorizar.

## Custo estimado para IA

### OpenAI

`ChatGPT Plus` não cobre uso de API.

Referências:
- [Billing settings in ChatGPT vs Platform](https://help.openai.com/en/articles/9039756-billing-settings-in-chatgpt-vs-platform)
- [OpenAI API pricing](https://openai.com/api/pricing/)

## Roadmap recomendado

### Fase 1
- consolidar a tela de `Insights de Produtos` como painel de decisão
- estabilizar thresholds e confiança
- melhorar benchmark por loja

### Fase 2
- criar motor de decisão para `Meta`
- separar claramente decisão de produto e decisão de mídia

### Fase 3
- cruzar produto + mídia + venda real quando houver vínculo suficiente

### Fase 4
- adicionar narrador IA de baixo custo
- gerar insights executivos e plano de ação

## Backlog natural desta frente

- benchmark dinâmico por loja em vez de thresholds estáticos
- ligação mais forte entre catálogo, produto e anúncio
- camada de confiança mais refinada
- histórico de decisões e revisão de decisões ao longo do tempo
- explicações mais claras para operador não técnico

## Regra de segurança operacional

Mesmo com `GA4` e `Meta` sincronizados:

- venda real
- faturado
- desconto
- itens vendidos

continuam sendo governados pela `INK`.

Isso evita que a mídia “fabrique” venda que não existiu na operação real.
