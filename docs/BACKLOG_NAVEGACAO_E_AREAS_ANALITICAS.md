# Backlog Interno - Navegacao e Areas Analiticas

## Contexto

Com a expansao do `BrandOps`, a sidebar comecou a concentrar muitas entradas de natureza diferente:

- operacao financeira
- importacao e saneamento
- analytics de `Meta Ads`
- analytics de `GA4`
- catalogo
- administracao

A navegacao atual ainda funciona, mas ja existe oportunidade clara de melhorar:

- agrupamento mental das funcionalidades
- reducao de ruido visual na sidebar
- escalabilidade para novas integracoes e dashboards
- clareza sobre a origem de cada dado

## Objetivo da futura refatoracao

Reorganizar a arquitetura de navegacao sem quebrar o sistema atual, deixando explicito:

- o que e operacao interna
- o que e dado comercial da INK
- o que e dado de `Meta Ads`
- o que e dado de `GA4`
- o que e catalogo/produto
- o que e configuracao/admin

## Direcao recomendada

### 1. Estruturar a sidebar por dominios

Proposta inicial:

- `Operacao`
  - Dashboard
  - Vendas
  - DRE
  - Despesas
  - CMV
  - Importacao
  - Saneamento

- `Aquisição`
  - Midia
  - Trafego
  - Insights de Produtos

- `Catalogo`
  - Feed de Produtos

- `Admin`
  - Lojas e Pessoas
  - Integracoes
  - Ajuda

### 2. Reduzir itens soltos na sidebar

Avaliar transformar partes da navegacao em areas com abas internas:

- `Aquisição`
  - aba `Meta`
  - aba `GA4`
  - aba `Produtos`

ou

- `Analytics`
  - aba `Midia`
  - aba `Trafego`
  - aba `Insights`

### 3. Explicitar a origem do dado

Cada area analitica deve indicar com clareza a origem principal:

- `INK / CSV`
- `Meta Ads`
- `GA4`
- `Feed de Produtos`

Isso ajuda a reduzir confusao quando numeros de fontes diferentes coexistem no sistema.

### 4. Estrategia de midia por fonte

Para `Meta Ads`, a direcao recomendada e trabalhar com uma area unica de `Midia`, mas com modos diferentes de visualizacao conforme a origem do dado:

- `Modo CSV`
- `Modo API`

Regras sugeridas:

- se a loja estiver em `manual_csv`, a tela mostra a versao baseada no CSV
- se a loja estiver em `api`, a tela mostra a versao enriquecida com dados da API
- se a `API` falhar e existir base manual consolidada, a tela pode exibir fallback manual com aviso claro
- a UI deve indicar sempre qual e a fonte ativa do dado

Beneficios dessa abordagem:

- evita duplicacao de paginas
- reduz manutencao paralela
- permite fallback sem quebrar o fluxo
- abre espaco para metricas mais ricas quando a API estiver ativa

## Backlog sugerido

### Epic 1 - Arquitetura de informacao

- mapear todas as telas por dominio funcional
- definir o agrupamento final da sidebar
- definir quais telas viram paginas e quais viram abas internas
- revisar nomenclatura das secoes para refletir melhor negocio e origem do dado

### Epic 2 - Refatoracao da sidebar

- reduzir o numero de links simultaneos visiveis
- manter acesso rapido sem esconder funcoes criticas
- preservar comportamento do superadmin e de usuarios por marca
- garantir responsividade e usabilidade no modo colapsado
- padronizar o posicionamento de abas e controles de navegacao secundaria entre telas
- revisar a tela de `Ajuda` para separar conteudo em abas, reduzindo rolagem e mantendo consistencia com outras areas

### Epic 3 - Areas analiticas

- consolidar `Meta Ads` em uma area propria
- consolidar `GA4` em uma area propria
- avaliar pagina unificada de `Aquisição`
- reorganizar cards, subtelas e tabelas para leitura por contexto
- desenhar a tela unica de `Midia` com `modo CSV` e `modo API`
- preparar fallback operacional quando a API nao estiver disponivel

### Epic 4 - Escalabilidade futura

- preparar a navegacao para futuras integracoes
- evitar crescimento linear da sidebar
- permitir expansao com minimo retrabalho estrutural

### Epic 5 - Saneamento e memoria operacional

- revisar a persistencia real das decisoes de saneamento apos reimportacoes
- manter historico perene de itens `ignorados` e `mantidos`, com data e justificativa
- permitir reversao de decisao sem perder rastreabilidade
- garantir que o painel continue mostrando o historico mesmo quando o mesmo CSV for importado novamente
- validar a chave correta de reidentificacao da ocorrencia, usando `pedido`, `ocorrencia` ou outra combinacao estavel

### Epic 6 - Conciliacao entre trafego e venda real

- revisar as metricas de `purchase` no `GA4`
- validar se o `transaction_id` recebido do ecommerce corresponde aos pedidos da `INK`
- comparar vendas do `GA4` com vendas reais da `INK` por periodo
- identificar se a divergencia e de instrumentacao, atribuicao, janela ou deduplicacao
- manter a `INK` como fonte principal de venda real quando houver conflito
- avaliar uma camada de conciliacao para exibir diferenca entre `venda rastreada` e `venda operacional`

## Criterios de sucesso

- a sidebar fica mais curta e mais clara
- o usuario entende rapidamente onde cada tipo de dado esta
- `Meta`, `GA4`, operacao e admin deixam de parecer blocos misturados
- novas features de analytics podem entrar sem poluir a navegacao principal

## Cuidados

- nao quebrar rotas existentes sem redirecionamento
- nao esconder acessos importantes para operacao diaria
- nao misturar em uma mesma tela metricas de fontes diferentes sem identificacao clara
- preservar consistencia com o contexto multi-marca
- nao perder memoria operacional do saneamento a cada nova importacao

## Regra de execucao futura

Quando essa frente comecar, a implementacao deve acontecer em branch dedicada com prefixo `codex/`, sem alterar diretamente a `main`.

Exemplo de branch sugerida:

- `codex/meta-media-source-modes`

## Estado

Item registrado para revisita futura.
Ainda nao implementado.
