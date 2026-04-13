# Plano de Execução - Torre, Alertas e Atlas IA

Data de atualização: 2026-04-13

## Objetivo

Fechar a frente de `Torre de Controle`, `alertas` e `Atlas IA` com foco em:

- coerência factual
- consistência de linguagem
- menor drift entre superfícies
- previsibilidade operacional antes do próximo deploy

## Ordem de execução

### Lote 1 - Consistência do núcleo

Status: `feito`

- centralizar a heurística de alertas em um motor único
- reaproveitar o mesmo motor na Torre, shell e radar do Orb
- alinhar o período do Atlas com o recorte ativo da shell sempre que existir filtro manual
- limpar copy meta e manter a linguagem focada em decisão

Entrega aplicada em:

- `lib/brandops/control-alerts.ts`
- `app/(app)/dashboard/page.tsx`
- `components/AppShell.tsx`
- `components/AtlasControlTowerHome.tsx`
- `components/AtlasOrbRadarPanel.tsx`
- `components/AtlasAnalystPanel.tsx`
- `components/AtlasOrb.tsx`

### Lote 2 - Navegação e descoberta

Status: `próximo`

- corrigir semântica da navegação mobile para não usar grupo como destino
- revisar descoberta do Atlas quando a marca ainda não estiver pronta
- fechar deep links de ajuda e estados guiados a partir de alertas

Por que vem agora:

- reduz atrito real de uso
- evita cliques errados
- melhora a legibilidade do sistema sem mudar a arquitetura

### Lote 3 - Governança do Atlas IA

Status: `na fila`

- explicitar melhor quando o Atlas está usando recorte ativo vs janela padrão
- melhorar comunicação de bloqueio por plano, credencial ou integração
- consolidar uma régua mais clara de confiança, evidência mínima e silêncio do Atlas

Por que ainda não entrou:

- depende do núcleo já consistente para não mascarar problema com UX

### Lote 4 - Hardening para release

Status: `na fila`

- revisar rotas e CTAs cruzados entre Torre, DRE, mídia, saneamento e configurações
- validar comportamento com marcas sem GA4, sem catálogo e sem Atlas IA
- confirmar build, start local e preview sem drift de versão

## Critério de aceite desta frente

- o mesmo alerta principal aparece com o mesmo racional nas superfícies centrais
- o Atlas respeita o recorte ativo quando o operador já filtrou a análise
- a copy deixa de explicar a interface e passa a orientar decisão
- o fluxo local de validação continua reproduzível com `npm run check` e `npm run build`
