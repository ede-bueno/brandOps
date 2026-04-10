# Atlas SDD

Este diretório define o fluxo de Spec-Driven Development adotado no Atlas.

## Ordem padrão

1. `ATLAS_CONSTITUTION.md`
2. `spec`
3. `plan`
4. `tasks`
5. implementação

## Estrutura

- `docs/sdd/ATLAS_CONSTITUTION.md`
  Princípios não negociáveis do produto e da engenharia.
- `docs/specs/_templates/`
  Templates base para novas frentes.
- `docs/specs/<feature-slug>/spec.md`
  Escopo funcional da feature.
- `docs/specs/<feature-slug>/plan.md`
  Plano técnico e decisões de arquitetura.
- `docs/specs/<feature-slug>/tasks.md`
  Quebra em tarefas com dependências e critérios de aceite.

## Regra de uso

Toda frente relevante deve nascer com:

1. `spec`
2. `plan`
3. `tasks`

Só depois disso a implementação deve começar.

## Quando usar

Use SDD para:

- novas features
- refatorações de UX estrutural
- integrações novas
- mudanças de arquitetura
- novas capacidades de IA
- mudanças que atravessam múltiplos módulos

## Quando não usar

Não precisa abrir spec nova para:

- bugfix pequeno
- ajuste visual localizado
- copy simples
- limpeza técnica sem impacto de produto

## Relação com o PRD vivo

O documento-mãe do produto fica em:

- [ATLAS_PRD_VIVO.md](C:\BrandOps\BrandOps-new\docs\ATLAS_PRD_VIVO.md)

O PRD vivo define o sistema.
Cada `spec` define uma frente específica dentro do sistema.
