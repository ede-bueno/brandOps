# Spec: BrandOps SaaS OAuth Integrations

## 1. Contexto

Se o BrandOps se tornar um SaaS comercializável, o cliente não deve precisar criar o próprio app de API para conectar Meta ou Google Analytics. O fluxo comercial correto é o cliente autorizar o BrandOps com a própria conta e com as permissões já existentes sobre propriedades, contas e ativos.

## 2. Problema

Hoje a operação ainda está muito próxima do modelo `credencial técnica por loja`, o que aumenta atrito comercial, suporte, erro de configuração e bloqueia escala do produto como SaaS.

## 3. Objetivo

Projetar a evolução das integrações para um fluxo `OAuth/B2B authorization` em que:

- o BrandOps é dono da aplicação integrada
- o cliente só faz login e consente
- tokens e ativos ficam vinculados à marca no backend
- sincronização e governança passam a ser responsabilidade do BrandOps

## 4. Escopo

### Inclui

- integração OAuth para Google Analytics
- integração OAuth / Business authorization para Meta/Facebook/Instagram
- seleção de ativos após autorização
- refresh/renovação segura de tokens
- governança multi-tenant
- trilha de consentimento e revogação

### Não inclui

- obrigar cada cliente a criar app/API própria
- publicação social ou gestão de anúncios em massa nesta primeira fase
- suporte irrestrito a qualquer provider novo sem app review próprio

## 5. Usuários impactados

- operador da marca
- gestor da marca
- superadmin da plataforma
- time comercial / onboarding do SaaS

## 6. Fluxo esperado

1. o cliente entra em `Integrações`
2. escolhe conectar `Google` ou `Meta`
3. o BrandOps redireciona para autorização oficial
4. o cliente faz login e consente os escopos necessários
5. o BrandOps recebe tokens e lista os ativos elegíveis
6. o cliente escolhe conta/propriedade/ativos a usar
7. a sincronização passa a funcionar sem que o cliente precise criar app próprio

## 7. Requisitos funcionais

- o BrandOps deve possuir apps oficiais próprios para OAuth/Business authorization
- o cliente deve conseguir conectar:
  - Google Analytics por login OAuth
  - Meta Ads / Facebook / Instagram por autorização oficial
- o sistema deve suportar:
  - refresh/renovação de token
  - troca de ativo vinculado
  - revogação
  - auditoria de última autorização
  - falha de permissão e reconsentimento
- o cliente continua precisando ter acesso legítimo aos ativos, mas não precisa criar app próprio

## 8. Requisitos não funcionais

- armazenamento seguro de tokens
- segregação multi-marca
- observabilidade e trilha de consentimento
- conformidade com app review e políticas dos providers
- pronto para operação comercial de SaaS

## 9. Critérios de aceite

- o cliente conecta Google/Meta via login e consentimento
- o BrandOps assume o papel de app integrado
- não é mais necessário pedir que cada cliente crie API própria
- o backend consegue manter refresh e reconexão com segurança

## 10. Riscos e dependências

- dependência de aprovação de app, verificação e políticas dos providers
- dependência de armazenamento seguro de tokens e refresh
- necessidade de consent screen, privacy policy, deletion callback e governança operacional

## 11. Referências oficiais

- Google OAuth 2.0: <https://developers.google.com/identity/protocols/oauth2>
- Google OAuth para apps web/server: <https://developers.google.com/identity/protocols/oauth2/web-server>
- Google Analytics Data API: <https://developers.google.com/analytics/devguides/reporting/data/v1>
- Meta Marketing API authorization: <https://developers.facebook.com/docs/marketing-api/overview/authorization/>
- Meta permissions reference: <https://developers.facebook.com/docs/permissions/reference>
