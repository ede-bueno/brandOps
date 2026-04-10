# BrandOps

Plataforma interna para gestão multi-marca de operações print on demand.

## O que o sistema cobre hoje

- autenticação real com Supabase
- workspace multi-marca com `SUPER_ADMIN` e acesso isolado por marca
- importação incremental de:
  - `Lista de Pedidos.csv`
  - `Lista de Itens.csv`
  - `Pedidos Pagos.csv`
  - `Meta Export.csv`
  - `feed_facebook.csv`
- deduplicação por chaves de negócio para suportar reimportações por janela
- saneamento persistente de linhas de mídia e pedidos fora da curva
- CMV por tipo de peça com vigência histórica e checkpoint
- centro de custo com lançamento, edição e exclusão de despesas
- dashboard, vendas, mídia, DRE, ajuda e gestão administrativa

## Stack

- `Next.js 15`
- `React 19`
- `TypeScript`
- `Supabase`
- `Tailwind CSS v4`

## Rodando localmente

1. Instale dependências:

```bash
npm install
```

2. Configure o ambiente:

```bash
cp .env.example .env.local
```

3. Preencha no `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

4. Rode em desenvolvimento:

```bash
npm run dev
```

5. Ou valide build de produção:

```bash
npm run build
npm run start
```

## Validações recomendadas antes de deploy

```bash
npm run check
npm run build
```

## Estrutura importante

- `app/` rotas e telas
- `components/` shell, provider e UI compartilhada
- `lib/brandops/` parsing CSV, acesso a dados e métricas
- `supabase/migrations/` fonte de verdade do schema aplicado
- `docs/` auditorias, handoff e documentação operacional

## Produto

A referencia principal do estado atual do projeto esta em [docs/ESTADO_OFICIAL_BRANDOPS.md](C:\Users\edebu\.codex\worktrees\af6d\BrandOps-new\docs\ESTADO_OFICIAL_BRANDOPS.md).

Documentacao complementar:

- [docs/BRANDOPS_HANDOFF_ATUAL.md](C:\Users\edebu\.codex\worktrees\af6d\BrandOps-new\docs\BRANDOPS_HANDOFF_ATUAL.md)
- [docs/PRODUCT_DECISION_ENGINE.md](C:\Users\edebu\.codex\worktrees\af6d\BrandOps-new\docs\PRODUCT_DECISION_ENGINE.md)
- [docs/RUNBOOK_MIGRATIONS_REMOTAS.md](C:\Users\edebu\.codex\worktrees\af6d\BrandOps-new\docs\RUNBOOK_MIGRATIONS_REMOTAS.md)
- [docs/specs/README.md](C:\Users\edebu\.codex\worktrees\af6d\BrandOps-new\docs\specs\README.md)

## Deploy

Guia objetivo em [docs/DEPLOY_VERCEL.md](C:\Users\edebu\.codex\worktrees\af6d\BrandOps-new\docs\DEPLOY_VERCEL.md).
