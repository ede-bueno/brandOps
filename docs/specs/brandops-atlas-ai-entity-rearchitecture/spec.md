# Spec Template

## 1. Contexto

O `Atlas IA` atual ainda herda a gramática do restante do produto: painéis, cards, rails e blocos de leitura operacional. Isso ajuda na consistência, mas mata justamente o que deveria fazer essa área parecer especial: ela é o cérebro do sistema, não mais uma página analítica.

O pedido agora é explícito:

- `BrandOps` continua como software operacional
- `Atlas` continua como agente de IA
- a área do `Atlas IA` deve romper visualmente com o restante do sistema
- o frontend deve transmitir inteligência, contexto, profundidade temporal e capacidade de decisão
- o backend precisa sustentar isso com cadeia real de memória, evidência e raciocínio

## 2. Problema

Hoje o `Atlas IA`:

- parece um conjunto de cards operacionais
- não causa a sensação de entidade inteligente
- não mostra claramente como lê passado, presente e futuro
- não expõe bem como a IA entende comércio, mídia, catálogo, funil e comportamento humano
- não possui ainda uma cadeia robusta o bastante de memória, relações e hipóteses

O resultado é uma tela com utilidade parcial, mas sem o impacto, clareza e profundidade que o Atlas precisa ter.

## 3. Objetivo

Refatorar completamente o `Atlas IA` para que ele se torne uma experiência própria dentro do BrandOps:

- visualmente impactante e tecnológica
- sem fundo de página operacional e sem cards convencionais
- organizada como entidade viva, não como dashboard
- orientada a `entender o passado`, `ler o presente` e `sugerir o futuro`
- suportada por uma arquitetura de backend mais inteligente, com memória, evidências, relações e raciocínio auditável

## 4. Escopo

### Inclui

- redesign completo da área `Atlas IA`
- refatoração completa da `Mesa` e do `Radar`
- criação de uma nova gramática visual exclusiva do Atlas
- redesenho do fluxo conversacional e do modo de exploração de insights
- modelagem de memória, evidências, hipóteses, predições e threads de decisão
- expansão da cadeia de contexto para catálogo, mídia, tráfego, DRE, operação e comportamento da marca
- plano de backend e banco para sustentar esse novo Atlas

### Não inclui

- reabertura da frente de `Creative Ops`
- execução autônoma de publicação social nesta fase
- automações irreversíveis sem aprovação humana

## 5. Usuários impactados

- fundador / operador principal da marca
- gestor de mídia
- gestor financeiro
- operador de catálogo / operação
- futuro superadmin de grupo multi-marca

## 6. Fluxo esperado

1. o usuário entra no `Atlas IA`
2. a tela imediatamente parece uma entidade de inteligência, não um módulo comum do BrandOps
3. o Atlas apresenta uma visão viva com três eixos:
   - passado
   - presente
   - futuro
4. o usuário consegue:
   - fazer perguntas
   - abrir sinais
   - ver evidências
   - navegar por hipóteses
   - entender impactos
   - sair para a execução factual no módulo correto
5. toda resposta do Atlas mantém vínculo com evidências reais e contexto de marca

## 7. Requisitos funcionais

- a área do `Atlas IA` deve ter layout próprio e não reutilizar a linguagem principal de cards operacionais
- a experiência deve suportar:
  - leitura do passado
  - leitura do presente
  - projeções / próximos cenários
  - pergunta livre
  - exploração de evidências
  - navegação para módulos factuais
- o Atlas deve consolidar contexto de:
  - `INK` / plataforma comercial
  - mídia paga
  - tráfego
  - catálogo e produtos
  - DRE / CMV / despesas
  - saneamento e integridade da base
  - aprendizagem histórica da marca
- o backend deve suportar:
  - memória estruturada
  - entidades e relações
  - evidências consultáveis
  - hipóteses e contra-hipóteses
  - predições e watch items
  - threads de decisão

## 8. Requisitos não funcionais

- frontend do Atlas com identidade visual própria, tecnológica e premium
- manter separação entre cálculo factual e narrativa do modelo
- toda sugestão precisa ser auditável
- o sistema deve continuar seguro para SaaS multi-marca
- a mudança deve ser incremental e preparada para produção

## 9. Critérios de aceite

- o usuário percebe imediatamente que entrou em uma área especial de IA
- a tela deixa de parecer uma coleção de cards convencionais
- passado, presente e futuro ficam claros na experiência
- o Atlas consegue justificar leituras com evidências reais
- a navegação entre insight e módulo factual fica objetiva
- a arquitetura nova deixa explícito o que ainda é leitura e o que vira ação humana

## 10. Riscos e dependências

- risco de criar uma experiência visual bonita, mas vazia de inteligência real
- risco de o frontend prometer mais do que o backend já sustenta
- dependência de ampliar memória, evidências e contexto por marca
- necessidade de manter governança SaaS e separação forte entre marcas
