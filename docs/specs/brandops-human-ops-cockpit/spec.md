# Spec — BrandOps Human Ops Cockpit

## Objetivo

Criar um cockpit operacional humano, em estilo Kanban, onde sugestões aceitas do Atlas virem tarefas acompanháveis por fase, urgência, atraso e cobrança operacional.

## Resultado esperado

- o Atlas sugere uma ação
- o humano aceita a sugestão
- o BrandOps cria uma tarefa operacional automaticamente
- a tarefa entra num board com fases claras
- o sistema destaca o que está atrasado, crítico ou parado

## Escopo

### Inclui
- board Kanban por marca
- fases operacionais configuráveis
- criação automática a partir de sugestões aceitas do Atlas
- urgência, prazo, atraso e responsável
- visão de tarefas pendentes, hoje, atrasadas e concluídas

### Não inclui nesta fase
- automação completa da execução da tarefa
- dependências complexas tipo Gantt
- colaboração multi-time com permissões avançadas

## Critério de aceite

- o Atlas consegue gerar `task_candidate`
- o humano consegue aceitar e transformar em tarefa real
- a tarefa aparece no board da marca
- o board evidencia urgência e atraso sem depender de leitura manual linha a linha
