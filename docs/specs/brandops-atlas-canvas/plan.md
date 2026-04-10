# Plan — BrandOps Atlas Canvas

## 1. Resumo técnico

O `Atlas Canvas` será implementado como uma nova camada de experiência e inteligência, composta por:

1. `conversation layer`
- console curto à esquerda
- input, resposta curta e sugestões iniciais
- zero dependência de chat longo na abertura

2. `cortex canvas layer`
- canvas dinâmico à direita
- núcleo neural central
- nós e arestas com foco progressivo
- pan/zoom e navegação programática

3. `atlas graph layer`
- modelo estruturado de nós e relações
- dominós de evidência, hipótese, memória, previsão e tarefa candidata

4. `reasoning layer`
- classificador de intenção
- resolvedor de especialidade
- sintetizador factual
- tradutor de leitura para grafo

## 2. Stack técnica recomendada

### Frontend

- `Next.js App Router`
- `React`
- `tldraw` como base do canvas
- `Framer Motion` para foco, transições e estados do córtex
- `React Three Fiber / Three.js` opcional para o núcleo neural visual
- `SVG overlay` para conexões auxiliares e labels leves

### Backend

- pipeline atual do Atlas como base factual
- evolução da store de memória/contexto
- serializador de `graph state`
- futuras rotas específicas do canvas

## 3. Decisão arquitetural

### Decisão 1

O Atlas deixa de ser modelado como página de blocos.

### Decisão 2

A experiência principal passa a ser um `canvas cognitivo`, e não um layout de cards.

### Decisão 3

O Atlas deve abrir em `idle`, com contexto carregado porém silencioso.

### Decisão 4

A interação do usuário governa o canvas. O Atlas não deve despejar tudo antes da pergunta.

### Decisão 5

O lado direito deve ser programaticamente controlável, com zoom e foco por intenção.

## 4. Arquivos e módulos impactados

### Frontend atual

- `components/AtlasAnalystPanel.tsx`
- `components/atlas/AtlasCortexOrbScene.tsx`
- `components/AtlasControlTowerHome.tsx`
- `app/globals.css`

### Novos módulos sugeridos

- `components/atlas-canvas/AtlasCanvasShell.tsx`
- `components/atlas-canvas/AtlasConversationPane.tsx`
- `components/atlas-canvas/AtlasSuggestionDeck.tsx`
- `components/atlas-canvas/AtlasCanvasViewport.tsx`
- `components/atlas-canvas/AtlasCanvasNode.tsx`
- `components/atlas-canvas/AtlasCanvasInspector.tsx`
- `components/atlas-canvas/AtlasCanvasState.ts`

### Backend / IA

- `lib/brandops/ai/agent.ts`
- `lib/brandops/ai/runtime-tools.ts`
- `lib/brandops/ai/store.ts`
- novos serializadores do grafo do Atlas
- possíveis novas tabelas / migrações de memória e grafo

## 5. Estratégia de implementação

### Fase 1 — Reset visual e estrutural

- remover o layout atual do Atlas como base
- separar a experiência do Atlas do shell visual do BrandOps
- manter somente o acesso a partir da Torre, mas com superfície própria

### Fase 2 — Conversation pane

- reduzir a coluna esquerda ao essencial
- chat curto no topo
- sugestões na base
- estado `idle` quando não houver interação
- nenhuma conversa longa aberta por padrão

### Fase 3 — Canvas base

- integrar `tldraw`
- criar viewport com zoom e foco
- criar núcleo central do Atlas
- montar nós principais de domínio
- criar transição de `idle -> awakening`

### Fase 4 — Grafo dinâmico

- definir contrato de nós e arestas
- expandir clusters por intenção
- ligar clique de nó a foco de viewport
- habilitar subárvores dinâmicas

### Fase 5 — Inteligência operacional

- classificar intenção do prompt
- escolher especialidade principal
- montar leitura dominante curta
- converter a síntese em estrutura de grafo
- ligar isso às evidências reais já existentes

### Fase 6 — Saídas profundas

- clique em ramo pode:
  - expandir no próprio canvas
  - abrir detalhe contextual local
  - ou navegar para página dedicada futura

### Fase 7 — Ponte para tarefas humanas

- mapear `task_candidate`
- preparar integração com cockpit humano futuro
- manter isso só em estado de preparo nesta etapa

## 6. Modelo de interação

### Antes de qualquer pergunta

- Atlas em repouso
- usuário vê sugestões mínimas
- córtex pulsa de forma sutil
- nenhum texto longo é despejado

### Ao clicar numa sugestão

- prompt vai para o Atlas
- chat registra a intenção
- canvas muda de modo para `awakening`
- cluster correspondente ganha foco
- surgem os primeiros nós e ramos relevantes

### Ao perguntar algo livre

- Atlas identifica domínio e intenção
- define o ponto de entrada do mapa
- sintetiza resposta curta
- expande a árvore com base na consulta

### Ao clicar num nó

- viewport foca o nó
- ramo se expande
- podem surgir evidências, hipóteses, previsões e tarefas candidatas

## 7. Dados e contratos necessários

### Backend deve fornecer

- `suggestedPrompts`
- `primaryDomain`
- `conversationSummary`
- `graphState`
- `focusTarget`
- `evidenceClusters`
- `predictionClusters`
- `taskCandidates`

### Persistência necessária no futuro

- memória recente por pessoa usuária
- memória consolidada por marca
- histórico de focos do canvas
- feedback sobre nós úteis ou irrelevantes

## 8. Riscos técnicos

- integração inicial do `tldraw` exigir camada de adaptação visual própria
- excesso de labels tornando o canvas ilegível
- custo alto de contexto se o grafo for montado sem camada intermediária
- risco de produzir mapa bonito sem semântica forte

## 9. Estratégia de validação

- `type-check`
- `lint`
- `build`
- validação de runtime
- validação visual do estado `idle`
- validação visual do estado `awakening`
- validação do fluxo `pergunta -> foco -> expansão`
- validação de clareza sem scroll vertical na abertura

## 10. Critério final

O Atlas Canvas só é considerado aceito quando:

- deixa de parecer interface SaaS tradicional
- abre em silêncio e contexto
- conversa e córtex parecem partes do mesmo organismo visual
- o mapa responde à conversa
- o usuário entende intuitivamente por onde começar
