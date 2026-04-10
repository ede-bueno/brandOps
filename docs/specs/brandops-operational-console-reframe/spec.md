# Spec: BrandOps Operational Console Reframe

## 1. Contexto

O BrandOps cresceu rápido em cima de várias frentes analíticas, operacionais e de IA.

Ao longo da evolução, muitas telas passaram a herdar o mesmo padrão de:

- cards
- KPIs
- blocos narrativos
- resumos executivos

Isso deixou o sistema visualmente consistente em alguns pontos, mas conceitualmente errado em outros: quase tudo passou a parecer dashboard.

O Atlas continua importante, mas como agente de IA dentro do produto, não como identidade central de toda tela.

## 2. Problema

Hoje o sistema transmite a sensação de "grande dashboard" em vez de software operacional.

Consequências:

- novos usuários não sabem por onde começar
- áreas de operação parecem painéis executivos
- a leitura e a edição competem na mesma superfície
- KPIs e cards aparecem mesmo quando uma tabela ou fila resolveria melhor
- a identidade do produto está confusa entre `BrandOps` e `Atlas`

## 3. Objetivo

Refatorar a arquitetura de informação e a linguagem de interface do produto para que:

- o software volte a se apresentar como `BrandOps`
- o `Atlas` passe a ser explicitamente a camada/agente de IA
- a `Torre de Controle` concentre a experiência de dashboard
- as demais áreas virem workspaces operacionais, claros e previsíveis
- o usuário entenda rapidamente onde está, o que está vendo e qual é o próximo clique

## 4. Escopo

### Inclui

- redefinir a identidade de produto para `BrandOps`
- posicionar `Atlas` como agente de IA dentro do sistema
- substituir o padrão "dashboard em toda tela" por floorplans operacionais
- reorganizar shell, navegação, headers e workspaces
- criar padrões canônicos para:
  - dashboard hub
  - list report
  - worklist
  - split view / inspector
  - object workspace
- remapear as principais rotas para esses padrões
- reduzir uso indiscriminado de KPIs, callouts e cards
- consolidar uma direção visual baseada em `Material 3` + `shadcn/ui`, sem seguir Carbon

### Não inclui

- reescrita dos cálculos financeiros
- alteração da lógica canônica de DRE, CMV e mídia
- implementação da nova camada de criação/social
- automação autônoma de agentes
- mudança de backend só por motivo estético

## 5. Usuários impactados

- superadmin da plataforma
- gestor da marca
- operador financeiro
- operador de mídia
- operador de importação/saneamento
- usuários novos em onboarding

## 6. Fluxo esperado

1. usuário entra no BrandOps
2. entende rapidamente a marca ativa e o recorte ativo no shell global
3. começa na Torre de Controle quando quer panorama
4. desce para uma área operacional específica quando quer agir
5. opera com tabela, filtros, fila, detalhe contextual ou edição, sem competir com uma parede de cards
6. usa o Atlas como agente de IA contextual, e não como protagonista visual da aplicação inteira

## 7. Requisitos funcionais

- a aplicação deve se chamar `BrandOps`
- o Atlas deve permanecer como agente/camada de IA
- a `Torre de Controle` deve ser o dashboard principal do sistema
- módulos operacionais não devem depender de KPIs e cards como estrutura base
- headers locais devem ser compactos e utilitários
- contexto de marca e período deve ficar concentrado no shell global
- telas de dados devem priorizar tabela, lista, filtros e inspeção contextual
- áreas de configuração devem usar object workspace em vez de dashboard
- o sistema deve deixar claro o que é:
  - monitoramento
  - operação
  - configuração
  - IA/contexto

## 8. Requisitos não funcionais

- não usar IBM Carbon como direção visual de referência
- usar `Material 3` como referência de interação e composição
- usar `shadcn/ui` como base de primitives e implementação
- manter light e dark mode consistentes
- reduzir densidade cognitiva
- preservar responsividade e acessibilidade
- preservar backend e contratos existentes sempre que possível

## 9. Critérios de aceite

- um usuário novo entende por onde começar em poucos segundos
- só a Torre de Controle e resumos específicos se comportam como dashboard
- telas operacionais parecem software de trabalho, não painel executivo
- o nome do produto aparece como `BrandOps`
- o Atlas aparece como agente de IA, sem engolir a identidade do produto
- a navegação entre marca, leitura e operação fica mais previsível
- a primeira dobra das telas deixa claro qual é a prioridade da área

## 10. Riscos e dependências

- é uma refatoração ampla de front-end, com impacto em quase todas as rotas
- existe risco de regressão visual se os floorplans não forem consolidados como primitives
- copiar Material ou qualquer referência de forma literal pode gerar nova inconsistência
- é preciso controlar escopo para não misturar redesign estrutural com novas features
