# Auditoria dos CSVs da OMD e Régua Comercial da INK

Data da auditoria: 23/03/2026

## Objetivo

Este documento consolida:

- todos os CSVs usados pela operação da `Oh My Dog`;
- o significado operacional de cada campo relevante;
- a régua correta para os cards comerciais da INK;
- o que bate exatamente com o print da INK;
- o que ainda não é reproduzível só com os CSVs disponíveis.

## Arquivos auditados

Arquivos na base do projeto:

- [Exportações/2025/Lista de Pedidos.csv](C:\BrandOps\BrandOps-new\Exportações\2025\Lista de Pedidos.csv)
- [Exportações/2025/Lista de Itens.csv](C:\BrandOps\BrandOps-new\Exportações\2025\Lista de Itens.csv)
- [Exportações/2025/Pedidos Pagos.csv](C:\BrandOps\BrandOps-new\Exportações\2025\Pedidos Pagos.csv)
- [Exportações/2025/Meta Export.csv](C:\BrandOps\BrandOps-new\Exportações\2025\Meta Export.csv)
- [Exportações/2025/feed_facebook.csv](C:\BrandOps\BrandOps-new\Exportações\2025\feed_facebook.csv)
- [Exportações/2026/Lista de Pedidos.csv](C:\BrandOps\BrandOps-new\Exportações\2026\Lista de Pedidos.csv)
- [Exportações/2026/Lista de Itens.csv](C:\BrandOps\BrandOps-new\Exportações\2026\Lista de Itens.csv)
- [Exportações/2026/Pedidos Pagos.csv](C:\BrandOps\BrandOps-new\Exportações\2026\Pedidos Pagos.csv)
- [Exportações/2026/Meta Export.csv](C:\BrandOps\BrandOps-new\Exportações\2026\Meta Export.csv)
- [Exportações/2026/feed_facebook.csv](C:\BrandOps\BrandOps-new\Exportações\2026\feed_facebook.csv)

Arquivo comercial consolidado encontrado fora da pasta do projeto:

- `C:\Users\edebu\Downloads\Lista de Pedidos.csv`

## Campo a campo

### 1. Lista de Pedidos.csv

Fonte principal da camada comercial da INK.

Campos:

- `Pedido`
  Identificador único do pedido na INK.
  Uso correto: chave principal da venda para deduplicação e atualização incremental.

- `Data`
  Data do pedido.
  Uso correto: competência comercial e base para filtros por período.

- `Método de Pagamento`
  Ex.: Pix, Cartão de Crédito.
  Uso correto: análises auxiliares e segmentação futura.

- `Status de Pagamento`
  Ex.: `Pago`, `Vencido`, `Não Autorizado`, `Reembolsado`.
  Uso correto: régua principal para os cards comerciais.
  Regra atual correta: cards de vendas devem considerar apenas `Pago`.

- `Cliente`
  Nome do cliente do pedido.
  Uso correto: identificação comercial e auditoria.

- `Items no Pedido`
  Quantidade total de peças no pedido.
  Uso correto: `Itens Vendidos` e `Itens por venda` da camada comercial.
  Observação: esta é a régua da INK para o card comercial, mesmo quando a base de `Lista de Itens` estiver incompleta.

- `Valor do Pedido`
  Valor comercial do pedido exportado pela INK.
  Uso correto: `Faturado` e `Ticket Médio` da camada comercial.
  Observação: este campo é a referência mais confiável da visão comercial.

- `Nome do Cupom`
  Código do cupom aplicado, quando existir.
  Uso correto: auditoria de desconto promocional.
  Observação: nem todo desconto no CSV está necessariamente isolado como “desconto cupom” do print da INK.

- `Valor do Desconto`
  Valor total de desconto associado ao pedido.
  Uso correto: desconto total da camada comercial.
  Observação: este campo não reproduz automaticamente o card `Desconto Cupom` do print da INK.

- `Comissao`
  Valor exportado pela plataforma como lucro/comissão da INK.
  Uso correto: card `Lucro`.
  Observação: para o print comercial da INK, este campo bate muito bem.

