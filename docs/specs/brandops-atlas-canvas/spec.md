# Spec — BrandOps Atlas Canvas

## 1. Contexto

A reconstrução do `Atlas` chegou num ponto claro: a interface não pode mais ser tratada como uma página SaaS com cards, KPIs, tabs internas e rails convencionais. O que o produto precisa agora é um `canvas cognitivo`.

A ideia consolidada é:

- `BrandOps` continua sendo o software operacional
- `Atlas` continua sendo a inteligência do sistema
- o `Atlas` não deve parecer um dashboard nem uma tela comum do BrandOps
- a experiência principal deve nascer como uma superfície de conversa + expansão dinâmica do raciocínio
- a conversa não é separada do cérebro visual; ela é a ponte entre o humano e o córtex do Atlas

O conceito aprovado para esta fase é:

- coluna esquerda: `conversa com o Atlas`
- topo da coluna esquerda: chat curto, focado e pronto para receber a pergunta
- base da coluna esquerda: sugestões de perguntas geradas pelo próprio Atlas
- coluna direita: `Atlas Canvas`, um mapa mental/córtex tecnológico que expande conforme a intenção da conversa
- o Atlas abre em `idle`, já contextualizado internamente, mas sem despejar análise completa antes da interação
- sem rolagem vertical como padrão da experiência

## 2. Problema

Hoje o Atlas sofre de cinco problemas centrais:

- herda a linguagem visual do restante do produto
- ainda parece uma composição de software analítico tradicional
- mostra texto demais logo na abertura
- não demonstra visualmente como o raciocínio se organiza
- não transforma a conversa em expansão dinâmica de inteligência

Na prática, isso quebra a promessa principal do Atlas: ele deveria parecer uma inteligência viva, contextualizada e progressiva, mas ainda transmite sensação de interface montada com blocos estáticos.

## 3. Objetivo

Criar uma nova camada chamada `Atlas Canvas`, que substitui a estrutura atual do Atlas por uma experiência de conversa + canvas cognitivo.

Objetivos específicos:

- remover a gramática de cards operacionais do Atlas
- transformar o lado direito em um `canvas infinito ou semi-infinito` com zoom, foco, expansão e navegação programática
- permitir que o lado esquerdo comande o mapa a partir da conversa
- fazer o Atlas abrir em `idle inteligente`, com contexto já carregado, sem excesso de comunicação escrita
- permitir que cada ramo do mapa se torne aprofundamento dinâmico ou navegação para leitura dedicada
- preparar o backend para entregar nós, relações, evidências, hipóteses, memória e próximos passos de forma estruturada

## 4. Escopo

### Inclui

- criação da arquitetura do `Atlas Canvas`
- redesign completo da experiência do Atlas com duas colunas reais
- substituição da lógica atual de cards/painéis do Atlas
- definição do modelo de nós, relações e ramificações
- definição da stack técnica do canvas
- integração entre chat e expansão do mapa
- navegação programática do foco do córtex
- estados de `idle`, `awakening`, `focused`, `expanded`
- capacidade de clique em nós e ramificações para aprofundamento
- preparação para abrir páginas/leituras específicas por assunto no futuro

### Não inclui nesta spec

- automações irreversíveis
- execução autônoma de tarefas sem humano
- publicação social real
- reabertura do `Creative Ops`
- implementação final do cockpit humano Kanban nesta mesma fase

## 5. Experiência-alvo

### Estado inicial

Ao abrir o Atlas:

- o usuário vê uma superfície escura, tecnológica e silenciosa
- o Atlas já está carregado com o contexto do recorte e da marca, mas não despeja texto
- a conversa fica compacta no topo esquerdo
- a base esquerda exibe poucas perguntas sugeridas
- o lado direito mostra o córtex em repouso (`idle`)

### Estado após interação

Quando o usuário pergunta algo ou clica numa sugestão:

- o chat registra a intenção
- o córtex desperta
- o canvas expande o ramo correspondente
- nós e conexões aparecem com foco progressivo
- evidências e hipóteses passam a surgir no mapa, não como cards soltos
- a leitura textual continua curta, clara e orientada à ação

### Estado de aprofundamento

Ao clicar num nó:

- o viewport pode dar zoom e focar o ramo
- novos subnós podem surgir
- evidências podem aparecer em clusters
- esse clique pode abrir um painel contextual mínimo ou uma página dedicada futura

## 6. Princípios de design

- sem linguagem de dashboard
- sem headline gigante na abertura
- sem texto introdutório excessivo
- sem contornos pesados que isolem o chat do córtex
- o chat deve parecer parte do cérebro, não uma janela separada
- a superfície deve usar profundidade, brilho, rede, foco, neblina de dados e relações
- o eixo principal é `interação -> raciocínio -> expansão`
- o Atlas não deve falar no frontend como se fosse uma “entidade”; no produto ele é simplesmente `Atlas`
- a comunicação deve ser mínima antes da interação e progressiva depois dela

## 7. Stack recomendada

### Stack principal recomendada

- `Next.js + React`
- `tldraw` como base do canvas cognitivo
- `Framer Motion` para transições sutis e foco
- `Three.js / React Three Fiber` opcional para o núcleo/córtex visual central
- `SVG overlay` ou camada vetorial para conexões leves e labels auxiliares

### Justificativa

`React Flow / xyflow` é excelente para grafos e pode ser usado como fallback, mas o `tldraw` é melhor para a sensação de espaço vivo, expansão, câmera, zoom e composição tipo Miro, que é justamente a direção desejada para o Atlas.

### Decisão desta spec

