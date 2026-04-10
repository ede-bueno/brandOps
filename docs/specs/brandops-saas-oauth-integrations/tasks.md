# Tasks: BrandOps SaaS OAuth Integrations

## 1. Preparação

- [ ] alinhar a frente ao PRD vivo
- [ ] confirmar escopos mínimos por provider
- [ ] mapear o estado atual das integrações técnicas por loja

## 2. Google OAuth

- [ ] modelar fluxo OAuth web/server do BrandOps
- [ ] modelar persistência de token e refresh
- [ ] modelar seleção de propriedade/asset

## 3. Meta OAuth / autorização de negócio

- [ ] modelar fluxo oficial de autorização
- [ ] modelar seleção de ativos da Meta
- [ ] mapear permissões mínimas para leitura de Ads / Facebook / Instagram

## 4. Infraestrutura SaaS

- [ ] criar modelo de conta conectada por marca
- [ ] modelar revogação, reconsentimento e health checks
- [ ] definir requisitos de app review, privacy policy e callback de exclusão

## 5. Execução futura

- [ ] abrir implementação por provider começando por Google
- [ ] depois executar Meta

## 6. Validação

- [ ] type-check
- [ ] lint
- [ ] build
- [ ] validação de fluxo de consentimento

## 7. Critério final

- [ ] o BrandOps fica pronto para integrar Google e Meta como SaaS
- [ ] o cliente não precisa criar app/API própria para conectar a plataforma
