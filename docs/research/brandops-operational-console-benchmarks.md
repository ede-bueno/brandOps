# Pesquisa: BrandOps como software operacional

Data da pesquisa: 2026-04-09
Objetivo: sair do padrão de "dashboard em todas as telas" e redefinir o BrandOps como software operacional multi-marca, mantendo o Atlas como agente de IA.

## 1. Diagnóstico do problema atual

O teste com usuário confirmou um problema estrutural de arquitetura de interface:

- quase toda tela tenta ser dashboard
- há excesso de cards, KPIs e blocos narrativos concorrendo entre si
- páginas operacionais parecem relatórios executivos
- novos usuários não entendem por onde começar nem qual é o próximo clique

O problema principal não é só estética. É mistura de intenções:

- monitorar
- decidir
- operar
- configurar
- editar

Quando tudo parece dashboard, nada parece software.

## 2. Referências externas estudadas

### 2.1 Material Design 3

Referência:

- [Material 3](https://m3.material.io/)

Leitura aplicada ao BrandOps:

- shell, navegação, barras superiores e superfícies devem organizar fluxo, não competir com conteúdo
- densidade e hierarquia devem ser claras no claro e no escuro
- componentes servem ao fluxo de uso, não à ornamentação

Observação:

- Material 3 entra como referência estrutural e de interação, não como cópia visual literal

### 2.2 shadcn/ui

Referência:

- [shadcn/ui](https://ui.shadcn.com/)

Leitura aplicada ao BrandOps:

- usar primitives compostas, não layouts engessados
- permitir que a interface tenha poucos blocos, mais espaço útil e melhor legibilidade
- apoiar a construção de telas operacionais com tabelas, filtros, tabs, drawers e formulários mais limpos

### 2.3 SAP Fiori

Referências:

- [List Report Floorplan](https://experience.sap.com/fiori-design-web/list-report-floorplan-sap-fiori-element/)
- [Object Page Floorplan](https://experience.sap.com/fiori-design-web/object-page-floorplan-sap-fiori-element/)
- [Worklist Floorplan](https://experience.sap.com/fiori-design-web/worklist-floorplan-sap-fiori-element/)

Leitura aplicada ao BrandOps:

- software corporativo claro separa bem leitura geral, lista de trabalho e detalhe de objeto
- `list report`, `worklist` e `object page` são padrões melhores para operação do que mosaicos de cards
- a tela principal deve responder "o que estou vendo" e "o que faço agora" com pouco esforço

### 2.4 AWS Cloudscape

Referências:

- [Table](https://cloudscape.design/components/table/)
- [Split panel](https://cloudscape.design/components/split-panel/)
- [Collection preferences](https://cloudscape.design/components/collection-preferences/)

Leitura aplicada ao BrandOps:

- dados operacionais pedem tabela forte, filtro controlado e inspeção lateral
- `split panel` é melhor do que empilhar cards explicativos
- coleções grandes devem ser configuráveis, filtráveis e auditáveis sem virar parede visual

### 2.5 Atlassian Design System

Referências:

- [Page layout](https://atlassian.design/components/page-layout/)
- [Navigation system](https://atlassian.design/components/navigation-system/)

Leitura aplicada ao BrandOps:

- o produto precisa de navegação estável e previsível
- cabeçalho, navegação e workspace principal devem ter papéis distintos
- o usuário não deve reaprender a interface a cada área

## 3. Conclusões da pesquisa

As referências convergem para a mesma direção:

1. um bom produto operacional pode ter dashboard, mas não pode ser só dashboard
2. listas, tabelas, filtros e detalhes contextuais devem dominar as telas de trabalho
3. KPIs devem aparecer onde ajudam decisão, não como decoração padrão
4. o shell deve carregar contexto global e reduzir repetição local
5. o sistema precisa de floorplans canônicos

## 4. Floorplans recomendados para o BrandOps

### 4.1 Dashboard Hub

Uso:

- Torre de Controle
- resumos executivos de domínio

Estrutura:

- síntese principal
- alguns KPIs realmente críticos
- alertas e atalhos
- acesso para telas operacionais

### 4.2 List Report

Uso:

- DRE mensal
- Produtos
- Campanhas
- Anúncios
- Livro de lançamentos

Estrutura:

- tabela principal em largura útil
- filtros em toolbar ou rail lateral
- agrupamentos, paginação, ordenação e drill-down

### 4.3 Worklist

Uso:

- saneamento
- importação
- fila de revisão
- tarefas operacionais

Estrutura:

- lista de itens a tratar
- status
- ações rápidas
- contexto curto, nunca hero grande

### 4.4 Split View / Inspector

Uso:

- mídia
- produtos
- integrações
- lançamentos

Estrutura:

- lista ou tabela principal
- detalhe lateral ou inferior do item selecionado
- edição contextual sem sair do fluxo

### 4.5 Object Workspace

Uso:

- integração por provedor
- edição de loja
- configurações de marca

Estrutura:

- cabeçalho do objeto
- estado atual
- blocos de configuração
- histórico e ações em faixas claras

## 5. Tradução para a arquitetura do BrandOps

### 5.1 Produto e nomenclatura

- nome do produto: `BrandOps`
- nome do agente de IA: `Atlas`
- `Atlas` deve aparecer como agente, assistente, analista ou camada de IA
- `BrandOps` deve aparecer como o software principal

### 5.2 Regra de ouro

- só a `Torre de Controle` e resumos específicos devem se comportar como dashboard
- telas operacionais não devem nascer como grade de cards + KPI + narrativa

### 5.3 Mapeamento recomendado por domínio

#### Controle

- `dashboard`: dashboard hub principal
- `dashboard/contribution-margin`: resumo executivo específico

#### Financeiro

- `dre`: list report com histórico mensal como foco
- `cost-center`: worklist/list report de lançamentos
- `cmv`: list report + inspector
- `sales`: dashboard executivo leve + tabelas

#### Aquisição

- `media`: hub de mídia leve + páginas operacionais
- `media/anuncios`: list report + split view
- `media/campanhas`: list report + split view
- `traffic`: overview + tabelas e gráfico principal
- `product-insights`: list report por produto + painel lateral

#### Operação

- `feed`: list report do catálogo
- `import`: worklist de ingestão
- `sanitization`: worklist de revisão

#### Plataforma

- `integrations`: object workspace por provedor
- `settings`: object workspace de marca/plataforma
- `admin/stores`: gestão multi-marca com seleção clara

## 6. Decisões de design resultantes

- abandonar a dependência conceitual do visual Carbon
- usar `Material 3` como referência de interação e composição
- usar `shadcn/ui` como base de primitives e implementação
- usar `Fiori` e `Cloudscape` como referência de floorplan operacional
- manter uma linguagem visual tecnológica, mas sem cair em "dashboardite"

## 7. O que não repetir

- card grande vazio só para narrar
- KPI rail em toda tela
- duplicação de marca/período no header local
- quatro ou cinco blocos competindo pela atenção na primeira dobra
- página operacional com cara de apresentação executiva

## 8. Direção final

O BrandOps deve parecer:

- um software operacional multi-marca
- com um dashboard excelente na Torre de Controle
- com o Atlas como agente de IA integrado
- e com telas dedicadas para operar mídia, finanças, catálogo, integrações e base

Não deve parecer:

- uma coleção de dashboards empilhados
- um centro de KPI permanente
- uma vitrine de cards em todas as rotas