A implementação do `Atlas Canvas` deve ser construída prioritariamente sobre `tldraw`, com eventual uso complementar de `Three.js` para o núcleo visual do córtex.

## 8. Arquitetura de frontend

### Coluna esquerda — ponte humano -> Atlas

#### Bloco 1: Console curto

- avatar/marca Atlas discreta
- estado do Atlas (`pronto`, `analisando`, `expandindo`, `aprofundando`)
- última pergunta atual
- resposta curta e progressiva
- input fixo e objetivo

#### Bloco 2: Sugestões do próprio Atlas

- 3 a 6 perguntas contextuais
- cada clique envia o prompt para o Atlas
- cada prompt acorda um cluster diferente do canvas

### Coluna direita — Atlas Canvas

#### Camada 1: córtex central

- núcleo visual vivo em estado de repouso
- deve transmitir inteligência latente
- não necessariamente um orb simples; pode ser um centro neural com conexões

#### Camada 2: rede principal

- nós centrais por domínio: finanças, mídia, tráfego, produtos, operação, contexto, previsão
- conexões entre domínios
- nós mudam de intensidade conforme a conversa

#### Camada 3: subárvores

- ramos por tema específico
- campanhas, criativos, produtos, margem, CMV, funil, catálogo, sazonalidade, etc.
- expansão progressiva com clique ou por intenção detectada no prompt

#### Camada 4: viewport inteligente

- pan/zoom
- foco automático no ramo ativado
- retorno rápido ao panorama
- sem scroll vertical da página como comportamento principal

## 9. Modelo de informação do canvas

### Tipos de nó

- `domain`
- `signal`
- `evidence`
- `hypothesis`
- `prediction`
- `task_candidate`
- `memory`
- `document_reference`
- `external_source`

### Tipos de relação

- `supports`
- `contradicts`
- `depends_on`
- `correlates_with`
- `causes`
- `amplifies`
- `reduces`
- `next_step_for`

### Estado visual por nó

- `idle`
- `available`
- `focused`
- `expanded`
- `warning`
- `critical`
- `resolved`

## 10. Contrato inicial de dados

O backend deve conseguir entregar algo próximo de:

```ts
interface AtlasCanvasNode {
  id: string;
  type: "domain" | "signal" | "evidence" | "hypothesis" | "prediction" | "task_candidate" | "memory";
  label: string;
  shortLabel?: string;
  summary?: string;
  status?: "idle" | "available" | "focused" | "expanded" | "warning" | "critical" | "resolved";
  score?: number;
  group?: string;
  meta?: Record<string, unknown>;
}

interface AtlasCanvasEdge {
  id: string;
  source: string;
  target: string;
  relation: "supports" | "contradicts" | "depends_on" | "correlates_with" | "causes" | "amplifies" | "reduces" | "next_step_for";
  weight?: number;
}

interface AtlasCanvasState {
  mode: "idle" | "awakening" | "focused" | "expanded";
  activePrompt?: string | null;
  activeDomain?: string | null;
  nodes: AtlasCanvasNode[];
  edges: AtlasCanvasEdge[];
  suggestedPrompts: string[];
}
```

## 11. Backend e inteligência

O `Atlas Canvas` não pode depender só de texto gerado. Ele precisa de uma camada estruturada que produza mapa.

### Backend necessário

- pipeline factual por domínio
- classificador de intenção da pergunta
- resolvedor de especialidade (`financeiro`, `mídia`, `tráfego`, `produto`, `operação`)
- montagem de nós e arestas
- memória recente por usuário + por marca
- memória consolidada da marca
- hipóteses e contradições
- previsão / próximos passos

### Comportamento esperado da LLM

- conversar com a pessoa logada, não narrar a marca em terceira pessoa como regra principal
- usar a marca apenas como contexto factual
- escolher qual ramo do mapa ativar
- resumir o driver dominante de forma curta
- expandir o mapa com progressão coerente

## 12. Integração com o futuro cockpit humano

Esta spec não implementa ainda o cockpit Kanban, mas já precisa preparar a ponte para ele.

Cada nó do tipo `task_candidate` deve poder virar, no futuro:

- tarefa sugerida
- tarefa aceita pelo humano
- tarefa enviada ao cockpit operacional
- tarefa com urgência, SLA, atraso e dono

## 13. Critérios de aceite

- o Atlas abre sem parecer uma página comum do BrandOps
- a tela não despeja texto nem análises grandes logo no primeiro frame
- o lado esquerdo funciona como ponte de conversa real com o usuário
- o lado direito funciona como canvas cognitivo, não como coleção de cards
- o Atlas abre em estado `idle`, mas claramente contextualizado
- a interação do chat desperta e expande o canvas
- nós e ramos podem ser clicados para aprofundar
- a página não depende de rolagem vertical como padrão da experiência
- a comunicação do Atlas fala com a pessoa logada
- a stack escolhida é capaz de sustentar zoom, foco, expansão e navegação viva

## 14. Riscos

- tentar simular canvas vivo apenas com HTML/CSS estático e voltar ao problema atual
- exagerar no visual sem lastro factual real
- lotar o canvas de labels logo na abertura
- criar um mapa bonito, mas cognitivamente confuso
- misturar estrutura de software operacional com experiência imersiva do Atlas

## 15. Decisão final desta spec

O `Atlas` deixa de ser tratado como uma página analítica reestilizada.

A partir desta spec, ele passa a ser definido como:

- `uma experiência conversacional`
- `um canvas cognitivo interativo`
- `uma ponte entre humano e inteligência contextual do BrandOps`
