# Base de conhecimento INK no Atlas

## Objetivo

Tornar o Atlas mais especialista na plataforma INK sem elevar custo monetário de IA.

## Estratégia adotada

- crawl público do help center da INK
- armazenamento dos artigos no Supabase
- busca lexical local por título, categoria, resumo e corpo do artigo
- envio ao Gemini apenas das 2 ou 3 referências mais relevantes para a pergunta

## Por que este desenho é barato

- o sync do help center não usa Gemini
- não há embeddings nem indexação vetorial nesta fase
- a busca é feita localmente pelo Atlas com score lexical
- o Gemini só consome trechos curtos quando a pergunta realmente pede contexto da INK

## Estrutura persistida

Tabelas:

- `atlas_ink_help_sync_runs`
- `atlas_ink_help_categories`
- `atlas_ink_help_articles`

## Como sincronizar

1. garantir `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` em `.env.local`
2. aplicar migrations
3. executar:

```powershell
node scripts\sync_ink_help_center.js
```

## Como o Atlas usa isso

- a rota do `Atlas Analyst` consulta a base da INK quando a pergunta tem cara de dúvida operacional da plataforma
- o prompt recebe apenas referências compactas: título, categoria, trecho curto, data e URL
- a resposta do Atlas pode citar o artigo quando isso ajuda a orientar o operador

## Próximos passos naturais

- refresh recorrente do help center
- uso da base da INK também em ajuda contextual e tutoriais internos
- eventual expansão para um índice híbrido se a base crescer demais ou a busca lexical ficar insuficiente
