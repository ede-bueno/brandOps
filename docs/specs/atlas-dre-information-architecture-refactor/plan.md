# Plan: Atlas DRE Information Architecture Refactor

## 1. Resumo técnico

A frente deve reorganizar o domínio financeiro por intenção de uso. A prioridade é fazer a rota principal de DRE abrir na grade mensal consolidada, deslocando dashboard executivo e operação de lançamentos para superfícies próprias ou abas claramente distintas.

## 2. Arquivos e módulos impactados

- `docs/ATLAS_PRD_VIVO.md`
- `app/(app)/dre/page.tsx`
- `app/(app)/cost-center/page.tsx`
- `app/(app)/sales/page.tsx`
- componentes financeiros compartilhados
- componentes de shell e tabs reutilizados no domínio financeiro
- possíveis rotas novas ou subtabs para lançamentos DRE

## 3. Estratégia de implementação

1. mapear a intenção real de cada tela financeira atual
2. definir a nova hierarquia: `DRE mensal`, `Resumo executivo`, `Lançamentos`
3. simplificar a rota principal de DRE para abrir na grade mensal
4. mover blocos secundários para abas, seções recolhidas ou telas auxiliares
5. refatorar o livro de lançamentos para experiência operacional escalável
6. revisar copy, navegação e títulos para descoberta rápida

## 4. Decisões de arquitetura

- a UX deve seguir a intenção do usuário, não a conveniência do componente atual
- a grade mensal é a superfície primária do DRE
- resumo executivo é uma leitura derivada, não a porta principal
- operação de lançamento deve ser tratada como fluxo operacional separado
- o domínio financeiro deve servir como referência de clareza para o restante do Atlas

## 5. Riscos técnicos

- acoplamento entre componentes financeiros hoje pode dificultar separação limpa
- algumas telas podem depender de dados preparados para o layout atual
- remover excesso visual sem perder profundidade exige revisão cuidadosa de cada bloco

## 6. Estratégia de validação

- type-check
- lint
- build
- validação de runtime do fluxo financeiro
- validação de descoberta:
  - entrar em `DRE`
  - localizar grade mensal imediatamente
  - abrir resumo executivo de forma clara
  - acessar lançamentos sem ambiguidade
