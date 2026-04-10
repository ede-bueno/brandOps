# Spec: Atlas Creative Social Ops - Fase 2

## 1. Contexto

A Fase 1 abriu a leitura operacional por anúncio dentro de mídia e já permite separar quais ads devem escalar, revisar criativo, revisar público ou pausar.

O próximo passo natural do Atlas é transformar essa leitura em operação criativa auditável, sem pular direto para automação total.

## 2. Problema

Hoje o Atlas consegue apontar sinais e priorizar anúncios, mas ainda não possui uma camada operacional para:

- transformar um insight em tarefa criativa
- organizar fila de produção por marca
- registrar rascunhos e propostas de conteúdo
- submeter a produção para aprovação humana
- preparar publicação imediata ou agendada

Sem essa camada, o Atlas continua dependente de execução externa e perde parte importante do valor operacional prometido.

## 3. Objetivo

Criar a primeira camada de `creative ops` do Atlas, conectando sinais do sistema a tarefas criativas estruturadas, com aprovação humana obrigatória antes de qualquer publicação.

## 4. Escopo

### Inclui

- backlog operacional de tarefas criativas por marca
- tarefas criadas manualmente e também a partir de sinais do Atlas
- classificação da tarefa por origem, objetivo e prioridade
- status operacional da tarefa
- workspace inicial para revisão da tarefa
- rascunho textual inicial para anúncio ou post social
- fluxo de aprovação humana
- estados de saída:
  - `rascunho`
  - `pronto para aprovar`
  - `aprovado`
  - `agendado`
  - `publicado`

### Não inclui

- publicação automática sem aprovação humana
- geração de imagem final multimodal
- execução por agente autônomo
- integração completa com Instagram/Facebook Publishing API
- calendário editorial avançado multi-canal

## 5. Usuários impactados

- operador da marca
- gestor da marca
- futuro operador criativo da marca

## 6. Fluxo esperado

1. Atlas ou operador identifica uma oportunidade
2. uma tarefa criativa é criada no backlog da marca
3. a tarefa recebe contexto de origem, objetivo e hipótese
4. o operador abre a tarefa e pede um rascunho
5. Atlas devolve proposta curta de copy e direcionamento
6. o humano ajusta e aprova
7. a tarefa segue para `agendar` ou `publicar`

## 7. Requisitos funcionais

- permitir cadastro e listagem de tarefas criativas por marca
- suportar origem:
  - manual
  - mídia
  - tráfego
  - produtos
  - Atlas IA
- suportar tipo:
  - anúncio
  - post social
  - criativo
  - teste de copy
- suportar prioridade e status operacional
- armazenar contexto estruturado da tarefa
- permitir gerar rascunho textual a partir do contexto
- registrar responsável, data e ação de aprovação
- manter histórico simples de alterações de status

## 8. Requisitos não funcionais

- fluxo auditável por marca
- nada publica sem aprovação humana explícita
- narrativa do Atlas deve ser factual e derivada do contexto da tarefa
- design system atual do Atlas deve ser respeitado
- a nova área não deve duplicar contexto global já presente no header

## 9. Critérios de aceite

- existe uma área inicial de `Creative Ops` no Atlas
- uma tarefa pode ser criada com contexto estruturado
- uma tarefa pode receber rascunho textual inicial
- um humano pode aprovar ou devolver para ajuste
- a tarefa deixa claro se está só em rascunho, pronta, aprovada ou agendada
- a feature não quebra mídia, torre ou integrações existentes

## 10. Riscos e dependências

- definir se a área nasce dentro de `Plataforma`, `Operação` ou como nova trilha própria
- evitar misturar backlog criativo com publicações já enviadas
- não prometer integração social antes da camada operacional estar sólida
- garantir que a IA não invente contexto ausente da tarefa
