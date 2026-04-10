# BrandOps Constitution

Versão: 2026-04-09
Status: ativa

## 1. Fonte de verdade

- cálculos críticos do Atlas devem depender do backend como fonte de verdade
- frontend não deve reinventar números gerenciais quando a camada canônica existir
- sempre priorizar coerência financeira sobre conveniência visual

## 2. Separação de responsabilidades

- configuração técnica fica fora da leitura executiva
- leitura factual vem antes da IA
- IA recomenda, humano decide, sistema executa apenas dentro do escopo liberado

## 3. Design e navegação

- BrandOps é o produto; Atlas é o agente de IA dentro do produto
- contexto global deve ficar no header global
- páginas não devem repetir marca, período ou contexto já visível no shell
- gráfico largo vence card narrativo
- dashboard é exceção; console operacional é a regra
- telas operacionais devem priorizar lista, tabela, filtros, split view, drawer e edição contextual
- cards devem ser compactos, comparáveis e orientados a decisão quando realmente necessários
- qualquer tela nova deve usar as primitives do design system atual
- o sistema não deve ficar preso ao visual do Carbon; a linguagem pode evoluir desde que preserve clareza operacional e consistência
- toda rota deve se declarar dentro de um floorplan canônico (`dashboard hub`, `list report`, `worklist`, `split workspace`, `object workspace`, `guided content` ou `holding page`)
- `dashboard hub` deve ficar concentrado na Torre de Controle; fora dela, o padrão deve ser workspace operacional
- `guided content` deve ensinar ou orientar; não deve herdar grade de KPI como fachada
- `holding page` só existe para frentes pausadas ou em replanejamento e não deve parecer feature pronta

## 4. Multi-marca e segurança

- cada marca opera com suas próprias credenciais
- segredos por loja não devem vazar entre marcas
- governança SaaS deve ser orientada a banco e feature flags

## 5. Integrações

- integrações devem ser configuráveis por loja
- erros de fonte devem ficar visíveis para o operador
- fallbacks devem ser explícitos, nunca implícitos

## 6. IA e agentes

- Atlas IA deve usar contexto real do negócio e da rota atual
- memórias e aprendizados devem ser rastreáveis
- qualquer automação futura deve respeitar revisão humana quando houver risco operacional, comercial ou de marca

## 7. Qualidade de entrega

- mudanças relevantes devem nascer em `spec`, `plan` e `tasks`
- mudanças de produto devem ser verificadas com `type-check`, `lint` e validação básica de runtime
- a solução mais simples, estável e clara vence

## 8. Critérios de aceite gerais

- o usuário entende onde está
- o usuário entende o que a tela quer mostrar
- o usuário entende qual é o próximo clique
- a base factual continua consistente
- a implementação não cria uma linguagem paralela ao Atlas
