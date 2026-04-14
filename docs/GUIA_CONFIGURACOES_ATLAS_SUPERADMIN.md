# Guia Interno de Configurações do Atlas

## Escopo

Este documento é interno e foi pensado para administração da plataforma, operação técnica e superadmin.

Ele cobre:

- ambiente
- Vercel
- Supabase
- migrations
- governança técnica de integrações
- detalhes internos do Atlas IA

Use este material como complemento dos tutoriais operacionais da loja.

---

## Variáveis críticas da plataforma

### Base Supabase

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Segredos por marca

- `BRANDOPS_SECRET_ENCRYPTION_KEY`

Essa chave é a base para:

- token da Meta por loja
- JSON do GA4 por loja
- chave Gemini por loja

Regras:

- precisa existir no ambiente que lê e grava segredos
- deve permanecer estável entre deploys
- se mudar, segredos antigos podem deixar de ser legíveis

### Auxiliares e legado

- `GEMINI_MODEL`
- `META_API_VERSION`
- `GA4_SERVICE_ACCOUNT_JSON`
- `GA4_SERVICE_ACCOUNT_FILE`
- `META_ACCESS_TOKEN`
- `GEMINI_API_KEY`

Observação:

- a operação normal de Meta, GA4 e Gemini está no modelo por loja
- variáveis globais de provedor não devem ser o caminho principal

---

## Vercel

### Onde cadastrar envs

No projeto:

1. `Project Settings`
2. `Environment Variables`
3. definir envs por ambiente
4. redeploy

### Ambientes

- `Production`
- `Preview`
- `Development`

Se mais de um ambiente apontar para o mesmo conjunto de segredos, ele precisa usar a mesma `BRANDOPS_SECRET_ENCRYPTION_KEY`.

---

## Supabase

### Responsabilidades do banco

- autenticação
- dados da marca
- integrações
- segredos por loja
- memória do Atlas IA
- aprendizado do negócio
- governança por plano

### Aplicação de migrations

Runbook:

- [RUNBOOK_MIGRATIONS_REMOTAS.md](C:\BrandOps\BrandOps-new\docs\RUNBOOK_MIGRATIONS_REMOTAS.md)

Script:

- [apply-remote-migrations.ps1](C:\BrandOps\BrandOps-new\scripts\apply-remote-migrations.ps1)

Bloqueio atual conhecido:

- aplicar migrations remotas exige `SUPABASE_DB_PASSWORD`

### Migrations recentes que afetam a operação do Atlas

- `20260404190001_brandops_atlas_brand_learning.sql`
- `20260404200001_brandops_brand_governance.sql`
- `20260404213001_brandops_atlas_learning_feedback.sql`

---

## Governança SaaS

### Planos

- `starter`
- `growth`
- `scale`
- `enterprise`

### Feature flags atuais

- `atlasAi`
- `atlasCommandCenter`
- `brandLearning`
- `geminiModelCatalog`

### Regra prática

- `starter` entra muito restrito
- `growth` libera IA e learning
- `scale` libera Torre com IA
- `enterprise` mantém tudo liberado

Arquivo-base:

- [governance.ts](C:\BrandOps\BrandOps-new\lib\brandops\governance.ts)

---

## Integrações por loja

### Meta

Persistência:

- configuração em `brand_integrations`
- segredo em `brand_integration_secrets`

Campos operacionais:

- `adAccountId`
- `catalogId`
- `manualFallback`
- `syncWindowDays`

### GA4

Persistência:

- configuração em `brand_integrations`
- segredo em `brand_integration_secrets`

Campos operacionais:

- `propertyId`
- `timezone`

### Gemini

Persistência:

- configuração em `brand_integrations`
- segredo em `brand_integration_secrets`

Campos operacionais:

- `model`
- `temperature`
- `analysisWindowDays`
- `defaultSkill`
- `operatorGuidance`

Arquivos centrais:

- [integration-config.ts](C:\BrandOps\BrandOps-new\lib\brandops\integration-config.ts)
- [config.ts](C:\BrandOps\BrandOps-new\lib\brandops\ai\config.ts)
- [integration-secrets.ts](C:\BrandOps\BrandOps-new\lib\brandops\integration-secrets.ts)

---

## Atlas IA

### Estratégia

O Atlas IA deve:

- ler dados já consolidados
- usar o backend como fonte de verdade
- evitar cálculo crítico no frontend
- separar configuração de comportamento da ativação da integração

### Onde cada decisão mora

- ativação técnica do Gemini: `Integrações`
- comportamento do agente: `Configurações`
- decisão e leitura: `Torre`

---

## Erros internos mais importantes

### `BRANDOPS_SECRET_ENCRYPTION_KEY não configurada`

Significa:

- ambiente sem preparo para salvar segredos por marca

### `Could not find the table 'public.brand_integration_secrets' in the schema cache`

Significa:

- migration faltando ou schema cache ainda desatualizado

### `brand_integrations_provider_check`

Significa:

- banco ainda não aceitou um provider novo

### `Unsupported state or unable to authenticate data`

Se apareceu após alteração de ambiente:

- suspeitar de divergência na chave de criptografia usada para ler segredos

---

## Recomendações operacionais

- não expor mensagens de infraestrutura para operador comum
- manter mensagens detalhadas só para camada de administração técnica
- usar tutoriais públicos na aba de integrações
- manter runbooks técnicos fora da ajuda operacional

---

## Responsável principal

Este material é destinado ao superadmin e à gestão técnica da plataforma.

Uso operacional do dia a dia deve se apoiar em:

- [GUIA_CONFIGURACOES_ATLAS.md](C:\BrandOps\BrandOps-new\docs\GUIA_CONFIGURACOES_ATLAS.md)
- [TUTORIAL_INTEGRACOES_POR_LOJA.md](C:\BrandOps\BrandOps-new\docs\TUTORIAL_INTEGRACOES_POR_LOJA.md)
