# Guia de Configurações do Atlas

## Objetivo

Este guia explica, de forma operacional, onde cada configuração do Atlas deve ser feita.

Ele foi pensado para usuários da plataforma, gestores de marca e operadores que precisam:

- conectar fontes
- ajustar o comportamento do Atlas IA
- entender o que fica em cada área
- evitar misturar configuração técnica com leitura de resultado

Este documento não entra em detalhes internos de infraestrutura da plataforma.

---

## Mapa rápido

### `Integrações`

Use para:

- conectar Meta
- conectar GA4
- ativar Gemini por loja
- salvar credenciais da própria marca
- acompanhar sincronizações

Não use para:

- definir estratégia do Atlas
- ajustar temperatura ou skill do agente
- ensinar o Atlas sobre o negócio

### `Configurações`

Use para:

- ajustar modelo do Atlas IA
- definir temperatura
- escolher skill padrão
- configurar janela de análise
- orientar o Atlas com o playbook da marca
- rodar e revisar o `Aprender negócio`

Não use para:

- salvar token da Meta
- colar JSON do GA4
- colar chave do Gemini

### `Admin > Lojas`

Use para:

- revisar plano da marca
- liberar recursos
- governar o uso de IA
- organizar a camada SaaS da operação

### `Torre de Controle`

Use para:

- ver leitura executiva
- priorizar problemas
- acompanhar pressão de margem, resultado e operação
- conversar com o Atlas em contexto de decisão

A Torre não é o lugar certo para parametrizar o agente.

---

## Integrações por loja

O Atlas opera no modelo `uma loja, uma credencial`.

Na prática, isso significa:

- cada loja salva o próprio token da Meta
- cada loja salva o próprio JSON do GA4
- cada loja salva a própria chave Gemini

Isso protege a separação entre marcas e evita dependência operacional entre lojas.

### Ordem recomendada

1. selecionar a marca correta
2. definir o modo da integração
3. preencher IDs operacionais
4. salvar a configuração
5. salvar a credencial da loja
6. executar a sincronização
7. validar na camada analítica correspondente

---

## Meta Ads

Na integração Meta, a loja normalmente configura:

- modo de operação
- ID da conta de anúncios
- ID do catálogo, quando aplicável
- token próprio da Meta
- fallback manual, quando fizer sentido

Validação prática:

- sincronização executa
- campanhas aparecem em `Mídia e Performance`
- catálogo aparece em `Catálogo` quando estiver conectado

Se o erro mencionar permissão da Meta, o problema costuma estar no token, no app ou no acesso ao catálogo.

Tutorial detalhado:

- `Integrações > Tutoriais > Meta`

---

## Google Analytics 4

Na integração GA4, a loja normalmente configura:

- modo `API`
- `Property ID`
- timezone da propriedade
- JSON da service account da própria marca

Validação prática:

- sincronização do GA4 executa
- a camada de tráfego passa a exibir dados
- o Orb para de acusar ausência de GA4 quando a base estiver pronta

Se o erro persistir, revise:

- a propriedade correta
- o JSON completo
- o acesso da service account à propriedade

---

## Gemini / Atlas IA

Na integração Gemini, a loja configura:

- ativação da API
- chave Gemini da própria marca

Depois disso, o comportamento do agente deve ser ajustado em `Configurações`.

Isso inclui:

- modelo
- temperatura
- janela de análise
- skill padrão
- guia operacional da marca

Validação prática:

- a integração fica ativa
- a marca passa a conseguir usar Atlas IA
- a Torre e o Orb começam a refletir essa camada

---

## Configurações do Atlas IA

Essa é a central estratégica do agente.

Ela existe para responder:

- como o Atlas deve pensar
- que modelo usar
- qual lente priorizar
- quanto contexto usar por padrão
- como a marca quer orientar a leitura do agente

### Modelo

Define qual modelo Gemini a marca usa como base.

### Temperatura

Controla o quanto a resposta fica mais conservadora ou mais solta.

### Skill padrão

Escolhe a lente prioritária do Atlas.

Exemplos:

- executivo
- marketing
- receita
- POD
- automático

### Janela de análise

Define o período base quando o usuário não informa outro recorte.

### Guia operacional

É onde a marca ensina o Atlas sobre prioridades, estilo de leitura e regras do negócio.

Boa prática:

- escrever de forma curta
- dar instruções operacionais
- evitar textos longos e genéricos

---

## Aprender negócio

O recurso `Aprender negócio` existe para consolidar o histórico da marca em uma leitura estruturada.

Ele ajuda o Atlas a montar:

- perfil do nicho
- padrão de performance
- oportunidades recorrentes
- erros operacionais
- focos persistentes

Esse recurso fica em `Configurações`, porque é uma camada de orientação do Atlas, não uma leitura de resultado da Torre.

---

## Governança SaaS

O Atlas já separa recursos por plano e governança da marca.

Na prática, isso permite:

- liberar ou bloquear IA
- liberar ou bloquear aprendizado do negócio
- controlar catálogo de modelos Gemini
- escalar o Atlas como SaaS sem dar tudo para todas as marcas

Essa camada deve ser tratada em `Admin > Lojas`, não em `Integrações`.

---

## Diagnóstico rápido

### Quando o problema é da loja

Normalmente você verá sinais como:

- token ausente
- Property ID incorreta
- catálogo não informado
- permissão insuficiente no provedor

### Quando o problema é da plataforma

Normalmente o padrão é este:

- a loja preenche tudo corretamente
- mesmo assim não consegue salvar ou operar a integração
- o erro não aponta para conta, token, propriedade ou catálogo

Nesse caso, o caminho correto é acionar o gestor da plataforma.

---

## Checklist de implantação de uma marca

1. revisar o plano da marca
2. configurar integrações
3. salvar credenciais próprias
4. validar Meta
5. validar GA4
6. validar Gemini, se liberado
7. ajustar o comportamento do Atlas em `Configurações`
8. rodar `Aprender negócio`
9. revisar a Torre de Controle

---

## Tutoriais detalhados

Para passo a passo completo por provedor, use:

- `Integrações > Tutoriais > Meta`
- `Integrações > Tutoriais > GA4`
- `Integrações > Tutoriais > Gemini`

Esses guias foram escritos para a operação da loja, com foco em ação e validação.

---

## Resumo

Se você guardar só uma regra, guarde esta:

- `Integrações` conecta
- `Configurações` orienta
- `Admin > Lojas` governa
- `Torre` decide

Essa separação deixa o Atlas mais claro para usar e mais preparado para escalar.