- `Origem`
  Canal/origem da venda.
  Uso correto: análise auxiliar.

- `Estado da Entrega`
  UF da entrega.
  Uso correto: operação/logística e segmentação geográfica.

- `Rua da Entrega`
  Logradouro da entrega.
  Uso correto: operacional. Não é KPI.

- `Link de Rastreio`
  URL de rastreio do pedido.
  Uso correto: operação e suporte.

### 2. Lista de Itens.csv

Fonte principal da composição dos produtos vendidos.

Campos:

- `Pedido`
  Número do pedido ao qual o item pertence.
  Uso correto: vínculo com a venda da INK.

- `Data`
  Data do pedido/item.
  Uso correto: competência do item e aplicação do CMV por vigência.

- `Nome do Cliente`
  Nome do cliente.
  Uso correto: auditoria.

- `Nome do produto`
  Nome comercial do produto/estampa.
  Uso correto: base para agrupamento de produtos vendidos.

- `Especificações do Produto`
  Tipo/modelo/cor/tamanho.
  Uso correto: detecção do tipo de peça para CMV.

- `Quantidade`
  Quantidade da linha.
  Uso correto: totalização de peças reais e CMV.

- `Valor Bruto`
  Valor bruto daquela linha de item.
  Uso correto: leitura de mix e conciliação por item.
  Observação: não deve substituir `Valor do Pedido` como base comercial do dashboard.

### 3. Pedidos Pagos.csv

Fonte operacional detalhada de pedidos/linhas. É útil para detalhes, rateios e frete, mas não é a melhor fonte para os cards comerciais da INK.

Campos principais:

- `Número do pedido`
  Chave do pedido.

- `Data`
  Data da linha.

- `Situação`
  Situação operacional da linha/pedido.

- `ID produto`
  Identificador do produto.

- `Descrição`
  Descrição do item vendido.

- `Quantidade`
  Quantidade da linha.

- `Valor unitário`
  Preço unitário da linha.

- `Desconto do pedido (% ou valor)`
  Desconto do pedido informado na linha.
  Observação: costuma repetir o valor do pedido em várias linhas, então não deve ser somado diretamente como KPI sem regra de deduplicação.

- `Frete pedido`
  Frete do pedido.
  Observação: o frete é pago pelo cliente e não entra no CMV.

- `Desconto do pedido rateado`
  Rateio do desconto por linha.
  Uso correto: análises por item, não card comercial principal.

- `Frete pedido rateado`
  Rateio do frete por linha.

- `Código (SKU)`
  SKU do item.
  Uso correto: apoio para classificação de tipo e análises de catálogo.

Demais campos de cliente e entrega:

- `Nome do contato`, `Município`, `UF`, `Endereço`, `CEP`, `e-mail`, etc.
  Uso correto: dados operacionais e cadastrais. Não são KPIs do dashboard.

### 4. Meta Export.csv

Fonte principal de mídia paga da Meta.

Campos principais:

- `Dia`
  Data do dado de mídia.

- `Nome da campanha`
  Campanha.

- `Nome do conjunto de anúncios`
  Conjunto.

- `Nome do anúncio`
  Criativo/anúncio.

- `Nome da conta`
  Conta de anúncios.

- `Plataforma`
  Ex.: facebook, instagram.

- `Posicionamento`
  Feed, Reels etc.

- `Plataforma do dispositivo`
  mobile_app, desktop etc.

- `Veiculação do anúncio`
  Status do anúncio.

- `Alcance`
  Pessoas alcançadas.

- `Impressões`
  Total de impressões.

- `Cliques (todos)`
  Cliques totais.

- `Valor usado (BRL)`
  Investimento de mídia.
  Uso correto: ad spend.

- `Compras`
  Compras atribuídas pela Meta.

- `Valor de conversão da compra`
  Receita atribuída pela Meta.

- `Cliques no link`
  Cliques de saída para o site.

- `CTR (todos)`
  CTR geral.

- `CTR (taxa de cliques no link)`
  CTR de link.

- `Adições ao carrinho`
  Evento de funil.

Observação importante:

- este CSV é fonte de mídia, não de vendas reais;
- a sanitização deve continuar sendo decisão manual do operador.

