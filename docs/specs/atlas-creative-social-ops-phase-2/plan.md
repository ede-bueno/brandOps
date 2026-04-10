# Plan: Atlas Creative Social Ops - Fase 2

## 1. Resumo técnico

A fase nasce como uma camada operacional nova, focada em backlog criativo, proposta textual e aprovação humana. O objetivo é preparar o terreno para publicação e agendamento sem acoplar integração social completa logo de saída.

## 2. Arquivos e módulos impactados

- `docs/ATLAS_PRD_VIVO.md`
- `lib/brandops/types.ts`
- `lib/brandops/routes.ts`
- `components/AppShell.tsx`
- `app/(app)/...` da nova área de creative ops
- possíveis APIs em `app/api/admin/brands/[brandId]/...`
- schema/migrations Supabase para tarefas e histórico de aprovação
- componentes compartilhados de workspace e tabela

## 3. Estratégia de implementação

1. modelar tipos e schema de tarefa criativa
2. criar rota e shell da nova área
3. implementar backlog com filtros por status, origem e prioridade
4. criar formulário/base para abertura e edição da tarefa
5. criar geração inicial de rascunho textual
6. implementar aprovação humana e transição de status
7. preparar saída para `agendar/publicar` como estados, sem integração final ainda

## 4. Decisões de arquitetura

- a feature deve nascer como fluxo operacional auditável, não como chat genérico
- a IA gera proposta textual dentro do contexto da tarefa, não fora dele
- aprovação deve ser persistida como evento, com responsável e timestamp
- publicação social real fica isolada para uma fase futura

## 5. Riscos técnicos

- expandir escopo cedo demais para social publishing completo
- misturar responsabilidade de backlog criativo com Atlas IA conversacional
- gerar schema insuficiente para suportar futura automação por agente

## 6. Estratégia de validação

- type-check
- lint
- build
- validação de runtime da nova área
- validação do fluxo:
  - criar tarefa
  - gerar rascunho
  - aprovar
  - mover status
