# BrandOps - Handoff Atual

## Objetivo do sistema

`BrandOps` e um software operacional multi-marca para operacao, leitura gerencial e tomada de decisao em lojas `print on demand`.

Hoje o sistema atende, principalmente:

- `Oh My Dog`
- `Bateu o Pace`

O modelo de acesso e:

- `SUPER_ADMIN` enxerga todas as marcas
- membros da marca enxergam apenas a propria operacao

## Fontes de dados do sistema

### INK / INCI

Origem manual por `CSV`.

Arquivos principais:

- `Lista de Pedidos.csv`
- `Lista de Itens.csv`
- `Pedidos Pagos.csv`

Uso correto:

- `Lista de Pedidos.csv`: camada comercial da INK
- `Lista de Itens.csv`: pecas reais, detalhe de itens e aplicacao de `CMV`
- `Pedidos Pagos.csv`: apoio operacional e rateios

### Meta

Hoje o sistema suporta:

- upload manual por `CSV`
- arquitetura pronta para evolucao por `API`

Arquivo principal:

- `Meta Export.csv`

### GA4

Ja existe integracao inicial por `API` no backend para marcas habilitadas.

Estado atual:

- `Oh My Dog`: `GA4` habilitado por `API`
- `Bateu o Pace`: `GA4` desabilitado

Property ID configurado da OMD:

- `506034252`

### Feed de produtos

Arquivo principal:

- `feed_facebook.csv`

Uso:

- catalogo visual
- apoio para classificacao de tipo
- base para `Feed de Produtos`

## Regras de negocio canonicas

### Camada comercial da INK

Fonte de verdade:

- `Lista de Pedidos.csv`

Cards comerciais corretos:

- `Vendas`: pedidos com `Status de Pagamento = Pago`
- `Itens Vendidos`: soma de `Items no Pedido`
- `Itens por venda`: `Itens Vendidos / Vendas`
- `Faturado`: soma de `Valor do Pedido`
- `Ticket Medio`: `Faturado / Vendas`
- `Lucro INK`: soma de `Comissao`
- `Lucro Medio`: `Lucro INK / Itens Vendidos`
- `Descontos Totais`: soma de `Valor do Desconto`
- `Desconto via Cupom`: soma de `Valor do Desconto` quando `Nome do Cupom` estiver preenchido

### Camada gerencial do BrandOps

Formulas canonicas:

- `RLD = Receita Bruta - Desconto`
- `CMV = soma de cmv_total_applied`
- `Margem Bruta = RLD - CMV`
- `Margem de Contribuicao = RLD - CMV - Gasto Ads`
- `Resultado = Margem de Contribuicao - Despesas Fixas`

### CMV

O `CMV` e historico e aplicado por item vendido.

Regras:

- custo por tipo de peca
- vigencia por data
- mudanca em `01/03/2026`
- custo aplicado no item vendido nao deve mudar retroativamente sem backfill explicito

### Saneamento

O sistema detecta divergencias da `Meta`, mas a decisao e do operador.

Fluxo esperado:

- identificar divergencia
- justificar
- `ignorar calculo` ou `manter calculo`
- manter historico auditavel

Observacao importante:

- existe backlog aberto para revisar a persistencia perene do historico de saneamento apos reimportacoes

## O que ja foi implementado

### Base e autenticacao

- autenticacao real com `Supabase`
- multi-marca
- selecao de marca para `SUPER_ADMIN`
- fluxo de criacao de usuarios com senha
- convite por email nao e mais obrigatorio

### Operacao e leitura

- `Torre de Controle`
- `Vendas`
- `Midia`
- `DRE`
- `Despesas`
- `CMV`
- `Importacao`
- `Saneamento`

### GA4

- configuracao por loja
- sync inicial no backend
- tabela de persistencia diaria no banco
- painel de `Trafego`
- painel de `Insights de Produtos`

### Catalogo

- `Feed de Produtos`

### Admin e operacao de plataforma

- `Lojas e Pessoas`
- `Integracoes`
- `Ajuda`

## Estado atual das integracoes por loja

### Oh My Dog

- `INK`: `manual_csv`
- `Meta`: estrutura pronta para `api` com fallback manual
- `GA4`: `api`

### Bateu o Pace

- `INK`: `manual_csv`
- `Meta`: estrutura pronta para `manual_csv` ou `api`
- `GA4`: `disabled`

## Estrutura tecnica importante

Arquivos e areas principais:

