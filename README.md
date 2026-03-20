# BrandOps

Plataforma operacional para consolidar vendas, mídia e saúde financeira de marcas
print on demand.

## Escopo atual

- Importação real dos CSVs padrão da operação:
  - `Meta Export.csv`
  - `feed_facebook.csv`
  - `Pedidos Pagos.csv`
  - `Lista de Pedidos.csv`
  - `Lista de Itens.csv`
- Workspace local com múltiplas marcas
- Dashboard, vendas, mídia, DRE, saneamento e CMV lendo dados importados
- Base preparada para conexão posterior com autenticação e persistência no Supabase

## Rodando localmente

1. Instale as dependências com `npm install`
2. Rode o projeto com `npm run dev`
3. Acesse `http://localhost:3000`

## Observações

- O schema SQL inicial está em `supabase-schema.sql`
- O projeto já está pronto para receber a etapa de migrations e integração real com Supabase
