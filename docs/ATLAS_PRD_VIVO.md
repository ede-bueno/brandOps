# BrandOps PRD Vivo

Data de referência: 2026-04-09
Status: vivo
Responsável atual: produto + engenharia

## 1. Objetivo do documento

Este PRD vivo existe para consolidar, em uma única fonte de verdade, o que o Atlas já é hoje, o que já está funcional no produto e quais são as próximas camadas prioritárias.

Ele deve servir como base para um fluxo de desenvolvimento orientado por especificação:

1. `constitution`
2. `spec`
3. `plan`
4. `tasks`
5. `implementação`

Este documento não substitui specs por feature. Ele é o mapa-mãe do sistema.

## 2. Resumo executivo

O BrandOps é uma plataforma SaaS de operação e inteligência multi-marca para negócios de print on demand e e-commerce com forte dependência de mídia paga, catálogo, DRE gerencial e leitura operacional.

O Atlas deixa de ser o nome da aplicação e passa a ser a camada/agente de IA do produto.

Hoje o produto já cobre:

- autenticação real e acesso multi-marca
- workspace logado por marca
- camadas analíticas de controle, financeiro, aquisição e operação
- integrações por loja com Meta, GA4 e Gemini
- importação incremental e deduplicada de bases CSV
- saneamento persistente de mídia e pedidos
- DRE gerencial com camada canônica
- Torre de Controle com Atlas IA em modo read-only
- governança inicial SaaS com planos e feature flags por marca

## 3. Visão do produto

O BrandOps deve se tornar um software operacional que une:

- leitura de resultado
- priorização executiva
- operação do negócio
- inteligência aplicada por marca via Atlas
- futura automação assistida por IA

A ambição do produto é sair de um painel analítico inflado e evoluir para um software operacional claro, com um bom dashboard central e telas dedicadas de trabalho, sem perder confiabilidade financeira e operacional.

## 3.1 Sequência estratégica recomendada

Para evitar retrabalho e mistura de frentes incompatíveis na mesma entrega, a evolução do Atlas deve seguir esta ordem:

1. reframar o produto como software operacional e não como mosaico de dashboards
2. fechar o polimento visual e a consistência do sistema nessa nova arquitetura
3. aprofundar a decisão operacional por anúncio e criativo
4. redesenhar a futura camada de criação/social antes de qualquer implementação nova
5. só então expandir para agentes operacionais por marca

Essa ordem protege:

- a clareza da navegação
- a auditabilidade das decisões
- a capacidade do Atlas de narrar sem inventar
- a separação entre BrandOps como produto e Atlas como agente de IA

## 4. Problema que o Atlas resolve

Marcas digitais que operam em POD e e-commerce costumam ter quatro problemas centrais:

- fontes de dados quebradas ou desconectadas
- leitura financeira inconsistente entre comercial e gerencial
- dificuldade de identificar o próximo clique realmente importante
- muita dependência de interpretação manual para mídia, catálogo e operação

O BrandOps resolve isso ao centralizar:

- base de dados
- integração por loja
- leitura executiva
- contexto de negócio
- inteligência assistida

## 5. Perfis de usuário

### 5.1 Superadmin da plataforma

Responsável por:

- governança SaaS
- liberação de feature flags
- controle de planos
- revisão de lojas
- estabilidade operacional da plataforma

### 5.2 Operador da marca

Responsável por:

- importar dados
- saneamento
- revisar DRE
- acompanhar mídia, tráfego e catálogo
- usar a Torre para priorização

### 5.3 Gestor da marca

Responsável por:

- interpretar performance
- decidir próximos passos
- acompanhar resultado financeiro
- usar Atlas IA como apoio de leitura

### 5.4 Futuro administrador de grupo

Papel previsto para:

- gerir múltiplas marcas de um mesmo grupo
- controlar permissões e limites no próprio escopo

## 6. Princípios de produto

