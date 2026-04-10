# Spec: Atlas Ads Creative Ops - Fase 1

## 1. Contexto

O Atlas já possui:

- leitura de mídia por campanha em `/media`
- leitura de tráfego em `/traffic`
- leitura de produto em `/product-insights`
- integrações por marca com `Meta`, `GA4` e `Gemini`
- Torre de Controle com Atlas IA em modo de apoio à decisão

Também já existe a tese de produto documentada em:

- [ATLAS_PRD_VIVO.md](/C:/BrandOps/BrandOps-new/docs/ATLAS_PRD_VIVO.md)
- [PRODUCT_DECISION_ENGINE.md](/C:/BrandOps/BrandOps-new/docs/PRODUCT_DECISION_ENGINE.md)
- [BACKLOG_CONSOLIDADO_ATLAS_2026-04-04.md](/C:/BrandOps/BrandOps-new/docs/BACKLOG_CONSOLIDADO_ATLAS_2026-04-04.md)

A próxima evolução natural é sair da decisão por campanha e entrar na decisão por anúncio e criativo, preparando a futura camada de criação, operação social e agentes por marca.

## 2. Problema

Hoje o Atlas ainda não responde com precisão operacional:

- qual anúncio merece mais verba
- qual criativo deve ser revisado
- qual anúncio deve ser pausado
- qual anúncio precisa de mais amostra antes de qualquer mudança

A leitura atual é útil, mas ainda fica acima da camada onde a operação de mídia realmente acontece.

## 3. Objetivo

Entregar a primeira versão da camada `Ads Creative Ops` do Atlas, focada em decisão operacional por `ad` e `creative`, com base determinística e auditável.

Esta fase deve permitir:

- consolidar leitura por anúncio
- destacar anúncios e criativos em foco
- recomendar ação estruturada
- abrir caminho para futuras fases de criação assistida e agentes operacionais

## 4. Escopo

### Inclui

- modelagem inicial de leitura por anúncio e criativo a partir da `Meta API`
- motor determinístico de decisão operacional por anúncio
- recomendações estruturadas como:
  - `scale_budget`
  - `maintain`
  - `review_creative`
  - `review_audience`
  - `pause`
- nova visão operacional dentro da área de mídia para `ads`
- síntese curta no Atlas IA usando as saídas determinísticas
- ligação entre campanha, anúncio e criativo quando os dados estiverem disponíveis

### Não inclui

- geração automática de artes
- publicação automática em Instagram ou Facebook
- agendamento social
- agentes autônomos executando tarefas sem aprovação humana
- function calling profundo do Atlas IA
- nova governança comercial de planos

## 5. Usuários impactados

- operador da marca
- gestor da marca
- superadmin em apoio operacional

## 6. Fluxo esperado

1. usuário abre `Mídia e Performance`
2. entra na nova leitura de `ads`
3. vê anúncios e criativos prioritários do recorte
4. identifica rapidamente:
   - escalar
   - revisar criativo
   - revisar público
   - manter
   - pausar
5. aprofunda o item em foco e decide a próxima ação

## 7. Requisitos funcionais

- o Atlas deve consolidar leitura por `campaign`, `adset`, `ad` e, quando possível, `creative`
- o sistema deve expor ao menos uma lista priorizada de anúncios do recorte
- cada anúncio deve ter:
  - ação sugerida
  - confiança
  - racional auditável
  - métricas principais
- a tela deve destacar:
  - melhor candidato à escala
  - principal revisão de criativo
  - principal revisão de público
  - anúncio com sinal de pausa
- a narrativa do Atlas IA deve nascer da decisão estruturada, nunca de cálculo livre

## 8. Requisitos não funcionais

- seguir o design system atual do Atlas
- manter white e dark mode consistentes
- preservar densidade operacional
- backend como fonte de verdade
- deixar a decisão explicável e auditável

## 9. Critérios de aceite

- o usuário consegue identificar o anúncio prioritário do recorte em poucos segundos
- a decisão por anúncio não depende de interpretação manual de métricas soltas
- a recomendação fica coerente com sinais de gasto, CTR, conversão e retorno
- a interface não repete a visão de campanhas com outro nome
- a nova camada prepara naturalmente a futura frente de criação e agentes

## 10. Riscos e dependências

- dependência da granularidade real disponível na `Meta API`
- risco de dados incompletos entre `campaign`, `adset`, `ad` e `creative`
- necessidade de manter separação clara entre:
  - leitura de mídia
  - leitura de produto
  - futura operação social
- risco de IA narrar acima da confiança real dos dados se a saída determinística vier fraca
