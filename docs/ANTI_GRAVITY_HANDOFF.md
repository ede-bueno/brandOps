# BrandOps - Handoff para Anti-Gravity

## Objetivo do produto

`BrandOps` e uma ferramenta interna para operacao multi-marca de print on demand.

Objetivo principal:
- consolidar vendas, midia, CMV, despesas e DRE por marca
- permitir operacao como `SUPER_ADMIN` para o gestor
- permitir acesso restrito para donos/responsaveis de cada marca
- substituir o fluxo anterior baseado em planilhas e Google Script

## Stack atual

- `Next.js 15`
- `React 19`
- `TypeScript`
- `Tailwind CSS v4`
- `Supabase`

Arquivos-base importantes:
- `app/layout.tsx`
- `components/BrandOpsProvider.tsx`
- `components/AppShell.tsx`
- `lib/brandops/database.ts`
- `lib/brandops/metrics.ts`
- `lib/brandops/types.ts`
- `supabase-schema.sql`

## Estado atual do projeto

O projeto ja esta em fase de MVP funcional, nao mais apenas mock visual.

Ja existe:
- autenticacao real via Supabase
- workspace por marca
- importacao real de CSVs
- persistencia real no banco
- RLS ativo
- tela administrativa de lojas e convites
- centro de custo
- CMV com checkpoint historico
- saneamento com decisao manual do operador
- DRE do periodo
- DRE anual mes a mes
- tabela gerencial semanal

## Fluxos ja implementados

### 1. Autenticacao e workspace

- login via Supabase em `app/login/page.tsx`
- provider central em `components/BrandOpsProvider.tsx`
- shell do app em `components/AppShell.tsx`
- filtro global de periodo
- troca de marca no topo do app

### 2. Importacao

Arquivos aceitos:
- `Meta Export.csv`
- `feed_facebook.csv`
- `Pedidos Pagos.csv`
- `Lista de Pedidos.csv`
- `Lista de Itens.csv`
- `Controle Financeiro - Oh, My Dog! - CMV_Produtos.csv`

Pontos principais:
- importacao por cabecalho
- gravacao real no Supabase
- reprocessamento de CMV quando necessario
- tela: `app/(app)/import/page.tsx`
- logica: `lib/brandops/csv.ts` e `lib/brandops/database.ts`

### 3. CMV

Implementado:
- base de custo por tipo de peca
- override por produto
- checkpoint para congelar o custo aplicado historicamente
- reprocessamento de itens vendidos

Arquivos principais:
- `app/(app)/cmv/page.tsx`
- `lib/brandops/metrics.ts`
- `lib/brandops/database.ts`

Observacao:
- o CMV e calculado a partir do custo unitario cadastrado e aplicado aos itens vendidos
- alteracoes futuras de custo nao devem reescrever o historico ja consolidado

### 4. Saneamento

Implementado:
- sistema aponta anomalias
- operador decide ignorar/restaurar
- decisao persiste no banco
- as linhas ignoradas deixam de afetar os relatorios

Arquivo principal:
- `app/(app)/sanitization/page.tsx`

### 5. Centro de custo

Implementado:
- categorias de despesa
- lancamentos operacionais
- integracao com DRE

Arquivo principal:
- `app/(app)/cost-center/page.tsx`

### 6. DRE e visualizacoes gerenciais

Implementado:
- DRE do periodo filtrado
- DRE anual mes a mes com acumulado
- despesas por categoria
- contribuicao diaria
- tabela gerencial semanal inspirada na planilha anterior

Arquivo principal:
- `app/(app)/dre/page.tsx`

Calculos gerenciais atuais:
- `Adcost = gasto ads / pecas reais`
- `Ticket = faturamento bruto / pecas reais`
- `ROAS bruto = faturamento bruto / gasto ads`
- `ROAS liquido = margem bruta / gasto ads`
- `CTR = cliques / impressoes`
- `CPC = gasto ads / cliques`
- `CPM = gasto ads / impressoes * 1000`
- `CVR Meta = compras meta / cliques`
- `CVR Real = pecas reais / cliques`

## Supabase

### Projeto

Ja existe projeto real no Supabase e as migrations principais ja foram preparadas/aplicadas.

Migrations atuais em `supabase/migrations`:
- `20260320010101_brandops_brand_metadata.sql`
- `20260320010201_brandops_security_and_app_support.sql`
- `20260320010301_brandops_media_granularity.sql`
- `20260320010401_brandops_profile_role_guard.sql`
- `20260320010501_brandops_cmv_expenses_sanitization.sql`
- `20260320010601_brandops_cmv_checkpoint_sales_line_match.sql`
- `20260320010701_brandops_brand_profiles.sql`

### Modelagem relevante

