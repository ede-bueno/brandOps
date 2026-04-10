# Tasks: BrandOps Operational Console Reframe

## 1. Preparação

- [x] alinhar a visão com o PRD vivo
- [x] estudar referências externas para software operacional
- [x] registrar a mudança conceitual: `BrandOps` como produto e `Atlas` como agente
- [x] mapear cada rota do sistema para um floorplan canônico

## 2. Fundação

- [x] refatorar `branding`, shell global e copy de produto
- [x] consolidar primitives de floorplan compartilhadas
- [x] revisar light/dark mode dentro dessa nova arquitetura
- [x] definir regras para quando usar dashboard, tabela, fila, split view e object workspace

## 3. Controle

- [x] consolidar a `Torre de Controle` como dashboard hub principal
- [x] reduzir padrões de dashboard fora da Torre
- [x] reposicionar o `Atlas` como agente contextual da operação

## 4. Financeiro

- [x] concluir o reframe de `DRE`
- [x] concluir o reframe de `Livro de Lançamentos`
- [x] refatorar `Receita e Vendas` para resumo leve + vistas operacionais
- [x] refatorar `CMV` como list report + inspector

## 5. Aquisição

- [x] refatorar `Mídia` como hub enxuto + páginas por entidade
- [x] refatorar `Tráfego` como fluxo de análise operacional
- [x] refatorar `Produtos e Insights` como lista/ranking + detalhe contextual

## 6. Operação

- [x] refatorar `Catálogo` como list report operacional
- [x] refatorar `Importação` como worklist
- [x] refatorar `Saneamento` como worklist

## 7. Plataforma

- [x] refatorar `Integrações` como object workspace por provedor
- [x] refatorar `Settings` como object workspace da marca/plataforma
- [x] refatorar `Admin > Lojas` como gestão multi-marca clara

## 8. Validação

- [x] type-check
- [x] lint
- [x] build
- [ ] revisão manual de runtime por domínio

## 9. Critério final

- [ ] o sistema se apresenta como software operacional
- [ ] o dashboard fica concentrado onde faz sentido
- [ ] o usuário entende onde monitora, onde decide e onde opera
- [ ] o BrandOps volta a ser a identidade do produto
- [ ] o Atlas permanece como agente de IA dentro do sistema

## 10. Próximo lote em massa

- [x] fechar `Admin > Lojas` no padrão de workspace operacional
- [x] refatorar `Ajuda` para onboarding operacional sem cara de painel analítico
- [x] enxugar `Margem de contribuição` para virar leitura financeira dedicada, não mini-dashboard genérico
- [x] revisar `Tutoriais de integrações` como conteúdo guiado, não grade de KPIs
- [x] mapear as rotas restantes por floorplan (`hub`, `list report`, `worklist`, `split view`, `object workspace`)

## 11. Novo lote em massa

- [ ] fazer revisão manual de runtime por domínio (`Controle`, `Financeiro`, `Aquisição`, `Operação`, `Plataforma`)
- [ ] revisar acessibilidade e clareza de navegação na primeira dobra das rotas principais
- [x] decidir o destino final de primitives legadas que ficaram só por compatibilidade (`AnalyticsKpiCard` e derivados)
- [x] consolidar documentação visual e operacional do BrandOps para novas frentes nascerem no floorplan certo

## 12. Próxima fila operacional

- [ ] revisar em navegador real a primeira dobra de `dashboard`, `dre`, `media`, `traffic`, `product-insights`, `cost-center` e `integrations`
- [x] validar estados vazios, loading e fallbacks de dados nas rotas principais
- [x] revisar microcopy residual para remover qualquer texto meta ou ambíguo de produto
- [ ] preparar a próxima spec funcional já em cima da arquitetura de floorplans consolidada

## 13. Lote executado nesta rodada

- [x] contextualizar CTAs de estados vazios nas rotas principais
- [x] esconder CTA quando a escolha de marca já é resolvida pelo shell
- [x] apontar mídia, tráfego e produto para `Integrações` quando faltarem dados
- [x] apontar catálogo e saneamento para `Importação` quando faltarem bases
- [x] compactar a primitive `AnalyticsCalloutCard` para reduzir a cara de dashboard fora da Torre
- [x] remover `AnalyticsCalloutCard` das telas de apoio (`Ajuda`, `Importação`, `Admin > Lojas`, `Tutoriais`)
- [x] limpar copy residual nas áreas financeira, plataforma e catálogo
- [x] reorganizar `Mídia`, `Produtos e Insights` e `Catálogo` para usar cards compactos e linguagem mais operacional

## 14. Lote executado nesta rodada

- [x] remover o uso residual de `AnalyticsCalloutCard` em `Torre`, `Margem de contribuição` e `Radar do Atlas`
- [x] apagar a primitive morta `AnalyticsCalloutCard` de `AnalyticsPrimitives`
- [x] deixar `dashboard` e `contribution-margin` com blocos mais secos, mantendo só a função de hub
- [x] revalidar build e rotas principais depois da limpeza final

## 15. Backlog imediato após o reframe

- [ ] executar a spec `brandops-internal-layout-proportion-review`
- [ ] revisar proporção interna de rails, strips, cards e tabelas em `dark` e `white`
- [ ] alinhar completamente a linguagem das páginas à gramática visual da sidebar
- [ ] concluir revisão manual de primeira dobra por domínio depois dessa passada
- [ ] abrir a frente `brandops-atlas-ai-entity-rearchitecture` depois do fechamento da revisão visual operacional
- [ ] abrir o `brandops-human-ops-cockpit` como camada de execução humana do Atlas
- [ ] preparar `brandops-saas-oauth-integrations` para reduzir atrito comercial do onboarding
