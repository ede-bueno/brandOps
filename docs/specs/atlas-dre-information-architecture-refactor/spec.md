# Spec: Atlas DRE Information Architecture Refactor

## 1. Contexto

O Atlas já possui camada canônica de DRE, KPIs financeiros, lançamentos operacionais e leituras complementares de margem e despesa.

O problema atual não é falta de dado. É excesso de informação concorrendo na mesma superfície.

## 2. Problema

Hoje a experiência de DRE mistura, na mesma área:

- leitura mensal consolidada
- dashboard executivo
- operação de lançamentos
- análises auxiliares de despesa e categoria

Isso gera ruído, dificulta onboarding de novos usuários e esconde a visão mais importante do momento: o DRE mensal por período.

## 3. Objetivo

Reorganizar a arquitetura de informação do domínio financeiro para que o Atlas abra a leitura certa primeiro, reduza poluição visual e separe claramente:

- DRE mensal
- resumo executivo
- operação de lançamentos

## 4. Escopo

### Inclui

- redefinir a prioridade visual do DRE mensal
- separar resumo executivo em aba ou superfície própria
- simplificar a tela de lançamentos DRE
- reduzir blocos secundários expostos por padrão
- revisar o livro de lançamentos para formato operacional mais escalável
- alinhar navegação e nomenclatura do domínio financeiro

### Não inclui

- mudança da semântica financeira canônica
- reescrita dos cálculos do backend
- nova frente de IA financeira
- automação de conciliação contábil

## 5. Usuários impactados

- operador financeiro da marca
- gestor da marca
- usuário novo tentando localizar o DRE rapidamente

## 6. Fluxo esperado

1. usuário entra em `DRE`
2. vê primeiro a grade mensal consolidada
3. aprofunda em resumo executivo só quando precisar
4. entra em lançamentos apenas quando a intenção for operar
5. usa o livro de lançamentos com busca, filtros e paginação, sem lista infinita confusa

## 7. Requisitos funcionais

- a rota principal de DRE deve priorizar a grade mensal
- resumo executivo deve existir como aba ou modo separado
- lançamentos DRE devem existir como experiência operacional própria
- blocos como categoria, composição e leituras auxiliares devem ficar em segundo plano
- livro de lançamentos deve permitir navegação operacional mais controlada
- a navegação deve deixar claro onde o usuário está: `DRE`, `Resumo`, `Lançamentos`

## 8. Requisitos não funcionais

- respeitar o design system atual do Atlas
- reduzir densidade cognitiva sem perder capacidade analítica
- evitar dashboard inflado no domínio financeiro
- manter coerência com a camada canônica já existente
- melhorar descoberta para usuário novo

## 9. Critérios de aceite

- um usuário novo consegue localizar a grade mensal do DRE sem esforço
- a tela principal de DRE deixa clara a visão mensal consolidada
- resumo executivo não concorre visualmente com a grade mensal
- lançamentos DRE deixam de parecer uma tela híbrida entre dashboard e operação
- livro de lançamentos deixa de ser uma lista gigante sem controle

## 10. Riscos e dependências

- mover informação demais pode esconder análises úteis
- simplificar demais pode prejudicar o operador financeiro avançado
- é preciso respeitar a verdade canônica e não confundir UX com mudança de regra de negócio
