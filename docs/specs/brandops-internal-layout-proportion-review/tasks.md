# Tasks Template

## 1. Preparação

- [ ] alinhar a nova revisão com o PRD vivo e com o reframe operacional
- [ ] mapear as rotas principais com maior tensão de proporção interna

## 2. Fundação visual

- [ ] consolidar tokens de superfície, raio, tabs, métricas e rails com base na sidebar
- [ ] remover hardcodes novos dessa camada compartilhada
- [ ] revisar `WorkspaceSplitLayout`, `OperationalMetricStrip` e primitivas relacionadas

## 3. Revisão por domínio

- [ ] revisar `Controle`
- [ ] revisar `Financeiro`
- [ ] revisar `Aquisição`
- [ ] revisar `Operação`
- [ ] revisar `Plataforma`

## 4. Validação

- [ ] type-check
- [ ] lint
- [ ] build
- [ ] validação de runtime e primeira dobra nas rotas críticas

## 5. Critério final

- [ ] dark e white refletem a mesma gramática visual
- [ ] não há conteúdo vazando ou rails comprimidas nas rotas principais
- [ ] páginas e sidebar conversam como um único sistema
