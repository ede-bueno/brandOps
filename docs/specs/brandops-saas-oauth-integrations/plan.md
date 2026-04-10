# Plan: BrandOps SaaS OAuth Integrations

## 1. Resumo técnico

O BrandOps deve migrar do modelo `credencial técnica por loja` para o modelo `platform-owned OAuth/B2B authorization`.

Isso significa:

- BrandOps mantém os apps oficiais
- cliente consente com login
- backend armazena e renova tokens
- cliente escolhe os ativos que a marca quer expor ao sistema

## 2. Arquivos e módulos impactados

### Frontend

- `app/(app)/integrations/page.tsx`
- componentes de conexão e seleção de ativos

### Backend

- rotas OAuth/callback
- serviços de token exchange/refresh
- serviços de descoberta de ativos
- políticas de revogação e health check

### Banco

- tabelas de conta conectada por provider
- tokens e metadados de autorização
- vínculo entre ativos autorizados e marcas
- trilha de consentimento/revogação

## 3. Estratégia de implementação

### Fase 1 — Google

- criar fluxo OAuth web/server do BrandOps
- listar propriedades / assets elegíveis
- persistir refresh token e vínculo com a marca

### Fase 2 — Meta

- criar fluxo de autorização oficial para negócios e ativos da Meta
- suportar contas de anúncio, páginas e Instagram Business conectáveis
- persistir tokens e asset bindings

### Fase 3 — Operação SaaS

- reconexão
- reconsentimento
- revogação
- health checks
- observabilidade por marca

## 4. Decisões de arquitetura

- o BrandOps será o `client application` oficial
- o cliente precisa ter acesso aos ativos, não criar app próprio
- tokens nunca ficam no frontend
- integração continua segregada por marca

## 5. Riscos técnicos

- revisão de app e escopos sensíveis
- expiração e revogação de tokens
- diferenças entre permissões de leitura e de gestão
- complexidade maior para Meta do que para Google

## 6. Estratégia de validação

- validação de login e consentimento por provider
- validação de refresh token
- validação de descoberta de ativos
- validação de revogação
- `type-check`
- `lint`
- `build`
