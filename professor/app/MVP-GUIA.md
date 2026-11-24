# Guia do Italo: MVP e próximas fases

## Fase 1: no ar desde 24/11/2026 (MVP)

Página: https://claude.ai/artifact/QhwHiXPtMUHxowNuHahM4V (código em `professor/app/rota-de-estudos.html`).

Versão minimalista (pedido do Italo em 24/11): **uma tela só**.

- Topo: % do dia, barra e % da semana.
- Três listas com a própria barra de progresso: **Rotina**, **Estudo** e **Tarefas** (inclui as atrasadas). Tocar em "ver" abre o detalhe, os links e as frases em inglês com áudio.
- Campo para nova tarefa.
- **Recado para o professor:** texto falado (botão Gravar quando o aparelho permite, ou o microfone do teclado do celular) salvo em `recados`. A rotina de segunda lê cada recado, transforma pedido em tarefa e marca como lido.

**Como as tarefas entram hoje:** pela própria página, ou pelo chat do Claude ("anota: …"). Aí o Claude grava em `tarefas` com `origem: "chat"`.

### Banco (db do artifact)

| Coleção | Documento | Campos |
|---|---|---|
| `habitos` | id do hábito | titulo, min, area, freq ("diario" ou "semana"), alvo, dias [0-6], ativo, detalhe, ordem |
| `registro` | AAAA-MM-DD | data, habitos {id: true/false} |
| `dias` | AAAA-MM-DD | plano de estudo: titulo, foco, blocos [{min, tipo, titulo, detalhe, links, falar}], feitos [índices], nota |
| `tarefas` | automático | titulo, data (ou null), area, feita, feitaEm, origem ("app", "chat" ou "whatsapp"), criadaEm |
| `recados` | automático | texto, data, criadoEm, lido |
| `aulas`, `recursos` | id | aulas e acervo |
| `meta` | `semana`, `corpo` | foco da semana e programa; próximo treino, divisão, link do acompanhamento |

### Limites conhecidos da fase 1
- Só abre dentro do Claude, logado. Não instala como app.
- Não recebe mensagem de WhatsApp.
- A agenda do Google saiu da tela para manter o mínimo. Volta na fase 2.
- O áudio não fica salvo como arquivo: vira texto na hora. O Claude não consegue ouvir arquivos de áudio daqui.
- O treino detalhado fica na página de treino e nutrição (outra sessão). Aqui aparece só o resumo e o check semanal.

## Fase 2: app instalável e WhatsApp (só depois de 4 semanas de uso)

**Critério para começar:** o Guia ter sido usado em pelo menos 20 dos 28 dias (medido pela aba Progresso). Se não for usado, o problema não é ferramenta, e construir app seria distração dourada.

Arquitetura proposta, reaproveitando o que já existe na Peformake:

```
WhatsApp do Italo ──► Wasender (webhook) ──► Supabase Edge Function "guia-inbox"
                                                   │  entende a mensagem (Claude API)
                                                   ▼
                                       Supabase: tabelas habitos, registro,
                                       tarefas, plano_estudo (mesmos campos acima)
                                                   │
                         ┌─────────────────────────┼──────────────────────────┐
                         ▼                         ▼                          ▼
               PWA instalável (React/Vite,   Google Agenda (API):     Claude (rotina semanal):
               no Vercel; "Adicionar à       cria evento para         lê progresso, monta a
               tela de início")              tarefa com horário       semana, escreve o plano
```

- **WhatsApp:** número separado do pessoal (o Wasender não é oficial e pode ser bloqueado). Mensagens como "tarefa: ligar contador amanhã 10h" ou "treinei costas" viram registro. Responde com confirmação curta.
- **App:** PWA com o mesmo layout desta página, instalável no celular, com notificação às 7h (plano do dia) e às 21h (fechar o dia).
- **Google:** a tarefa com horário vira evento no Google Agenda, e o resumo semanal vai para o Drive.
- **Migração:** exportar o banco do artifact (ArtifactData list) e importar nas tabelas do Supabase. Os campos já foram desenhados iguais.

Estimativa: 1 a 2 semanas de trabalho com Claude Code, no stack que o Italo já usa (Supabase, Vercel, Wasender).