- o backend é a fonte de verdade dos números
- configuração técnica não pode disputar espaço com leitura executiva
- gráfico largo vence card narrativo
- contexto operacional deve ficar no header global, não repetido localmente
- BrandOps é o produto; Atlas é o agente de IA dentro do produto
- IA recomenda, humano decide e executa
- cada marca deve operar com suas próprias credenciais
- governança SaaS precisa ser orientada a banco, não a hardcode
- só a Torre de Controle e resumos executivos devem se comportar como dashboard
- telas operacionais devem priorizar listas, tabelas, filtros, split view e edição contextual

## 6.1 Arquitetura visual e floorplans

O BrandOps agora segue uma arquitetura de floorplans, para impedir que toda tela vire dashboard:

- `dashboard hub` para a Torre de Controle e resumos realmente executivos
- `list report` para matrizes, rankings, históricos e comparações
- `worklist` para operação de filas, lançamentos, importação e saneamento
- `split workspace` para leitura principal com rail lateral de decisão
- `object workspace` para integrações, plataforma e administração multi-marca
- `guided content` para ajuda e tutoriais
- `holding page` apenas para frentes pausadas ou em replanejamento

Mapa detalhado por rota:

- [floorplan-map.md](/C:/BrandOps/BrandOps-new/docs/specs/brandops-operational-console-reframe/floorplan-map.md)

## 7. Domínios do produto

O Atlas está organizado em quatro domínios principais.

### 7.1 Controle

Objetivo:

- abrir a leitura executiva da marca
- apontar o próximo clique
- resumir saúde financeira, base e aquisição

Rotas:

- `/dashboard`
- `/dashboard/contribution-margin`

Capacidades atuais:

- Torre de Controle com KPIs executivos
- priorização do período
- saúde do recorte
- leitura comercial
- economia unitária
- livro de despesas
- fila de alertas
- Atlas IA com `Mesa` e `Radar`

### 7.2 Financeiro

Objetivo:

- dar a leitura gerencial confiável da marca
- suportar revisão de margem, DRE, despesa e CMV

Rotas:

- `/dre`
- `/cmv`
- `/cost-center`
- `/sales`

Capacidades atuais:

- DRE consolidado
- margem histórica
- lançamentos e revisão de despesas
- CMV por vigência histórica
- leitura comercial complementar

### 7.3 Aquisição

Objetivo:

- explicar aquisição, mídia e catálogo com impacto sobre resultado

Rotas:

- `/media`
- `/traffic`
- `/product-insights`

Capacidades atuais:

- leitura de mídia e performance
- leitura de tráfego digital
- leitura de produtos e insights
- gráficos, tabelas e síntese executiva por domínio

Próxima camada prioritária:

- decisão por anúncio e criativo na área de mídia

### 7.4 Operação

Objetivo:

- sustentar a base operacional do sistema

Rotas:

- `/feed`
- `/import`
- `/sanitization`

Capacidades atuais:

- catálogo operacional
- importação incremental
- deduplicação por chave de negócio
- saneamento persistente

### 7.5 Plataforma

Objetivo:

- configurar a plataforma, as integrações e a inteligência

Rotas:

- `/integrations`
- `/integrations/tutorials`
- `/settings`
- `/help`
- `/admin/stores`

Capacidades atuais:

- integrações por marca
- tutoriais operacionais
- central estratégica do Atlas
- ajuda por área
- administração de lojas e governança SaaS

## 7.6 Estado atual do reframe operacional

O reframe atual já consolidou:

- `BrandOps` como nome do produto
- `Atlas` como agente de IA contextual
- redução do padrão de mosaico de KPI fora da Torre de Controle
- floorplans compartilhados aplicados nos domínios `Controle`, `Financeiro`, `Aquisição`, `Operação` e `Plataforma`
- abandono da primitive legada `AnalyticsKpiCard` nas páginas do app, substituída por faixas métricas operacionais e layouts de workspace

## 8. Capacidades atuais por módulo

### 8.1 Autenticação e contexto

O sistema já possui:

- autenticação real com Supabase
- contexto multi-marca
- papéis iniciais de plataforma
- isolamento por marca no workspace

### 8.2 Importação e base operacional

O sistema já importa de forma incremental:

- `Lista de Pedidos.csv`
- `Lista de Itens.csv`
- `Pedidos Pagos.csv`
- `Meta Export.csv`
- `feed_facebook.csv`

Também já possui:

