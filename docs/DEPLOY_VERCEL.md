# Deploy na Vercel

## Pré-requisitos

- projeto Supabase com migrations aplicadas
- variáveis configuradas na Vercel
- build local passando com `npm run build`

## Variáveis obrigatórias

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Passo a passo

1. Importar o repositório na Vercel.
2. Framework preset: `Next.js`.
3. Adicionar as variáveis de ambiente acima em `Project Settings > Environment Variables`.
4. Garantir que o comando de build fique como padrão do projeto:

```bash
npm run build
```

5. Fazer o primeiro deploy.

## Checklist pós-deploy

- login com superadmin
- troca de marca no cabeçalho
- dashboard carregando
- DRE abrindo sem erro
- CMV com abas `Gestão por tipo` e `Detalhamento por pedido`
- importação aceitando novos CSVs
- saneamento persistindo decisão após reload
- despesas permitindo criar, editar e excluir
- área `Lojas e Pessoas` enviando convite de marca

## Observações

- o sistema usa `SUPABASE_SERVICE_ROLE_KEY` apenas em rotas server-side administrativas;
- não exponha a service role no cliente;
- a política de leitura de memberships foi endurecida para reduzir exposição entre membros.