Entidades centrais:
- `brands`
- `user_profiles`
- `brand_members`
- `products`
- `cmv_history`
- `orders`
- `order_items`
- `media_performance`
- `import_logs`
- estruturas adicionais para despesas, categorias, checkpoints e afins

### Seguranca

Ja existe:
- `RLS` habilitado
- funcao de super admin
- protecao contra autoelevacao de privilegio
- rotas admin com validacao de `SUPER_ADMIN`

Arquivos relevantes:
- `lib/brandops/admin.ts`
- `app/api/admin/brands/route.ts`
- `app/api/admin/brands/[brandId]/route.ts`
- `app/api/admin/invitations/route.ts`

## Marcas e acessos ja preparados

### Oh My Dog

Ja cadastrada.

Usuario vinculado:
- `contato@ohmydogloja.com`

Papeis:
- `SUPER_ADMIN`
- membro da marca `Oh My Dog`

### Bateu o Pace

Ja cadastrada a partir de dados publicos do site `reserva.ink/bateuopace`.

Ja existe:
- marca criada
- dados publicos populados
- ligacao com o usuario superadmin

## Area administrativa

Tela:
- `app/(app)/admin/stores/page.tsx`

Ja permite:
- listar lojas
- criar loja
- editar loja
- convidar usuario por email
- vincular usuario existente a uma marca

## Estado visual

Ja foi iniciada uma refatoracao visual importante:
- shell mais profissional
- cards e estados vazios melhores
- DRE e telas operacionais com visual mais consistente
- inicio de uma segunda passada para layout mais clean e com sidebar colapsavel

Arquivos visuais principais:
- `app/globals.css`
- `components/AppShell.tsx`
- `components/ui-shell.tsx`
- `components/MetricCard.tsx`
- `components/EmptyState.tsx`

### Ponto importante

A refatoracao visual ainda nao esta completamente finalizada.

O shell foi melhorado e ja existe uma versao com sidebar colapsavel, mas ainda vale uma passada final em:
- densidade de tabelas
- formularios
- refinamento de spacing
- consistencia entre admin, importacao e DRE

## Pendencias recomendadas para o Anti-Gravity

### Alta prioridade

1. Finalizar a refatoracao visual
- polir `components/AppShell.tsx`
- consolidar `app/globals.css`
- revisar admin, importacao, DRE e tabelas largas

2. Revisar experiencia mobile e tablet
- shell
- filtros
- tabelas com scroll horizontal
- formularios administrativos

3. Endurecer o pipeline
- revisar porque o build do Next esta com validacao de types pulada
- hoje `tsc --noEmit` passa, mas o pipeline ainda merece ser endurecido

4. Revisar DRE anual
- opcionalmente adicionar subtotal explicito de despesas fixas
- opcionalmente separar visao por ano quando houver base multi-ano maior

### Media prioridade

5. Convite e onboarding
- melhorar email de convite
- melhorar fluxo de primeiro acesso e troca de senha

6. Refinar relatorios gerenciais
- comparativos por marca
- visao mensal consolidada
- ranking de marcas

7. Melhorar importacao
- feedback visual melhor
- possivel pagina de historico de imports
- possivel tratamento mais explicito de erros por arquivo

## Validacoes que costumavam ser usadas

No workspace local:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run dev -- --port 3003
```

Checagem local:
- `http://localhost:3003/login`
- `http://localhost:3003/dashboard`
- `http://localhost:3003/dre`

## Observacoes tecnicas importantes

1. O projeto esta com worktree suja
- ha muitas alteracoes locais ainda nao commitadas
- o Anti-Gravity deve revisar antes de reorganizar ou dividir commits

2. Nao confiar no README atual como fonte unica
- ele esta desatualizado em relacao ao estado real do sistema

3. O projeto ja saiu da fase mock
- varias telas ja leem dados reais do Supabase
- qualquer refatoracao deve preservar esse fluxo

4. Evitar regressao no CMV
- o comportamento de checkpoint historico e central
- nao tratar CMV apenas como valor "atual" sem vigencia

5. Evitar regressao no saneamento
- a logica correta e "o sistema aponta, o operador decide"

## Arquivos para o Anti-Gravity abrir primeiro

- `components/BrandOpsProvider.tsx`
- `lib/brandops/database.ts`
- `lib/brandops/metrics.ts`
- `lib/brandops/types.ts`
- `components/AppShell.tsx`
- `app/(app)/dre/page.tsx`
- `app/(app)/admin/stores/page.tsx`
- `app/(app)/import/page.tsx`
- `app/globals.css`
- `supabase-schema.sql`

## Resumo executivo

Se o Anti-Gravity entrar agora, o melhor ponto de partida e:
- entender provider + database + metrics
- revisar o DRE e a administracao de lojas
- fechar a refatoracao visual final
- endurecer o pipeline
- preparar a proxima camada de acabamento operacional

O MVP ja existe. O trabalho agora e transformar a base em produto robusto e polido.
