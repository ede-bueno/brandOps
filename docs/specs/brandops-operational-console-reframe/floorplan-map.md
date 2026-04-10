# BrandOps Floorplan Map

## Objetivo

Definir, rota por rota, qual floorplan canônico deve orientar a interface do BrandOps. Isso reduz improviso visual, evita páginas que parecem dashboards genéricos e deixa claro onde o usuário monitora, decide e opera.

## Floorplans canônicos

- `dashboard hub`: visão agregada com KPIs, alertas e síntese executiva. Deve ser exceção.
- `list report`: tabela ou grade principal com filtros e apoio lateral para leitura.
- `worklist`: fila operacional com foco em itens, status, filtros e próximo clique.
- `split workspace`: conteúdo principal + rail/inspector lateral com decisão contextual.
- `object workspace`: área dedicada a uma entidade, provedor ou configuração, com contexto técnico e seções claras.
- `guided content`: documentação/tutorial com passo a passo, validação e links oficiais.
- `holding page`: rota temporariamente fora da operação principal, sem prometer fluxo que ainda será redesenhado.

## Mapa por rota

### Controle

- `/dashboard` → `dashboard hub`
- `/dashboard/contribution-margin` → `split workspace`

### Financeiro

- `/dre` → `list report`
- `/sales` → `split workspace`
- `/cost-center` → `worklist`
- `/cmv` → `split workspace`

### Aquisição

- `/media` → `split workspace`
- `/media/visao-executiva` → `split workspace`
- `/media/radar` → `split workspace`
- `/media/campanhas` → `list report`
- `/media/anuncios` → `list report`
- `/traffic` → `split workspace`
- `/product-insights` → `split workspace`
- `/product-insights/visao-executiva` → `split workspace`
- `/product-insights/radar` → `split workspace`
- `/product-insights/detalhamento` → `list report`

### Operação

- `/feed` → `worklist`
- `/import` → `worklist`
- `/sanitization` → `worklist`
- `/creative-ops` → `holding page`

### Plataforma

- `/integrations` → `object workspace`
- `/integrations/tutorials` → `guided content`
- `/integrations/tutorials/[provider]` → `guided content`
- `/settings` → `object workspace`
- `/admin/stores` → `object workspace`
- `/help` → `guided content`

## Regras de uso

- use `dashboard hub` só para a Torre de Controle ou para leituras realmente executivas
- prefira `list report` quando o valor principal estiver na matriz, tabela, ranking ou histórico
- prefira `worklist` quando a pessoa estiver operando filas, pendências, importações, saneamento ou lançamentos
- prefira `split workspace` quando houver uma leitura principal e uma rail lateral útil para decisão
- prefira `object workspace` para entidade técnica, provedor, configuração ou administração multi-marca
- prefira `guided content` para ajuda e tutoriais
- `holding page` não deve ficar no fluxo principal do produto; serve apenas para replanejamento controlado

## Sinais de erro

- se a página começa com muitos KPIs e nenhum próximo clique claro, o floorplan está errado
- se o usuário precisa caçar onde operar, a tela virou dashboard demais
- se o rail lateral repete o header ou o conteúdo principal, a composição está inflada
- se cards são usados por hábito e não por decisão, a tela precisa ser simplificada
