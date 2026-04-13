# Checklist de Release - Torre, Alertas e Atlas IA

Data: 2026-04-13

## Objetivo

Garantir que a frente de `Torre de Controle`, `alertas` e `Atlas IA` siga para preview e revisão final sem perda de contexto.

## Pronto no código

- alertas unificados entre Torre, shell e Orb
- Atlas alinhado ao recorte ativo da shell quando houver filtro manual
- navegação mobile com destinos semânticos
- ajuda com âncoras contextuais
- CTAs de próximos passos mais explícitos
- estados de bloqueio do Atlas mais claros

## Validado localmente

- `npm run check`
- `npm run build`
- `http://127.0.0.1:3009/dashboard`
- `http://127.0.0.1:3009/help`
- `http://127.0.0.1:3009/dre`
- `http://127.0.0.1:3009/settings`
- `http://127.0.0.1:3009/integrations`

## Antes do merge

- abrir a preview da branch `codex/fechamento-torre-alertas-atlas`
- revisar visual e navegação em desktop e mobile
- conferir os estados abaixo com marca real:
  - Atlas pronto
  - Atlas com Gemini pendente
  - Atlas bloqueado por plano
  - integração com erro recente
  - saneamento pendente
  - ausência de GA4

## Critérios de aceite

- o alerta dominante aponta para o mesmo próximo clique nas superfícies principais
- o Atlas não contradiz o recorte ativo escolhido pelo operador
- a ajuda abre no bloco certo a partir dos links contextuais
- o Orb sugere próximos passos coerentes com o estado da operação
- os CTAs deixam claro qual tela o operador deve abrir

## Dependências externas

- autenticação Vercel para gerar preview remota nesta sessão
- abertura do PR no GitHub a partir da branch já publicada

## Branch

- `codex/fechamento-torre-alertas-atlas`
