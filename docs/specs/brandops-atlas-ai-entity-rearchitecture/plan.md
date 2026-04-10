# Plan Template

## 1. Resumo técnico

A reconstrução do `Atlas IA` precisa acontecer em duas trilhas integradas:

1. `experience layer`
- novo canvas visual exclusivo do Atlas
- zero dependência da gramática padrão de cards do BrandOps
- orbe vivo, campo neural, camadas de profundidade, evidências e threads

2. `intelligence layer`
- memória estruturada
- evidência consultável
- hipóteses, watch items e predições
- cadeia de raciocínio baseada em dados canônicos e integrações reais

## 2. Arquivos e módulos impactados

### Frontend

- `app/(app)/dashboard/page.tsx`
- `components/AtlasControlTowerHome.tsx`
- `components/AtlasAnalystPanel.tsx`
- `components/AtlasOrbRadarPanel.tsx`
- `components/AtlasAnalystSettingsPanel.tsx`
- `components/AtlasBusinessLearningPanel.tsx`
- `components/AtlasContextWorkspace.tsx`
- `components/AtlasOrb.tsx`
- `components/AtlasMark.tsx`
- `app/globals.css`

### Backend / IA

- `lib/brandops/ai/agent.ts`
- `lib/brandops/ai/runtime-tools.ts`
- `lib/brandops/ai/*` módulos de contexto e memória
- serviços de integração por domínio (`media`, `traffic`, `product`, `finance`)
- eventuais novas tabelas / migrações de memória e evidência

## 3. Estratégia de implementação

### Fase 1 — Fundamento da inteligência

- consolidar o mapa de contexto canônico por marca
- separar claramente:
  - fatos
  - evidências
  - hipóteses
  - projeções
- modelar memória operacional mais rica

### Fase 2 — Novo modelo de dados do Atlas

Criar camadas como:

- `atlas_memory_entities`
- `atlas_memory_relationships`
- `atlas_evidence_items`
- `atlas_decision_threads`
- `atlas_hypotheses`
- `atlas_watch_items`
- `atlas_predictions`
- `atlas_session_events`

### Fase 3 — Camada de raciocínio

- montar pipeline `passado -> presente -> futuro`
- gerar síntese factual antes da narrativa
- gerar hipóteses e contradições
- gerar sugestão de próximos passos com confiança e evidência

### Fase 4 — Nova experiência visual

- canvas full-stage exclusivo do Atlas
- remoção do fundo de página convencional
- zero dependência de cards operacionais padrão
- visual de entidade digital viva
- navegação por sinais, mapas, timelines, evidências e pergunta ativa

### Fase 5 — Governança e segurança

- manter segregação por marca
- registrar origem da evidência
- manter trilha auditável da resposta
- preservar aprovação humana para qualquer ação futura

## 4. Decisões de arquitetura

- `BrandOps` continua sendo o sistema operacional
- `Atlas` é uma entidade dentro do BrandOps, com visual e lógica próprios
- o Atlas não calcula números brutos; ele consome camadas canônicas
- toda resposta deve ser explicável por evidências e relações
- a interface do Atlas pode destoar visualmente do resto do sistema

## 5. Riscos técnicos

- custo de contexto alto se o Atlas tentar “ler tudo” em tempo real
- excesso de liberdade visual sem sustentação em dados reais
- aumento de complexidade do backend se memória e evidência não forem bem separadas
- risco de projetar “autonomia” antes de fechar governança

## 6. Estratégia de validação

- `type-check`
- `lint`
- `build`
- validação visual forte em runtime
- testes de coerência entre resposta do Atlas e base factual
- testes de segregação de contexto por marca