- deduplicação por chave de negócio
- reimportação por janela
- suporte a persistência operacional da base

### 8.3 Saneamento

O sistema já possui:

- saneamento persistente de mídia
- saneamento persistente de pedidos fora da curva
- contagem de pendências na Torre
- impacto explícito do saneamento na leitura do recorte

### 8.4 Financeiro e camada canônica

## 9. Próximas fases macro do produto

### 9.1 Fase 1: Ads Creative Ops

Objetivo:

- sair da visão por campanha e entrar na decisão por anúncio e criativo

Entrega esperada:

- motor determinístico por anúncio
- priorização de anúncios e criativos
- nova trilha operacional de ads dentro de mídia

Spec de referência:

- [atlas-ads-creative-ops-phase-1/spec.md](/C:/BrandOps/BrandOps-new/docs/specs/atlas-ads-creative-ops-phase-1/spec.md)

Status atual:

- leitura operacional por anúncio entregue
- trilha `Anúncios` dentro de mídia entregue
- motor determinístico por anúncio entregue
- enriquecimento por `campaign_id`, `adset_id`, `ad_id`, `creative_id` e `creative_name` preparado com fallback compatível ao schema antigo

### 9.2 Fase 2: Criação e operação social

Objetivo:

- transformar insight em tarefa criativa com aprovação humana

Entrega esperada:

- fila de tarefas criativas
- draft de conteúdo
- aprovação humana
- publicação instantânea ou agendada

Spec de referência:

- [atlas-creative-social-ops-phase-2/spec.md](/C:/BrandOps/BrandOps-new/docs/specs/atlas-creative-social-ops-phase-2/spec.md)

### 9.3 Fase 3: Agentes operacionais por marca

Objetivo:

- permitir automações assistidas por contexto e governança

Entrega esperada:

- agentes por marca
- criação de tarefas a partir de sinais do Atlas
- execução controlada com aprovação humana

O Atlas já possui:

- DRE gerencial
- leitura financeira consolidada
- CMV histórico
- margem de contribuição
- cálculo canônico no backend
- avanço relevante na correção de semântica financeira

Pontos sensíveis ainda em evolução:

- migração total da superfície para a camada canônica
- blindagem completa contra concorrência entre cálculo local e backend

### 8.5 Torre de Controle

A Torre já oferece:

- primeira dobra executiva
- priorização do período
- alertas estruturais
- KPIs financeiros e operacionais
- saúde do recorte
- links rápidos para o próximo aprofundamento

### 8.6 Atlas IA

O Atlas IA já oferece:

- `Atlas Analyst` por marca
- credencial Gemini por loja
- skill padrão configurável
- janela de análise configurável
- memória curta
- feedback da resposta
- aprendizagem do negócio
- separação entre leitura factual e leitura do agente

Restrições atuais:

- modo read-only
- sem execução operacional autônoma
- sem function calling profundo

### 8.7 Integrações por marca

Integrações atuais:

- Meta
- GA4
- Gemini
- INK/manual como origem comercial

Capacidades atuais:

- segredos por loja
- configuração separada por marca
- cron global por marca e conector
- resumo de saúde do conector
- tutoriais por provedor

### 8.8 Configurações estratégicas

A área de Configurações já oferece:

- modelo do Atlas
- temperatura
- skill padrão
- janela de análise
- guia operacional da marca
- aprendizagem do negócio

### 8.9 Governança SaaS

Já existe no produto:

- planos por marca
- feature flags
- gestão visual de governança em `Admin > Lojas`

Flags já modeladas:

- `atlasAi`
- `atlasCommandCenter`
- `brandLearning`
- `geminiModelCatalog`

## 9. Fluxos principais do sistema

### 9.1 Fluxo de ativação de marca

1. selecionar a marca
2. validar plano e flags
3. configurar integrações
4. importar base inicial ou sincronizar
5. revisar saneamento
6. abrir Torre e leituras analíticas

### 9.2 Fluxo de leitura executiva

1. abrir `Torre de Controle`
2. validar saúde do recorte
3. abrir sinal dominante
4. aprofundar em `DRE`, `Mídia`, `Tráfego` ou `Produtos`
5. voltar à Torre para fechar decisão

