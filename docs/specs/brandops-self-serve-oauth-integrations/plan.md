# Plan — BrandOps Self-Serve OAuth Integrations

## Fase 1 — arquitetura e credenciais
- definir apps OAuth oficiais do BrandOps para Google e Meta
- mapear escopos mínimos por conector
- definir storage seguro para tokens por marca

## Fase 2 — backend
- criar callbacks OAuth por provedor
- salvar conexão, refresh token, expiração e ativos escolhidos
- criar rotas de reconnect/disconnect

## Fase 3 — frontend
- redesenhar `Integrações` para fluxo self-serve
- adicionar seleção de ativos pós-autorização
- exibir estado operacional por conector

## Fase 4 — resiliência
- tratar expiração e revogação
- adicionar auditoria e mensagens operacionais
- testar reautorização e desconexão

## Validação
- type-check
- lint
- build
- teste de login OAuth Google
- teste de login OAuth Meta
- teste de reconnect
