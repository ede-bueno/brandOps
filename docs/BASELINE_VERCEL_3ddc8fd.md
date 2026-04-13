# Baseline Vercel - 3ddc8fd

## Referencia oficial
- Deployment Vercel de referencia: `GEantt8ho`
- Ambiente: `Production`
- Data de criacao observada no painel: `2026-04-09`
- Commit de referencia: `3ddc8fd`
- Mensagem: `fix: remove aviso do plugin Next no lint`
- Branch historica associada no painel: `codex/atlas-consolidado-local`

## Objetivo deste baseline
Este documento existe para evitar perda de contexto sobre qual versao foi validada como referencia visual e funcional pelo time.

Quando houver duvida sobre "qual e a versao certa do produto", a primeira comparacao deve ser feita contra este baseline.

## Branches de trabalho
- `main`: trilho principal do repositorio
- `codex/rollback-vercel-3ddc8fd`: branch local criada para restaurar exatamente a referencia do deployment
- Branches de feature futuras devem nascer desta baseline quando o objetivo for continuar a partir da versao validada

## Procedimento recomendado antes de alterar o produto
1. Confirmar branch atual com `git status --short --branch`
2. Confirmar commit atual com `git log --oneline -1`
3. Se houver divergencia visual ou funcional, comparar contra `3ddc8fd`
4. Se o objetivo for validacao estavel local, preferir `npm run build` seguido de `npm run start`

## Observacao sobre ambiente local
O projeto pode apresentar inconsistencias em `next dev` com assets CSS do App Router.

Para validacao fiel da baseline, usar:

```powershell
npm run build
npm run start
```

## Regra operacional
Nao assumir que a branch mais recente representa a referencia correta do produto.

Sempre que houver rollback, congelar a referencia em:
- commit identificado
- branch dedicada
- documento de baseline
- tag Git quando aplicavel
