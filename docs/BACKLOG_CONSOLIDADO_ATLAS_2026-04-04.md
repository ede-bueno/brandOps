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
- `feito` Torre refatorada para priorizar alerta dominante, decisão agora e drilldown sob demanda
- `feito` núcleo do Atlas simplificado com primeira dobra mais curta em Torre, Analyst, aprendizado e configurações
- `feito` adoção explícita da régua utilidade máxima + carga cognitiva mínima como critério de aceite das telas
- `feito parcial` ajuda, tutoriais, margem histórica e superadmin já ganharam primeira dobra mais curta e orientada a ação
- `feito parcial` shell, login, dashboard, integrações e central estratégica já passaram por corte de redundância e simplificação da primeira dobra
- `em andamento` revisão visual logada fina com marcas reais
- `em andamento` normalizar a mesma suavização visual nas demais telas analíticas para manter o shell inteiro consistente
- `feito` dashboard e leitura histórica de margem já usando superfícies mais suaves e menos contorno agressivo
- `feito parcial` mídia, tráfego, produto, saneamento, vendas, feed, importação, DRE, CMV e lançamentos agora abrem com leitura mais curta e indicadores auxiliares recolhidos
- `feito parcial` ajuda, tutoriais e governança administrativa também já usam hierarquia mais curta e abertura orientada a ação
- `pendente` elevar a Torre para uma experiência premium de comando, com estados ainda mais surpreendentes por domínio e contexto

## 3. Orb

- `feito` Orb não abre sozinho
- `feito` hover só mostra alerta/atalho curto
- `feito` radar contextual por tela
- `feito` busca global no painel do Orb
- `feito` Orb ampliado para focos rápidos e próximos movimentos
- `feito` Orb evoluído para atalhos contextuais e perguntas prontas, reduzindo sobreposição com a Torre
- `feito` Orb reduzido a alerta principal, próximos cliques e busca global, com menos blocos concorrendo entre si
- `em andamento` ampliar taxonomia de alertas com mais sinais por domínio

## 4. Integrações

- `feito` Meta, GA4 e Gemini por credencial própria da loja
- `feito` persistência segura de segredos por marca
- `feito` mensagens mais claras para erros de infraestrutura e permissão
- `feito` Integrações separadas da estratégia do Atlas IA
- `feito` programação automática por loja para Meta e GA4 na Central Estratégica
- `feito` cron global horário em `/api/cron/brand-syncs`, com vencimento por marca e por conector
- `em andamento` revisão fina da UX da aba de Integrações
- `feito parcial` Integrações reorganizada como workspace curto com trilho lateral, subtabs e radar compacto
- `feito parcial` Configurações reorganizada como central de ação rápida, foco atual e governança sem blocos longos de explicação
- `feito` quadro de saúde dos conectores para leitura rápida de status e bloqueios
- `feito` autofoco do workspace no conector que realmente pede ação, erro ou configuração
- `feito` redução de redundância entre contexto, radar lateral e estado resumido do conector
- `feito` Gemini reduzido ao papel correto em Integrações: conexão e saúde, não estratégia do agente
- `feito` lock/idempotência com TTL no cron central para evitar sobreposição de execuções
- `feito` rota antiga `/api/cron/meta-sync` aposentada com resposta explícita de depreciação
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
- `feito` persistência estruturada de findings fora do blob do snapshot
- `feito` painel de aprendizado reduzido a resumo executivo, mudança de ciclo e mapa completo por clique
- `feito` persistência estruturada de evidências consultáveis fora do blob principal

## 7. Próximas prioridades recomendadas

1. elevar a consistência dos insights do Atlas com playbooks mais específicos
2. refatorar `database.ts` e `BrandOpsProvider.tsx` em módulos menores
3. refatorar a aba de Integrações em subcomponentes menores por conector e seção
4. fatiar o núcleo do Atlas IA em planner, tool-runner, learning-context e síntese
5. desacoplar fallback de governança hardcoded e deixar plano/feature flags 100% orientados a banco
6. revisar manualmente a experiência logada de Torre, Configurações e Integrações
7. aprofundar o papel do Orb como radar/atalho, sem duplicar a Torre
8. substituir o pós-resposta atual por fila/worker mais durável para o aprendizado assíncrono
9. consolidar a régua ADHD-friendly nas telas restantes de apoio, admin e fluxos menos recorrentes

## 8. Navegação e arquitetura do produto

- `feito` reorganização do sidebar por camadas de produto: Controle, Negócio, Aquisição, Operação e Plataforma
- `feito parcial` sidebar com legibilidade suavizada, conta movida para o header e menor peso tipográfico
- `pendente` consolidar a camada de relatórios como leitura histórica e a camada operacional como execução
- `pendente` preparar a futura camada de criação para conteúdo, social e anúncios sem poluir a navegação atual
- `pendente` expandir a busca global do Orb para navegar entre dados, guias e comandos de plataforma
- `pendente` revisar a taxonomia final do menu com marcas reais e uso recorrente
- `pendente` evoluir o sidebar para grupos colapsáveis e arquitetura final por domínios de trabalho

## 11. Meta, social e camada criativa

- `feito parcial` leitura operacional de Meta Ads e catálogo via integrações por marca
- `pendente` ampliar consumo da Meta Marketing API para criativos, anúncios, conjuntos, campanhas e catálogos com mais profundidade
- `pendente` validar permissões, produtos e escopo para operação social com Instagram Graph API e Pages API
- `pendente` desenhar a futura camada de criação para conteúdo, agendamento e publicação social assistida
- `pendente` separar claramente no produto o que é leitura, o que é operação de mídia e o que é gestão social

## 9. SaaS, papéis e planos

- `em andamento` modelagem inicial de plano da marca e feature flags por recurso
- `feito` liberação ou bloqueio de Atlas IA, Torre IA, aprendizado e catálogo Gemini por marca
- `feito` gestão visual de plano e liberações na área de lojas
- `em andamento` fallback de governança por hardcode ainda existe para marcas da plataforma e precisa sair do código
- `pendente` modelar papéis de plataforma, grupo e marca com hierarquia clara
- `pendente` permitir administrador de grupo com autonomia sobre as próprias marcas
- `pendente` estruturar planos, assinatura e limites de uso da plataforma
- `pendente` definir limites por plano para marcas, usuários, importações, uso de IA e automações

## 10. Catálogo de modelos e governança da IA

- `feito` listar os modelos Gemini disponíveis a partir da chave da própria loja
- `feito` mover modelo, temperatura, skill e janela para a central estratégica
- `feito` alinhar defaults do Atlas para a família Gemini 3, usando Flash para operação e 3.1 Pro para análise profunda/aprendizado
- `pendente` governar seleção de modelo por plano ou por perfil de marca
- `pendente` permitir política de modelos por tarefa, como diagnóstico rápido vs análise profunda
- `pendente` adicionar fallback explícito e observabilidade para falhas de catálogo de modelos
