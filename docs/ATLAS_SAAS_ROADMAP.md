# Atlas - Roadmap SaaS

## Posicionamento

`Atlas` é a evolução do painel atual para uma plataforma SaaS multiempresa focada em:

- gestão financeira e operacional
- inteligência de mídia e tráfego
- leitura de catálogo e performance de estampas
- saneamento e confiabilidade de dados
- base futura para criação assistida de criativos em operações POD

## Tese do produto

O sistema deixa de ser um painel interno e passa a ser um `print on demand intelligence OS` para lojistas que operam com a INK e canais de aquisição como Meta e GA4.

## Premissas canônicas

- nome oficial do SaaS: `Atlas`
- Atlas como referência ao titã da mitologia grega: força estrutural, sustentação e visão sistêmica
- backend como fonte de verdade de cálculos e decisões canônicas
- frontend como camada de leitura, navegação e operação
- POD como nicho principal do produto, sem entrar no nome da marca
- linguagem visual mais tecnológica, robusta e sistêmica, inspirada pela tese do titã Atlas

## Pontos de atenção em aberto

- revisar a leitura histórica da margem de contribuição para garantir coerência entre:
  - card da `Control Tower`
  - detalhe de margem
  - linha de resultado após despesas no `DRE`
- manter explícita a semântica:
  - `Control Tower` = recorte ativo
  - `Histórico da margem` = série completa ou recorte, conforme aba
- revisar novamente o cálculo e a exibição do `Ponto de equilíbrio`
- comunicar sempre o ponto de equilíbrio como:
  - `meta mensal de RLD`
  - e ocultar a exibição quando a margem estiver comprimida ou instável
- manter a regra técnica oficial:
  - `backend` manda
  - `frontend` apenas consome contratos, navega e renderiza
- continuar empurrando contratos críticos para backend ou Supabase:
  - `Control Tower`
  - `DRE`
  - `Saneamento`
  - futuras inteligências de mídia, tráfego e produto
- avaliar uso seletivo de `views materializadas` e agregações canônicas quando o volume começar a pressionar tempo de carregamento
- revisar a coerência entre:
  - `margem de contribuição acumulada`
  - `resultado após despesas`
  - cards executivos do período
- continuar migrando inteligência de produto, saneamento e demais análises para contratos canônicos de backend
- aplicar a próxima rodada visual com base no style guide de referência em [C:\BrandOps\BrandOps-new\StyleGuide.tsx](C:\BrandOps\BrandOps-new\StyleGuide.tsx)
- manter como documento de orientação visual interna a tese em [C:\BrandOps\BrandOps-new\docs\ATLAS_VISUAL_THESIS.md](C:\BrandOps\BrandOps-new\docs\ATLAS_VISUAL_THESIS.md)
- revisar a possibilidade de `views materializadas` para:
  - relatórios financeiros canônicos
  - agregações de mídia
  - agregações de tráfego
  - sem deixar o frontend recalcular semântica crítica

## Ordem lógica de execução

### Fase 1 - Fundação SaaS e marca

- consolidação da marca do produto como `Atlas`
- padronização visual da navegação e dos módulos principais
- consolidação do backlog por domínios
- endurecimento de permissões e isolamento por empresa

### Fase 2 - Torre de controle e DRE

- drill-down dos cards da `Control Tower`
- gráfico histórico de margem de contribuição
- garantir que `margem`, `resultado` e `ponto de equilíbrio` saiam do mesmo contrato financeiro canônico
- navegação entre visão executiva, tendência e detalhe
- refatoração do `DRE consolidado` e `DRE filtrado`
- melhoria da composição de despesas e detalhamento operacional

### Fase 3 - Operação financeira

- evolução de `Lançamentos DRE`
- filtros melhores no livro de lançamentos
- cadastro, edição e governança de categorias
- melhoria de `CMV` e visões de produtos vendidos por categoria

### Fase 4 - Aquisição e inteligência

- evolução de `Performance Mídia`
- mais granularidade da Meta API
- visões de tendência, subida/queda, pressão de verba e eficiência
- camada de recomendação sobre escalar, manter, revisar ou pausar

### Fase 5 - Tráfego e comportamento

- evolução de `Tráfego Digital`
- deixar de ser espelho do GA4 e virar leitura gerencial
- melhor distribuição visual de `source / medium`, `campanhas` e `landing pages`
- correlação com receita real da INK

### Fase 6 - Insights de categorias e produto

- consolidar sinais de INK + GA4 + Meta
- leitura de performance por estampa, peça e coleção
- recomendações operacionais e de mídia
- base para futuros agentes especialistas de produto e anúncio

### Fase 7 - Catálogo e criativos

- substituir o feed manual quando viável por fonte automatizada via Meta/catalog
- enriquecer mockups, imagens e agrupamentos
- preparar base para motor de criativos e testes de anúncios em `Print on Demand`

### Fase 8 - Saneamento e confiança operacional

- ampliar detecção de outliers
- garantir histórico completo e reversível
- revisar persistência das decisões
- reforçar auditoria cruzando INK, Meta e GA4

## Direção visual do Atlas

- manter o nome oficial como `Atlas`
- usar a metáfora do titã como linguagem de produto:
  - força estrutural
  - sustentação da operação
  - visão sistêmica
- adotar um visual mais tecnológico e menos “clínico”
- aproveitar do style guide externo principalmente:
  - sidebar mais técnica
  - padrões de tabs e segmentação
  - fundo/padrão visual discreto com caráter de software robusto
  - superfícies com hierarquia mais clara
- evitar copiar a marca `Parallax`; usar apenas o framework visual como referência de linguagem

## Próxima execução recomendada

1. refatorar `Control Tower` e `DRE`
2. evoluir `Performance Mídia`
3. evoluir `Tráfego Digital`
4. evoluir `Insights de Categorias`
5. atacar `Catálogo` via integração da Meta
