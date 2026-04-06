# Backlog: Aprendizado do Negócio no Atlas IA

## Objetivo

Criar um modo de aprendizagem da marca no Atlas IA para que o agente consiga varrer o histórico operacional da loja, consolidar um entendimento estruturado do negócio e usar esse conhecimento nas análises futuras.

Esse modo não deve "ler tudo na hora da pergunta". O desenho correto é:

1. o usuário aciona o aprendizado da marca
2. o Atlas executa uma varredura assíncrona do histórico
3. o sistema consolida perfis, padrões, riscos e oportunidades em memória estruturada
4. o Analyst passa a usar esse material como contexto curado

## Estado atual

O modo `Aprender negócio` já está ativo na base do produto com:

- painel dedicado na Central Estratégica
- disparo manual por marca
- execução protegida por plano e por credencial Gemini ativa
- persistência de `runs`, `snapshots` e feedback humano
- persistência estruturada de `findings` por snapshot
- comparação com o snapshot anterior
- suporte a histórico completo, recortes fixos e janela estratégica
- consumo do snapshot aprendido pelo Atlas Analyst
- execução assíncrona com retorno rápido e atualização posterior do estado

O que ainda falta para a primeira versão robusta:

- camada separada mais rica de evidências consultáveis, além dos findings já persistidos
- política de reaprendizagem automática quando a base muda muito
- rastreabilidade ainda mais forte do período, fontes e lacunas usadas

## Resultado esperado

Ao final do processo, o Atlas deve conseguir responder melhor perguntas como:

- qual é o nicho real da marca e como ela vende
- quais padrões de performance se repetem
- quais tipos de campanha costumam funcionar ou falhar
- quais erros operacionais aparecem com frequência
- quais oportunidades têm mais aderência ao histórico da marca

## Fontes que entram na varredura

- DRE histórico e recortes financeiros
- vendas, pedidos, itens e densidade comercial
- Meta Ads e histórico de mídia
- GA4 e funil de tráfego
- catálogo e insights de produto/POD
- saneamento e anomalias recorrentes
- memória operacional já registrada manualmente

## Estrutura sugerida de saída

O aprendizado deve gerar pelo menos estes blocos:

- `business_profile`
- `niche_profile`
- `performance_baseline`
- `seasonality_patterns`
- `campaign_patterns`
- `catalog_patterns`
- `operational_risks`
- `recurring_errors`
- `growth_opportunities`
- `evidence_sources`

## Regras do produto

- backend continua sendo fonte de verdade dos números
- Atlas não pode inventar tese em cima de base fraca
- todo insight consolidado precisa manter evidências
- aprendizado deve ser recalculável quando o histórico mudar
- o usuário precisa ver quando o conhecimento foi gerado e com base em qual período

## Backlog Prioritário

### Fase 1: Fundamento do modo de aprendizado

1. `feito` criar ação explícita `Aprender negócio` na Central Estratégica
2. `feito` criar estado de execução assíncrona por marca
3. `feito parcial` registrar período analisado, status e autor da execução
4. `feito` impedir execuções concorrentes da mesma marca

### Fase 2: Pipeline de varredura histórica

1. consolidar snapshots canônicos por fonte
2. normalizar cortes históricos relevantes
3. resumir histórico financeiro, comercial, tráfego, mídia e catálogo
4. marcar lacunas e confiabilidade por frente

### Fase 3: Perfil estruturado da marca

1. gerar perfil do negócio e do nicho
2. identificar drivers de venda e rentabilidade
3. mapear sazonalidade e comportamento recorrente
4. detectar padrões de erro operacional

### Fase 4: Oportunidades e riscos recorrentes

1. classificar oportunidades de curto, médio e longo prazo
2. separar risco estrutural de ruído de período
3. detectar gargalos frequentes de mídia, funil, catálogo e operação
4. registrar contradições recorrentes entre crescimento e margem

### Fase 5: Memória estruturada para o Analyst

1. `feito` salvar snapshot curado de aprendizado por marca
2. `feito` plugar esse snapshot no prompt do Atlas Analyst
3. `feito` exibir data da última aprendizagem e nível de confiança
4. `feito` permitir nova aprendizagem manual após grandes mudanças
5. `feito` permitir aprendizagem por janela de análise além do histórico completo

### Fase 6: Interface de leitura

1. criar visão `Entendimento do negócio` na Central Estratégica
2. exibir resumo executivo curto
3. exibir nicho, baseline, riscos, oportunidades e erros recorrentes
4. esconder detalhes longos atrás de hints/expanders

### Fase 7: Reaprendizagem e manutenção

1. `feito` disparar sugestão de reaprender após novas importações relevantes
2. `feito` permitir reaprender por período específico
3. `feito parcial` versionar snapshots de aprendizado
4. `feito` comparar aprendizado anterior vs atual
5. `feito` expor watch items, próximos marcos e gatilhos claros de reaprendizagem

### Fase 8: Feedback e melhoria contínua

1. `feito` permitir ao usuário confirmar ou corrigir entendimentos do Atlas
2. `em andamento` registrar feedback sobre oportunidades e erros detectados
3. `pendente` ajustar priorização futura a partir desse feedback
4. `pendente` medir se o aprendizado melhorou respostas do Analyst

## Backlog Técnico

### Banco e persistência

Tabelas sugeridas:

- `atlas_brand_learning_runs`
- `atlas_brand_learning_snapshots`
- `atlas_brand_learning_findings`
- `atlas_brand_learning_evidence`
- `atlas_brand_learning_feedback`

### Backend

1. route handler para iniciar execução
2. serviço de consolidação histórica por marca
3. prompt estruturado de aprendizagem
4. persistência versionada do snapshot final

### Frontend

1. CTA de aprendizagem na Central Estratégica
2. status da execução
3. visão resumida do entendimento do negócio
4. ações de reaprender e revisar resultado

## Riscos e cuidados

- não mandar o banco inteiro bruto ao modelo
- não tratar dado incompleto como verdade estrutural
- não confundir anomalia pontual com padrão do negócio
- não misturar opinião do modelo com cálculo canônico do backend

## Próxima entrega recomendada

Fechar a V1 operacional do aprendizado com mais robustez de execução e rastreabilidade.

Escopo recomendado:

1. enriquecer a execução assíncrona com fila ou worker mais durável do que o processamento pós-resposta
2. persistir evidências consultáveis além dos findings estruturados
3. exibir período analisado, fontes e lacunas de forma ainda mais clara
4. usar o aprendizado de forma mais especializada por skill no Analyst
5. acionar reaprendizagem automática quando novas importações mudarem materialmente a base
