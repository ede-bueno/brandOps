# Runbook de migrations remotas

## Objetivo

Aplicar no projeto Supabase remoto as migrations locais que ainda não foram executadas.

No estado atual do Atlas, as migrations pendentes são:

- `20260404190001_brandops_atlas_brand_learning.sql`
- `20260404200001_brandops_brand_governance.sql`
- `20260404213001_brandops_atlas_learning_feedback.sql`

## O que essas migrations habilitam

- `20260404190001`: cria a base persistente do modo `Aprender negócio`, com histórico de execuções e snapshots aprendidos por marca.
- `20260404200001`: adiciona governança SaaS por marca em `public.brands`, com `plan_tier` e `feature_flags`.
- `20260404213001`: adiciona feedback humano sobre snapshots de aprendizado para validar se o Atlas entendeu corretamente o negócio.

## Pré-requisito

O Supabase CLI exige a senha do Postgres remoto para `db push`.

Defina a variável abaixo no terminal antes de executar:

```powershell
$env:SUPABASE_DB_PASSWORD="SUA_SENHA_DO_POSTGRES_REMOTO"
```

## Execução

### Caminho padrão

```powershell
.\scripts\apply-remote-migrations.ps1
```

### Caminho forçando todas as migrations ausentes

Use apenas se o histórico remoto estiver parcial ou desalinhado.

```powershell
.\scripts\apply-remote-migrations.ps1 -IncludeAll
```

## Validação

Depois da execução, confirme:

```powershell
npx supabase migration list
```

O esperado é que `Local` e `Remote` mostrem também:

- `20260404190001`
- `20260404200001`
- `20260404213001`

## Observações operacionais

- O projeto remoto já está vinculado ao ref `nuhznrxzfslqepmqjgoo`.
- O bloqueio atual não é de código nem de vínculo com a Supabase; é apenas a ausência da `SUPABASE_DB_PASSWORD` nesta sessão local.
- Sem essas migrations remotas, o código novo já existe, mas os recursos de aprendizado do negócio, feedback humano e governança SaaS não ficam totalmente ativos no banco de produção.