### 9.3 Fluxo do Atlas IA

1. ativar Gemini por loja
2. configurar comportamento em `Configurações`
3. abrir `Torre de Controle`
4. consultar `Mesa do Atlas`
5. revisar `Radar`
6. usar feedback para melhorar memória curta

### 9.4 Fluxo de integração por loja

1. abrir `Integrações`
2. escolher provedor
3. configurar modo e identificadores
4. salvar credencial da marca
5. executar sincronização
6. validar a camada analítica correspondente

## 10. Arquitetura funcional do produto

### 10.1 Backend como fonte de verdade

O produto caminha para um modelo em que:

- cálculos críticos vivem no backend
- frontend interpreta e apresenta
- a camada canônica concentra os números gerenciais

### 10.2 Separação entre leitura e configuração

O Atlas já adota a seguinte separação:

- `Integrações` para ativação técnica
- `Configurações` para comportamento do agente
- `Torre` para leitura e decisão

### 10.3 Separação entre operação factual e IA

O Atlas IA não substitui a base factual.

Regras:

- a base factual vem primeiro
- a IA entra como síntese, hipótese e priorização
- o operador continua responsável pela decisão final

## 11. UX e design system

O Atlas já passou por uma refatoração forte de shell, header, sidebar, KPIs e módulos principais.

Fonte atual do design system:

- [ATLAS_DESIGN_SYSTEM_V2.md](C:\BrandOps\BrandOps-new\docs\ATLAS_DESIGN_SYSTEM_V2.md)

Direção atual:

- estrutura inspirada em Carbon
- densidade operacional
- contexto inline
- CTA com acento técnico
- dark mode controlado
- white mode em refinamento contínuo

## 12. Estado atual do Atlas IA

### Já existe

- leitura contextual por rota
- memória curta
- feedback
- aprendizado do negócio
- skill selector
- configuração por marca

### Ainda não existe

- agentes autônomos de execução
- gestão automática de demanda
- criação automática e publicação automática com aprovação humana
- pipeline completo `insight -> tarefa -> conteúdo -> aprovação -> publicação`

## 13. Oportunidades de evolução já alinhadas com a visão

### 13.1 Operação de mídia mais profunda

Próxima camada esperada:

- gestão no nível de anúncio
- leitura por criativo
- decisão de escalar, pausar ou revisar peças específicas

### 13.2 Camada criativa e social

Próxima camada esperada:

- planejamento de conteúdo
- produção assistida
- agendamento
- publicação social com aprovação humana

### 13.3 Agentes por marca

Evolução futura desejada:

- agentes especializados por marca
- agentes orientados por governança
- tarefas disparadas por insight real do negócio

### 13.4 Re-arquitetura do Atlas IA como entidade

Próxima camada estratégica:

- reconstruir o `Atlas IA` como experiência própria dentro do `BrandOps`
- separar totalmente a gramática visual do Atlas da gramática operacional do sistema
- ampliar memória, evidências, hipóteses e predições
- transformar o Atlas em leitura viva de `passado`, `presente` e `futuro`

Spec de referência:

- [brandops-atlas-ai-entity-rearchitecture/spec.md](/C:/BrandOps/BrandOps-new/docs/specs/brandops-atlas-ai-entity-rearchitecture/spec.md)

### 13.5 Cockpit humano de operação

Camada adjacente já priorizada:

- criar um cockpit Kanban para a execução humana
- transformar sugestão aceita do Atlas em tarefa viva no sistema
- cobrar urgência, atraso, andamento e próximas entregas
- fechar o loop `insight -> aceite humano -> tarefa -> execução -> memória`

Spec de referência:

- [brandops-human-ops-cockpit/spec.md](/C:/BrandOps/BrandOps-new/docs/specs/brandops-human-ops-cockpit/spec.md)

### 13.6 Integrações OAuth comercializáveis para SaaS

Camada estratégica de monetização e escala:

- permitir que o cliente conecte `Google` e `Meta` por login e consentimento
- evitar que cada cliente tenha que criar app/API própria
- deslocar a responsabilidade de app, review e governança para o próprio BrandOps
- preparar o produto para onboarding comercial mais simples

