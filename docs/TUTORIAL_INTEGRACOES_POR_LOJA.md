# Tutorial de Integrações por Loja no BrandOps

## Objetivo

Este guia orienta a configuração das integrações por loja no BrandOps.

Regras atuais do produto:
- cada marca deve salvar sua própria credencial
- Meta e GA4 não devem depender da chave global da plataforma para operação normal
- o backend salva os segredos por marca de forma criptografada
- a OH MyDog deve receber como segredo próprio os mesmos dados que antes estavam sendo usados como credenciais da plataforma

## Pré-requisitos de infraestrutura

Antes de tentar salvar qualquer credencial por loja, confirme que o ambiente do servidor tem:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BRANDOPS_SECRET_ENCRYPTION_KEY`

Sem `BRANDOPS_SECRET_ENCRYPTION_KEY`, o BrandOps não consegue criptografar e persistir tokens e JSONs por marca.

Regras para `BRANDOPS_SECRET_ENCRYPTION_KEY`:
- usar um valor longo e estável
- manter o mesmo valor entre deploys
- não trocar depois que já existirem segredos salvos

## Como cadastrar a BRANDOPS_SECRET_ENCRYPTION_KEY na Vercel

1. Abra o projeto do BrandOps na Vercel.
2. Entre em `Project Settings`.
3. Abra `Environment Variables`.
4. Crie a variável `BRANDOPS_SECRET_ENCRYPTION_KEY`.
5. Cole o valor gerado para a chave.
6. Marque os ambientes `Production`, `Preview` e `Development`.
7. Salve a variável.
8. Faça um novo deploy para o runtime carregar a env.

Importante:
- use o mesmo valor em todos os deploys
- não troque a chave depois de começar a salvar segredos por marca
- se a chave mudar, os segredos antigos deixam de ser legíveis

## Fluxo recomendado por loja

1. Selecione a marca correta no BrandOps.
2. Abra a aba `Integrações`.
3. Configure primeiro o modo e os identificadores operacionais.
4. Salve a configuração.
5. Salve a credencial própria da loja.
6. Só depois execute a sincronização.

## Meta Ads

### O que a loja precisa informar

- modo: `API` ou `Upload manual`
- `ID da conta de anúncios`
- `ID do catálogo` quando usar catálogo da Meta
- token próprio da Meta para essa loja

### Como configurar

1. Abra `Integrações`.
2. Entre em `Meta Ads`.
3. Defina o modo `API` se a loja vai sincronizar mídia e catálogo.
4. Preencha `ID da conta de anúncios`.
5. Preencha `ID do catálogo da Meta` se quiser sincronizar catálogo.
6. Salve a configuração.
7. Cole o token da Meta da própria loja.
8. Clique em `Salvar credencial Meta`.
9. Teste `Sincronizar Meta agora`.
10. Se houver catálogo, teste `Sincronizar catálogo`.

### Erros comuns da Meta

#### `Nenhum token da Meta foi enviado para a sincronização`
Causa:
- a loja ainda não salvou seu token próprio

Ação:
- voltar ao painel da loja e salvar o token da Meta

#### `(#100) This application has not been approved to use this api`
Causa:
- o token existe, mas o app/token não tem capability ou permissão para essa API

Ação:
- gerar token com o app correto
- revisar permissões do app no Meta for Developers
- revisar acessos do catálogo e do Business Manager
- confirmar que o token tem acesso ao catálogo usado pela loja

#### `ID do catálogo da Meta não informado`
Causa:
- o catálogo foi acionado sem `catalogId`

Ação:
- salvar o `ID do catálogo` antes de sincronizar

## Google Analytics 4

### O que a loja precisa informar

- modo: `API`
- `Property ID`
- `Timezone` da propriedade
- JSON da service account com acesso de leitura

### Como configurar

1. Abra `Integrações`.
2. Entre em `Google Analytics 4`.
3. Defina o modo `API`.
4. Preencha `Property ID`.
5. Ajuste a `Timezone` se necessário.
6. Salve a configuração.
7. Cole o JSON completo da service account da própria loja.
8. Clique em `Salvar credencial GA4`.
9. Execute `Sincronizar GA4 agora`.

### Checklist do GA4

- a service account precisa existir no Google Cloud
- a API do Analytics Data precisa estar habilitada
- o email da service account precisa ter acesso à propriedade GA4
- o JSON deve estar completo, com `client_email` e `private_key`

## OH MyDog

A OH MyDog já tinha credenciais equivalentes no ambiente da plataforma. No modelo novo, isso não basta.

Ação obrigatória:
- salvar na própria marca OH MyDog o token da Meta
- salvar na própria marca OH MyDog o JSON do GA4

Objetivo:
- a loja passar a operar com segredos próprios persistidos no banco, e não mais depender de variáveis globais da plataforma

## Ordem de migração recomendada

1. Garantir `BRANDOPS_SECRET_ENCRYPTION_KEY` no ambiente.
2. Migrar OH MyDog primeiro.
3. Validar Meta sync.
4. Validar Meta catálogo.
5. Validar GA4.
6. Repetir o fluxo para as demais lojas.

## Critérios de sucesso

Uma integração por loja está correta quando:
- a configuração operacional foi salva
- a credencial própria foi salva
- a sincronização executa sem depender de env global da plataforma
- o erro exibido, quando existir, é de permissão do provedor e não de infraestrutura do BrandOps


