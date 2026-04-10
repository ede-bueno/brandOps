# Estado Oficial do BrandOps

## Objetivo

Este documento e a referencia principal para entender o estado atual do `BrandOps`.

Ele substitui a necessidade de montar contexto a partir de handoffs antigos, specs removidas ou rastros do experimento de `Atlas IA`.

## Escopo atual do produto

O `BrandOps` e um software operacional multi-marca para negocios `print on demand`.

O foco atual do sistema e:

- consolidar dados comerciais e gerenciais por marca
- transformar importacao e integracao em base auditavel
- apoiar leitura financeira, comercial e de aquisicao
- servir como console operacional, e nao como dashboard inflado
- preparar uma futura torre de decisao baseada em regras, historico e sinais factuais

## O que existe hoje

### Base do sistema

- autenticacao real com `Supabase`
- workspace multi-marca com `SUPER_ADMIN`
- selecao de marca e isolamento por operacao
- shell administrativo unificado com modo `dark` e `white`

### Modulos operacionais ja ativos

- `Torre de Controle`
- `DRE Mensal`
- `Receita e Vendas`
- `Livro de Lancamentos`
- `Custos e CMV`
- `Midia e Performance`
- `Trafego Digital`
- `Produtos e Insights`
- `Catalogo`
- `ETL e Importacao`
- `Saneamento`
- `Integracoes`
- `Acessos`, `Ajuda` e administracao de lojas

### Integracoes suportadas

Fontes validas no estado atual:

- `INK` por `CSV`
- `Meta` por `CSV` e base pronta para evolucao por `API`
- `GA4` por `API` quando habilitado por marca

O experimento com `Gemini` e o modulo do `Atlas` como agente conversacional foram descontinuados e removidos do produto.

## Regras de negocio prioritarias

As leituras do sistema devem respeitar estas fontes de verdade:

- camada comercial: `Lista de Pedidos.csv`
- pecas reais e `CMV`: `Lista de Itens.csv`
- apoio operacional: `Pedidos Pagos.csv`
- comportamento de produto: `GA4`
- midia paga: `Meta`

Formulas gerenciais canonicas:

- `RLD = Receita Bruta - Desconto`
- `CMV = soma de cmv_total_applied`
- `Margem Bruta = RLD - CMV`
- `Margem de Contribuicao = RLD - CMV - Gasto Ads`
- `Resultado = Margem de Contribuicao - Despesas Fixas`

Se houver conflito entre UI, CSV, API e dashboard:

1. confirmar a fonte correta da metrica
2. confirmar a regra de negocio
3. corrigir a apresentacao depois

## O que foi removido nesta consolidacao

Foi retirado do projeto:

- rotas, componentes e APIs do `Atlas` conversacional
- dependencias ligadas a `Gemini`, `tldraw`, `three` e renderizacao de orb/canvas
- specs e documentos que descreviam a antiga frente de IA conversacional
- flags, tabelas e migrations do experimento de agente

O projeto segue com inteligencia de negocio como objetivo, mas a implementacao futura sera factual e deterministica, nao um chat de IA acoplado ao produto.

## Documentacao canonica

Leia nesta ordem:

1. este arquivo
2. [README.md](C:\Users\edebu\.codex\worktrees\af6d\BrandOps-new\README.md)
3. [BRANDOPS_HANDOFF_ATUAL.md](C:\Users\edebu\.codex\worktrees\af6d\BrandOps-new\docs\BRANDOPS_HANDOFF_ATUAL.md)
4. [PRODUCT_DECISION_ENGINE.md](C:\Users\edebu\.codex\worktrees\af6d\BrandOps-new\docs\PRODUCT_DECISION_ENGINE.md)
5. [BACKLOG_NAVEGACAO_E_AREAS_ANALITICAS.md](C:\Users\edebu\.codex\worktrees\af6d\BrandOps-new\docs\BACKLOG_NAVEGACAO_E_AREAS_ANALITICAS.md)
6. [RUNBOOK_MIGRATIONS_REMOTAS.md](C:\Users\edebu\.codex\worktrees\af6d\BrandOps-new\docs\RUNBOOK_MIGRATIONS_REMOTAS.md)

## Specs ativas

As frentes que continuam validas no repositorio sao:

- `brandops-internal-layout-proportion-review`
- `brandops-saas-oauth-integrations`
- `brandops-self-serve-oauth-integrations`

Arquivo de apoio para replanejamento da operacao:

- [floorplan-map.md](C:\Users\edebu\.codex\worktrees\af6d\BrandOps-new\docs\specs\brandops-operational-console-reframe\floorplan-map.md)

## Backlog consolidado

### Prioridade imediata

- reconstruir a `Torre de Controle` como painel de tomada de decisao factual
- revisar a distribuicao interna e proporcao dos componentes nas telas principais
- estabilizar persistencia do historico de saneamento
- consolidar leitura de `Meta` com fallback manual e trilha pronta para `API`

### Prioridade seguinte

- implementar integracoes `OAuth` para modelo SaaS self-serve
- evoluir o motor de decisao de produto e midia
- refinar navegacao e arquitetura por dominio operacional

## Arquivos historicos

Os arquivos abaixo devem ser tratados como registro historico, e nao como fonte atual de produto:

- `ANTI_GRAVITY_HANDOFF.md`
- `TRANSITION_GUIDE_CODEX.md`
- `PLANO_CORRECAO_FORENSE_BRANDOPS.md`

## Estado de confianca

O repositorio ja esta sem o modulo antigo de `Atlas IA` e pronto para seguir em uma nova fase de produto.

O estado oficial atual e:

- software operacional ativo
- documentacao consolidada
- base tecnica limpa para retomada da `Torre de Controle`
