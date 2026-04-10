# Spec: Polimento Visual Sistêmico do Atlas

## 1. Contexto

O Atlas já possui um design system funcional, uma shell consolidada e uma refatoração relevante das principais áreas do sistema.

Mesmo assim, ainda existem pontos de acabamento perceptivo importantes, principalmente no modo white:

- cards com contraste insuficiente
- hierarquia visual ainda difusa em algumas telas
- textos que quebram demais e pioram a leitura
- superfícies que parecem invisíveis ou sem ponto focal
- necessidade de reavaliar a sidebar colapsável dentro da linguagem atual do produto

Antes de expandir o produto para novas frentes grandes, o sistema precisa fechar esse acabamento para que a próxima camada já nasça no padrão certo.

## 2. Problema

Hoje o Atlas já está coerente estruturalmente, mas ainda não está totalmente resolvido perceptivamente.

Os principais sintomas são:

- no modo white, alguns cards ainda somem no conjunto
- a leitura de texto em cards e painéis às vezes quebra em colunas desconfortáveis
- algumas áreas ainda pedem mais separação entre bloco principal e bloco auxiliar
- a sidebar pode voltar a operar em modo colapsável, desde que isso melhore densidade sem prejudicar navegação

## 3. Objetivo

Fechar a fase de polimento visual sistêmico do Atlas para consolidar:

- melhor legibilidade no modo white
- hierarquia clara entre superfícies
- cards mais visíveis e comparáveis
- melhor composição de texto e ritmo de leitura
- avaliação e eventual reintrodução da sidebar colapsável
- base visual pronta para suportar a expansão futura do produto

## 4. Escopo

### Inclui

- revisão global do modo white
- revisão fina do modo dark onde necessário para manter equilíbrio
- reforço de borda, sombra, separação e presença de cards e painéis
- revisão de wrapping e largura útil para textos
- revisão da posição relativa de componentes nas telas principais
- revisão da sidebar como menu colapsável dentro do design atual
- atualização da documentação do SDD para refletir as decisões tomadas

### Não inclui

- criação de novas frentes funcionais de produto
- novas integrações
- novos fluxos de IA/automações
- reescrita completa do design system

## 5. Usuários impactados

- operador da marca
- gestor da marca
- superadmin

## 6. Fluxo esperado

1. o usuário entra no Atlas em white ou dark mode
2. identifica facilmente header, bloco principal, blocos auxiliares e próximos cliques
3. entende a leitura dos cards sem esforço visual
4. navega pela sidebar sem excesso de ruído ou perda de contexto

## 7. Requisitos funcionais

- o modo white deve deixar cards e superfícies claramente visíveis
- blocos principais devem se destacar sem exagero decorativo
- texto em cards não deve quebrar excessivamente em colunas estreitas quando houver alternativa melhor de composição
- a sidebar deve ser reavaliada em modo colapsável e só entrar se melhorar densidade e usabilidade
- toda melhoria deve respeitar o design system atual do Atlas

## 8. Requisitos não funcionais

- consistência entre white e dark mode
- manutenção da base Carbon-like já definida
- visual com direção tecnológica controlada, sem cair em ruído sci-fi
- sem regressão de responsividade
- sem regressão de acessibilidade básica

## 9. Critérios de aceite

- cards deixam de parecer invisíveis no modo white
- o usuário entende para onde olhar primeiro nas telas principais
- a composição textual fica mais confortável
- a sidebar colapsável, se entrar, melhora a navegação em vez de piorar
- as novas frentes do Atlas podem reutilizar essa base visual sem remendos locais

## 10. Áreas prioritárias

- shell global
- Torre de Controle
- Atlas IA
- Integrações
- Mídia
- Tráfego
- Produtos e Insights
- DRE e áreas financeiras

## 11. Riscos e dependências

- risco de melhorar contraste e deixar a interface pesada
- risco de colapsar a sidebar e perder clareza de navegação
- risco de corrigir white mode de forma isolada e gerar divergência com dark mode
- dependência do design system atual e das primitives compartilhadas
