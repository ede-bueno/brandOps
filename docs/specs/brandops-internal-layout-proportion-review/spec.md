# Spec Template

## 1. Contexto

O `BrandOps` já saiu do padrão de mosaico excessivo de dashboards e foi reorganizado em floorplans mais operacionais. Mesmo assim, a distribuição interna de muitos componentes ainda não está madura: rails estreitas demais, métricas comprimidas, textos vazando, blocos principais com espaço sobrando e cards de apoio densos demais.

O problema aparece tanto em `dark mode` quanto em `white mode`, e é mais perceptível nas rotas principais de `Aquisição`, `Financeiro` e `Operação`.

## 2. Problema

A arquitetura macro melhorou, mas a composição interna ainda transmite:

- rails com largura insuficiente para o conteúdo real
- grids de métricas com colunas estreitas demais
- hierarquia visual inconsistente entre `sidebar` e conteúdo
- superfícies e tabs ainda presas a uma gramática visual divergente
- desperdício de espaço em blocos principais e aperto excessivo em blocos secundários

Isso afeta leitura, confiança e percepção de produto profissional.

## 3. Objetivo

Revisar e refinar sistemicamente as proporções internas do BrandOps para que:

- `dark` e `white` reflitam 100% a mesma linguagem visual
- páginas e sidebar conversem como um único sistema
- rails, cards, strips, tabs, tabelas e seções usem tokens canônicos
- o conteúdo pare de vazar, quebrar ou parecer apertado
- a primeira dobra de cada domínio fique clara, operacional e respirável

## 4. Escopo

### Inclui

- revisão visual e estrutural de proporção interna nas rotas principais
- revisão de `rails`, `metric strips`, `cards`, `tabs`, `toolbars`, `headers` e `split views`
- consolidação de tokens visuais para raio, largura, superfícies, bordas, tabs e métricas
- revisão de `white mode` e `dark mode` com a mesma linguagem da sidebar
- ajustes página a página nas rotas principais do produto

### Não inclui

- criação de novas funcionalidades de domínio
- mudanças de cálculo, backend ou integrações
- reabertura de `Creative Ops` ou da frente social

## 5. Usuários impactados

- super admin
- operadores financeiros
- operadores de mídia e aquisição
- operadores de catálogo/importação/saneamento
- usuários de marcas SaaS que precisam entender rápido onde monitorar, decidir e operar

## 6. Fluxo esperado

1. o usuário entra na rota
2. identifica a leitura dominante na primeira dobra sem esforço
3. entende imediatamente qual é o bloco principal e qual é a rail de apoio
4. navega por tabs, filtros e tabelas sem sensação de aperto ou vazamento
5. percebe o mesmo idioma visual da sidebar no restante do produto

## 7. Requisitos funcionais

- toda rota principal deve ter distribuição interna coerente com o floorplan adotado
- rails devem ter largura suficiente para o maior conteúdo esperado do domínio
- strips de métricas devem respeitar contagem de colunas definida por token, nunca por hardcode solto
- tabs e subtabs devem herdar a gramática visual da sidebar
- chips, métricas inline e estados devem compartilhar tokens com o shell
- páginas principais devem ser revisadas em `dark` e `white`

## 8. Requisitos não funcionais

- usar tokens visuais canônicos; evitar hardcodes novos
- preservar estabilidade do sistema
- manter consistência entre rotas e domínios
- evitar regressão para o padrão de dashboard genérico

## 9. Critérios de aceite

- não há mais conteúdo vazando em rails ou cards de apoio nas rotas principais
- `dark` e `white` apresentam a mesma gramática visual
- tabs, chips e superfícies conversam visualmente com a sidebar
- a primeira dobra das rotas principais fica legível e bem distribuída
- os ajustes são baseados em tokens e reaproveitados pelo sistema

## 10. Riscos e dependências

- risco de regressão visual em rotas menos usadas se a mudança ficar só na base global
- necessidade de revisão manual em navegador real por domínio
- dependência de consolidar tokens sem reintroduzir estilos paralelos