### 5. feed_facebook.csv

Fonte de catálogo auxiliar.

Campos principais:

- `id`
  ID/SKU do item no feed.

- `title`
  Título do produto.

- `description`
  Descrição comercial.

- `image_link`
  Imagem.

- `link`
  URL do produto.

- `price`
  Preço cheio.

- `sale_price`
  Preço promocional.

- `brand`
  Marca.

- `color`, `gender`, `material`, `size`
  Atributos do produto.

Uso correto:

- enriquecer catálogo;
- ajudar na classificação dos tipos de peça;
- não substituir a venda real para KPI comercial.

## Régua comercial correta da INK

Para os cards de venda do dashboard, a régua correta é:

- `Vendas`
  quantidade de pedidos com `Status de Pagamento = Pago`

- `Itens Vendidos`
  soma de `Items no Pedido` dos pedidos pagos

- `Itens por venda`
  `Itens Vendidos / Vendas`

- `Faturado`
  soma de `Valor do Pedido` dos pedidos pagos

- `Ticket Médio`
  `Faturado / Vendas`

- `Lucro`
  soma de `Comissao` dos pedidos pagos

- `Lucro Médio`
  `Lucro / Itens Vendidos`

## Números encontrados no CSV consolidado

Usando `C:\Users\edebu\Downloads\Lista de Pedidos.csv` como fonte comercial consolidada:

- `Vendas`: `192`
- `Itens Vendidos`: `251`
- `Itens por venda`: `1,31`
- `Faturado`: `R$ 24.710,63`
- `Ticket Médio`: `R$ 128,70`
- `Lucro`: `R$ 11.359,69`
- `Lucro Médio`: `R$ 45,26`
- `Desconto total`: `R$ 1.829,17`
- `Desconto em pedidos com cupom preenchido`: `R$ 1.610,56`

## Comparação com o print da INK

Print esperado:

- `Vendas`: `192`
- `Ticket Médio`: `R$ 128,72`
- `Itens Vendidos`: `251`
- `Itens por venda`: `1,31`
- `Faturado`: `R$ 24.713,40`
- `Lucro`: `R$ 11.359,69`
- `Lucro Médio`: `R$ 45,26`
- `Desconto Cupom`: `R$ 1.410,58`

O que bate exatamente:

- `Vendas`
- `Itens Vendidos`
- `Itens por venda`
- `Lucro`
- `Lucro Médio`

O que fica muito próximo, mas não igual:

- `Faturado`
  CSV consolidado: `R$ 24.710,63`
  print INK: `R$ 24.713,40`
  diferença: `R$ 2,77`

- `Ticket Médio`
  CSV consolidado: `R$ 128,70`
  print INK: `R$ 128,72`
  diferença: `R$ 0,02`

O que não é reproduzível com segurança só pelos CSVs atuais:

- `Desconto Cupom`
  O CSV traz `Valor do Desconto` e `Nome do Cupom`, mas isso não reproduz automaticamente os `R$ 1.410,58` do print.
  Valores observados:
  - desconto total: `R$ 1.829,17`
  - desconto em pedidos com cupom preenchido: `R$ 1.610,56`

## Conclusões operacionais

- A fonte correta dos cards comerciais é `Lista de Pedidos.csv`.
- `Lista de Itens.csv` deve ser usada para CMV, mix, peças reais e conciliação por item.
- `Pedidos Pagos.csv` é fonte de apoio operacional e rateios, não a melhor fonte primária do dashboard comercial.
- `Meta Export.csv` não deve contaminar os cards comerciais da INK.
- O dashboard do BrandOps deve separar claramente:
  - camada comercial da INK
  - camada financeira gerencial do BrandOps

## Recomendações de sistema

- Importação incremental da INK deve ser idempotente por `Pedido`.
- Janelas de exportação sobrepostas devem atualizar pedidos existentes e inserir apenas novos.
- Os cards comerciais devem preferir `Items no Pedido` para o total de itens da INK.
- O card de desconto não deve prometer `Desconto Cupom` enquanto a regra exata não estiver reproduzível pelos arquivos.
