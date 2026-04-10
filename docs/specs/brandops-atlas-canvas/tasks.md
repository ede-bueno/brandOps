# Tasks — BrandOps Atlas Canvas

## 1. Preparação

- [x] alinhar o `Atlas Canvas` ao PRD e à frente maior de re-arquitetura do Atlas
- [x] congelar a tentativa atual de layout estático como legada
- [x] definir o recorte exato da primeira entrega do canvas

## 2. Stack e fundação

- [x] integrar `tldraw` ao projeto
- [ ] validar se será necessário complementar com `React Three Fiber`
- [x] criar o shell base de duas colunas do Atlas Canvas
- [x] garantir abertura sem scroll vertical

## 3. Conversation pane

- [x] reconstruir a coluna esquerda do Atlas
- [x] deixar o chat no topo como ponte entre humano e Atlas
- [x] mover sugestões para a parte inferior da coluna
- [x] abrir o Atlas em estado `idle`, sem histórico visível por padrão
- [x] ajustar o Atlas para conversar com a pessoa logada, não narrar a marca em terceira pessoa

## 4. Cortex canvas

- [ ] criar o núcleo neural do Atlas no canvas
- [ ] criar nós principais por domínio
- [ ] criar arestas e hierarquia inicial
- [ ] definir estados visuais `idle`, `awakening`, `focused` e `expanded`
- [ ] implementar foco e zoom programático

## 5. Grafo e inteligência

- [x] definir o contrato `AtlasCanvasState`
- [ ] serializar nós e relações a partir da leitura factual do backend
- [x] classificar a intenção da pergunta
- [x] mapear a intenção para domínio e ramo do canvas
- [ ] gerar subárvores de evidência, hipótese e previsão

## 6. Interação

- [x] fazer as sugestões despertarem o canvas
- [x] fazer o prompt livre despertar o ramo correto
- [x] permitir clique em nós para expansão
- [ ] permitir clique em ramos para aprofundamento
- [ ] preparar saída futura para páginas dedicadas por assunto

## 7. Ponte para o cockpit humano

- [x] registrar no backlog a criação do cockpit humano Kanban
- [ ] preparar o tipo `task_candidate` no grafo do Atlas
- [ ] definir como uma sugestão aceita vira tarefa futura

## 8. Validação

- [x] `type-check`
- [x] `lint`
- [x] `build`
- [ ] validar a abertura em `idle`
- [ ] validar o fluxo `pergunta -> foco -> expansão`
- [ ] validar clareza visual sem excesso de texto inicial

## 9. Critério final

- [ ] o Atlas abre como inteligência pronta, não como dashboard
- [ ] a conversa nasce no topo esquerdo
- [ ] as sugestões vivem na base da coluna esquerda
- [ ] o córtex responde visualmente à conversa
- [ ] o mapa mental pode crescer sem virar card estático disfarçado

