# Spec — BrandOps Self-Serve OAuth Integrations

## Objetivo

Permitir que clientes SaaS do BrandOps conectem `Meta Ads`, `Facebook`, `Instagram` e `Google Analytics` por autorização OAuth dentro do próprio produto, sem precisar criar app, token técnico ou projeto OAuth por conta própria.

## Problema

Hoje a operação depende de configuração técnica sensível demais para um cliente SaaS comum. Isso cria fricção comercial, atraso de onboarding e risco de abandono na etapa de integração.

## Resultado esperado

- o cliente entra no BrandOps
- escolhe a fonte que deseja conectar
- autentica com sua conta Google ou Meta
- autoriza o BrandOps a acessar os dados permitidos
- seleciona conta, propriedade, página, business ou ad account
- a integração entra em estado ativo sem exigir configuração técnica externa

## Escopo

### Inclui
- fluxo OAuth do Google para GA4
- fluxo OAuth da Meta para Facebook, Instagram e Marketing API
- seleção de ativos autorizados após login
- armazenamento seguro de refresh/access tokens no backend
- status operacional claro por marca
- reautorização quando o token expirar ou perder permissão
- trilha auditável de autorização e escopo concedido

### Não inclui nesta fase
- publicação social automática
- edição de criativos pela API da Meta
- multi-tenant billing por uso de integração
- conexão com TikTok Ads ou outras fontes adicionais

## Requisitos funcionais

1. o BrandOps deve possuir app OAuth próprio para Google e Meta
2. o cliente não deve precisar criar app, projeto ou credencial externa
3. após autenticar, o usuário deve conseguir escolher os ativos corretos da marca
4. a integração deve ficar vinculada à marca ativa no BrandOps
5. o sistema deve detectar perda de permissão e pedir reautorização
6. a UI deve mostrar claramente `conectado`, `atenção` ou `reconectar`
7. o backend deve guardar tokens de forma segura e renovável
8. o sistema deve permitir desconectar a fonte sem apagar o histórico importado

## Requisitos não funcionais

- segregação multi-tenant rígida por marca
- storage seguro de segredos e tokens
- auditabilidade de autorização
- UX de onboarding simples o suficiente para um usuário não técnico
- mensagens de erro orientadas à ação

## Riscos

- revisão de app e permissões da Meta
- limites e políticas do Google para GA4
- escopos excessivos gerando reprovação em revisão
- tokens expirados ou permissões revogadas em ambiente real

## Critério de aceite

- um cliente SaaS comum conecta GA4 sem criar credencial manual
- um cliente SaaS comum conecta Meta sem criar app próprio
- o BrandOps mostra estado, ativo escolhido e última autorização
- a integração continua funcionando com refresh token válido
- quando a autorização quebra, o sistema aponta reconexão de forma clara