- [app](C:\Users\edebu\.codex\worktrees\af6d\BrandOps-new\app)
- [components](C:\Users\edebu\.codex\worktrees\af6d\BrandOps-new\components)
- [lib/brandops](C:\Users\edebu\.codex\worktrees\af6d\BrandOps-new\lib\brandops)
- [lib/integrations](C:\Users\edebu\.codex\worktrees\af6d\BrandOps-new\lib\integrations)
- [supabase/migrations](C:\Users\edebu\.codex\worktrees\af6d\BrandOps-new\supabase\migrations)

Arquivos de referencia importantes:

- [ESTADO_OFICIAL_BRANDOPS.md](C:\Users\edebu\.codex\worktrees\af6d\BrandOps-new\docs\ESTADO_OFICIAL_BRANDOPS.md)
- [README_DRE_CMV_METRICAS_OMD.md](C:\Users\edebu\.codex\worktrees\af6d\BrandOps-new\README_DRE_CMV_METRICAS_OMD.md)
- [AUDITORIA_CSV_OMD_E_REGUA_COMERCIAL.md](C:\Users\edebu\.codex\worktrees\af6d\BrandOps-new\docs\AUDITORIA_CSV_OMD_E_REGUA_COMERCIAL.md)
- [BACKLOG_NAVEGACAO_E_AREAS_ANALITICAS.md](C:\Users\edebu\.codex\worktrees\af6d\BrandOps-new\docs\BACKLOG_NAVEGACAO_E_AREAS_ANALITICAS.md)
- [DEPLOY_VERCEL.md](C:\Users\edebu\.codex\worktrees\af6d\BrandOps-new\docs\DEPLOY_VERCEL.md)

## Skills proprias criadas para continuidade

Skills locais criadas fora do repositorio:

- `brandops-finance`
- `brandops-import-audit`
- `brandops-integrations`

Uso recomendado:

- `brandops-finance` para DRE, CMV, margem, ponto de equilibrio e regras de negocio
- `brandops-import-audit` para conciliacao entre CSV, banco e dashboard
- `brandops-integrations` para GA4, Meta, fallback manual e configuracao por loja

## Proximos passos recomendados

### Prioridade alta

- reconstruir a `Torre de Controle` como painel de tomada de decisao factual
- revisar `Ponto de Equilibrio`, porque ha sinais de formula ou criterio inadequado em periodos curtos
- revisar persistencia perene do historico de saneamento
- evoluir `Meta Ads` para modo `API` com fallback manual real
- refinar navegacao agrupando melhor areas de `Meta`, `GA4`, operacao e catalogo

### Prioridade media

- fechar a revisao de proporcao interna e distribuicao visual das telas principais
- melhorar `Feed de Produtos` com agrupamento por categoria e grupo
- enriquecer mockups e imagens adicionais
- transformar `Ajuda` em experiencia por abas
- padronizar local e comportamento das abas entre telas

### Prioridade baixa

- refinamentos extras de design nas areas analiticas

## O que saiu do projeto

Foi descontinuado e removido:

- `Atlas` como agente conversacional
- integracao `Gemini`
- canvas, orb e superficies cognitivas ligadas ao experimento de IA no front

O produto segue com objetivo de inteligencia operacional, mas a proxima fase sera baseada em regras, historico e consolidacao factual.

## Diretriz de Git daqui para frente

Fluxo recomendado:

- `main` como branch estavel
- novas implementacoes em branches `codex/*`
- merge para `main` apenas depois de validacao

## Como retomar em outra IDE

Se este projeto for aberto em outra IDE ou agente:

1. ler este arquivo
2. ler [ESTADO_OFICIAL_BRANDOPS.md](C:\Users\edebu\.codex\worktrees\af6d\BrandOps-new\docs\ESTADO_OFICIAL_BRANDOPS.md)
3. ler [README_DRE_CMV_METRICAS_OMD.md](C:\Users\edebu\.codex\worktrees\af6d\BrandOps-new\README_DRE_CMV_METRICAS_OMD.md)
4. ler [AUDITORIA_CSV_OMD_E_REGUA_COMERCIAL.md](C:\Users\edebu\.codex\worktrees\af6d\BrandOps-new\docs\AUDITORIA_CSV_OMD_E_REGUA_COMERCIAL.md)
5. ler [BACKLOG_NAVEGACAO_E_AREAS_ANALITICAS.md](C:\Users\edebu\.codex\worktrees\af6d\BrandOps-new\docs\BACKLOG_NAVEGACAO_E_AREAS_ANALITICAS.md)
6. validar as variaveis da `Vercel`
7. verificar o status do `Supabase` e das migrations mais recentes

## Criterio de leitura correta

Se houver conflito entre UI, CSV e dashboard:

- primeiro confirmar a fonte correta da metrica
- depois confirmar a regra de negocio
- so entao corrigir a apresentacao

Esse ponto e essencial para nao misturar camada comercial da `INK` com camada gerencial do `BrandOps`.