Spec de referência:

- [brandops-saas-oauth-integrations/spec.md](/C:/BrandOps/BrandOps-new/docs/specs/brandops-saas-oauth-integrations/spec.md)

## 14. Principais gaps atuais

- consistência final dos insights do Atlas IA
- migração total da leitura financeira para a camada canônica
- function calling mais profundo
- observabilidade e fallback mais robustos em integrações externas
- remoção do fallback de governança hardcoded
- revisão visual humana fina em algumas áreas logadas
- aprofundamento da leitura operacional da Meta em nível de anúncio e criativo

## 15. Não objetivos atuais

Neste momento, o Atlas ainda não deve ser tratado como:

- ferramenta de publicação social fully autonomous
- gestor completo de criação com pipeline multimodal pronto
- sistema de automação sem supervisão humana

Essas frentes pertencem à visão futura, não ao escopo já entregue.

## 16. Métricas de sucesso do produto

### 16.1 Curto prazo

- operador entende o próximo clique em poucos segundos
- marca consegue integrar Meta, GA4 e Gemini sem suporte manual recorrente
- Torre aponta corretamente o principal problema do recorte
- DRE e margem mantêm coerência com a camada canônica

### 16.2 Médio prazo

- Atlas IA ganha consistência suficiente para virar rotina do operador
- domínio financeiro passa por refatoração de arquitetura de informação, priorizando `DRE mensal`, separando `resumo executivo` e limpando a operação de `lançamentos`
- integrações reduzem falha operacional recorrente
- leitura por domínio reduz tempo de análise manual

### 16.3 Longo prazo

- Atlas evolui de painel para console operacional assistido
- a IA deixa de ser só síntese e passa a apoiar workflows completos com aprovação humana

## 17. Relação com o fluxo SDD

Este documento é o `PRD vivo` do sistema.

A partir dele, cada frente nova deve nascer como:

1. `spec` da feature
2. `plan` técnico
3. `tasks` com dependências
4. implementação

Base atual do fluxo:

- [ATLAS_CONSTITUTION.md](C:\BrandOps\BrandOps-new\docs\sdd\ATLAS_CONSTITUTION.md)
- [README do SDD](C:\BrandOps\BrandOps-new\docs\sdd\README.md)
- [diretório de specs](C:\BrandOps\BrandOps-new\docs\specs\README.md)

Exemplos de frentes que deveriam seguir esse modelo imediatamente:

- refatoração da Torre de Controle
- polimento visual sistêmico antes da expansão funcional
- gestão de anúncios por peça/criativo
- expansão da integração Meta
- pipeline de conteúdo com aprovação humana
- agentes operacionais por marca

## 18. Regras de manutenção deste documento

Atualizar este PRD quando houver:

- novo módulo logado
- nova integração suportada
- mudança real de escopo do Atlas IA
- alteração da arquitetura de navegação
- entrega relevante de governança SaaS
- entrada de nova frente operacional

Não atualizar este PRD para:

- pequenos ajustes visuais
- correções pontuais de copy
- bugfixes que não mudem o produto

## 19. Documentos complementares

- [README.md](C:\BrandOps\BrandOps-new\README.md)
- [ATLAS_DESIGN_SYSTEM_V2.md](C:\BrandOps\BrandOps-new\docs\ATLAS_DESIGN_SYSTEM_V2.md)
- [BACKLOG_CONSOLIDADO_ATLAS_2026-04-04.md](C:\BrandOps\BrandOps-new\docs\BACKLOG_CONSOLIDADO_ATLAS_2026-04-04.md)
- [GUIA_CONFIGURACOES_ATLAS.md](C:\BrandOps\BrandOps-new\docs\GUIA_CONFIGURACOES_ATLAS.md)
- [GUIA_CONFIGURACOES_ATLAS_SUPERADMIN.md](C:\BrandOps\BrandOps-new\docs\GUIA_CONFIGURACOES_ATLAS_SUPERADMIN.md)
- [TUTORIAL_INTEGRACOES_POR_LOJA.md](C:\BrandOps\BrandOps-new\docs\TUTORIAL_INTEGRACOES_POR_LOJA.md)
