# Spec: Refatoração do Radar da Torre do Atlas

## 1. Contexto

A Torre de Controle já possui a camada `Atlas IA` com duas visões:

- `Mesa`
- `Radar`

A `Mesa` foi reorganizada para leitura e decisão.
O `Radar` ainda precisa convergir para a mesma linguagem visual e funcional.

## 2. Problema

Hoje o `Radar` ainda corre risco de:

- parecer uma tela paralela à Mesa
- não deixar clara a hierarquia entre sinal dominante, fila de alertas e próximo clique
- repetir padrões antigos de card e bloco sem a mesma disciplina da Mesa

## 3. Objetivo

Refatorar a aba `Radar` da Torre do Atlas para que ela:

- compartilhe a mesma linguagem da `Mesa`
- priorize o sinal principal do corte
- organize os alertas secundários com clareza
- mantenha CTAs objetivos para aprofundamento factual e retorno à mesa

## 4. Escopo

### Inclui

- reorganização do layout da aba `Radar`
- revisão de hierarquia entre alerta principal, fila e próximos movimentos
- revisão de CTAs e textos auxiliares
- alinhamento visual com a `Mesa do Atlas`

### Não inclui

- mudanças na lógica de cálculo financeiro
- novos conectores
- automação do Atlas IA
- function calling ou execução por agentes

## 5. Usuários impactados

- operador da marca
- gestor da marca
- superadmin em revisão operacional

## 6. Fluxo esperado

1. usuário abre `Torre de Controle`
2. entra em `Atlas IA`
3. alterna para `Radar`
4. entende o sinal dominante do corte
5. escolhe aprofundar o sinal ou voltar à `Mesa`

## 7. Requisitos funcionais

- o `Radar` deve abrir com um bloco principal de prioridade
- a fila secundária de sinais deve ficar claramente abaixo ou ao lado do principal
- deve existir CTA explícito para:
  - abrir a leitura factual correspondente
  - voltar à `Mesa`
- o `Radar` não deve repetir contexto já visível no shell global

## 8. Requisitos não funcionais

- seguir o design system atual do Atlas
- manter densidade operacional
- funcionar em white e dark mode
- preservar responsividade

## 9. Critérios de aceite

- usuário identifica o principal sinal em poucos segundos
- CTA principal do `Radar` aponta para destino correto
- `Radar` e `Mesa` parecem partes da mesma experiência
- não há blocos inflados competindo entre si

## 10. Riscos e dependências

- risco de duplicar a função da `Mesa`
- risco de repetir cards antigos da Torre
- dependência dos componentes compartilhados de shell e analytics
