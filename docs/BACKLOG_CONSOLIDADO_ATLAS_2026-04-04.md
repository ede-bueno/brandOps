# Backlog Consolidado Atlas

Data de consolidação: 2026-04-04

## Como ler

- `feito`: já entrou no produto ou na base técnica
- `em andamento`: iniciado e com entrega parcial no código
- `pendente`: ainda não implementado

## 1. Arquitetura do Atlas IA

- `feito` Torre de Controle como casa nativa do Atlas IA
- `feito` Orb presente em todo o sistema, mas sem autoabrir conteúdo pesado
- `feito` Orb reposicionado como radar, alerta e busca global
- `feito` backend como fonte de verdade dos números
- `feito` Atlas Analyst read-only com memória recente e feedback
- `feito` credencial Gemini por loja
- `feito` central estratégica em Configurações para modelo, temperatura, skill, janela e playbook
- `em andamento` qualidade e consistência dos especialistas do Atlas com frame executivo consolidado antes da síntese
- `pendente` function calling mais profundo com ferramentas internas especializadas

## 2. Torre de Controle e UX

- `feito` visual da Torre mais leve e alinhado ao restante do sistema
- `feito` redução de texto persistente na Torre
- `feito` uso de hints e infos em vez de blocos longos
- `feito` retirada de aprendizado/configuração da Torre
- `feito` Configurações agrupando integrações, acessos, ajuda e Atlas IA
- `feito` hints da Torre com fundo sólido e contraste de leitura adequado
- `feito` suavização das bordas e cápsulas visuais na mesa de decisão do Atlas
- `em andamento` revisão visual logada fina com marcas reais
- `em andamento` normalizar a mesma suavização visual nas demais telas analíticas para manter o shell inteiro consistente
- `feito` dashboard e leitura histórica de margem já usando superfícies mais suaves e menos contorno agressivo

## 3. Orb

- `feito` Orb não abre sozinho
- `feito` hover só mostra alerta/atalho curto
- `feito` radar contextual por tela
- `feito` busca global no painel do Orb
- `feito` Orb ampliado para focos rápidos e próximos movimentos
- `feito` Orb evoluído para atalhos contextuais e perguntas prontas, reduzindo sobreposição com a Torre
- `em andamento` ampliar taxonomia de alertas com mais sinais por domínio

## 4. Integrações

- `feito` Meta, GA4 e Gemini por credencial própria da loja
- `feito` persistência segura de segredos por marca
- `feito` mensagens mais claras para erros de infraestrutura e permissão
- `feito` Integrações separadas da estratégia do Atlas IA
- `em andamento` revisão fina da UX da aba de Integrações
- `feito` quadro de saúde dos conectores para leitura rápida de status e bloqueios
- `feito` autofoco do workspace no conector que realmente pede ação, erro ou configuração
- `feito` redução de redundância entre contexto, radar lateral e estado resumido do conector
- `feito` Gemini reduzido ao papel correto em Integrações: conexão e saúde, não estratégia do agente
- `pendente` resolver operacionalmente os erros externos da Meta `(#100)` por permissão/app

## 5. Ambiente e operação

- `feito` produção estabilizada com `BRANDOPS_SECRET_ENCRYPTION_KEY`
- `feito` local estável via `next start` em `3008`
- `em andamento` manter o local confiável com rebuild/start após mudanças maiores
- `feito` corrigir o problema do `next dev` no Windows sem recriar conflito em `public/_next`

## 6. Aprendizado do negócio

- `feito` backlog da frente de aprendizado documentado
- `feito` fundação do modo `Aprender negócio`
- `feito` painel na Central Estratégica para disparar a aprendizagem
- `feito` persistência de runs e snapshots de aprendizado
- `feito` bloqueio de execuções concorrentes por marca
- `feito` snapshot enriquecido com sinais do negócio, padrões e pilha de prioridades
- `feito` sugestão de reaprendizagem quando a base muda após o último snapshot
- `feito` comparação básica com o snapshot anterior na Central Estratégica
- `feito` feedback humano do snapshot de aprendizado para validar se o Atlas entendeu bem o negócio
- `feito` comparação entre snapshot atual e anterior com novos focos, focos persistentes e sinais que perderam força
- `feito` reaprendizagem sugerida quando há importações ou sincronizações mais novas que o snapshot
- `feito` aprendizagem por janela de análise (`30d`, `90d`, `180d` ou histórico completo)
- `feito` aprendizagem por janela estratégica baseada na configuração da marca
- `feito` uso do snapshot anterior como memória para reaprendizagem incremental
- `feito` exposição de próximos marcos, watch items e gatilhos de reaprendizagem na Central Estratégica
- `feito` exposição de período analisado, evidências usadas e lacunas da leitura
- `feito` execução assíncrona do aprendizado com retorno rápido e polling de status
- `feito parcial` persistência estruturada de findings fora do blob do snapshot
- `pendente` persistência estruturada de evidências consultáveis fora do blob principal

## 7. Próximas prioridades recomendadas

1. persistir evidências consultáveis para explicar melhor o que o Atlas aprendeu
2. elevar a consistência dos insights do Atlas com playbooks mais específicos
3. revisar manualmente a experiência logada de Torre, Configurações e Integrações
4. aprofundar o papel do Orb como radar/atalho, sem duplicar a Torre
5. substituir o pós-resposta atual por fila/worker mais durável para o aprendizado assíncrono

## 8. Navegação e arquitetura do produto

- `feito` reorganização do sidebar por camadas de produto: Controle, Negócio, Aquisição, Operação e Plataforma
- `pendente` consolidar a camada de relatórios como leitura histórica e a camada operacional como execução
- `pendente` preparar a futura camada de criação para conteúdo, social e anúncios sem poluir a navegação atual
- `pendente` expandir a busca global do Orb para navegar entre dados, guias e comandos de plataforma
- `pendente` revisar a taxonomia final do menu com marcas reais e uso recorrente

## 9. SaaS, papéis e planos

- `em andamento` modelagem inicial de plano da marca e feature flags por recurso
- `feito` liberação ou bloqueio de Atlas IA, Torre IA, aprendizado e catálogo Gemini por marca
- `feito` gestão visual de plano e liberações na área de lojas
- `pendente` modelar papéis de plataforma, grupo e marca com hierarquia clara
- `pendente` permitir administrador de grupo com autonomia sobre as próprias marcas
- `pendente` estruturar planos, assinatura e limites de uso da plataforma
- `pendente` definir limites por plano para marcas, usuários, importações, uso de IA e automações

## 10. Catálogo de modelos e governança da IA

- `feito` listar os modelos Gemini disponíveis a partir da chave da própria loja
- `feito` mover modelo, temperatura, skill e janela para a central estratégica
- `pendente` governar seleção de modelo por plano ou por perfil de marca
- `pendente` permitir política de modelos por tarefa, como diagnóstico rápido vs análise profunda
- `pendente` adicionar fallback explícito e observabilidade para falhas de catálogo de modelos
