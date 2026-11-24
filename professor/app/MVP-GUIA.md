# Guia do Italo

## Agora (desde 24/11/2026): app instalável

- **Endereço:** https://guia-italo.vercel.app (demonstração: `/?demo`). Código em `guia-app/` (HTML, JS e service worker, sem build), publicado no projeto `guia-italo` da Vercel da Peformake.
- **Instalar:** iPhone: Safari → Compartilhar → Adicionar à Tela de Início. Android: Chrome → Instalar app.
- **Login:** a mesma conta do sistema da Peformake (Supabase `peformake-app`). Só o dono (`guia_config.owner`) lê e escreve as tabelas `guia_*`.
- **Telas:** Hoje (missões por horário, nível, XP, sequência), Tarefas, Estudo (passos, inglês com áudio e recado) e Você (estatísticas, 14 dias, conquistas).
- **Jogo:** missão +10 XP, tarefa +5, passo de estudo +5, dia que conta (70%) +20, dia perfeito +30. O nível L começa em 100·L·(L−1)/2 XP.
- **WhatsApp:** o gatilho `guia_from_whatsapp` em `whatsapp_messages` (que o `wasender-webhook` da Peformake já alimenta) lê só texto enviado por ele na conversa consigo mesmo. `+ texto` vira tarefa de hoje; `recado: texto` vira recado. O resto é ignorado, e um erro no gatilho nunca bloqueia a gravação da mensagem.

### Tabelas (Supabase)
| Tabela | Conteúdo |
|---|---|
| `guia_doc` | `agenda` (util, fds, d0..d6), `corpo` (proximo, divisao), `semana` (titulo, objetivo) |
| `guia_registro` | dia → feitos {id do bloco: true} |
| `guia_estudo` | dia, titulo, foco, blocos, feitos, nota |
| `guia_tarefas` | titulo, dia, area, feita, feita_em, origem (app, chat, whatsapp, recado) |
| `guia_recados` | texto, dia, origem, lido |
| `guia_config` | owner, sufixo do número do WhatsApp |

---

## Histórico: versão em página do Claude (artifact)

## Fase 1: no ar desde 24/11/2026 (MVP)

Página: https://claude.ai/artifact/QhwHiXPtMUHxowNuHahM4V (código em `professor/app/rota-de-estudos.html`).

Versão atual (24/11, pedido do Italo: o mínimo, regrado, foco em constância): **a agenda do dia por horário**.

- Topo: **dias seguidos** (um dia conta com 70% dos blocos feitos), 7 bolinhas da semana e o % de hoje. Regra: nunca falhar 2 dias seguidos.
- Linha do tempo: um bloco por horário com um check. O bloco atual aparece como "agora". "ver" abre o detalhe. O bloco de estudo mostra o tema do dia e os passos; o de trabalho mostra as tarefas e um campo "+ tarefa".
- Recado para o professor (fechado por padrão): texto ou fala, salvo em `recados`.

Agenda inicial (dias úteis): 05:30 acordar · 06:00 academia (quarta: caminhada) · 07:00 café com proteína · 07:30 leitura · 08:00 trabalho · 12:00 almoço · 12:40 Duolingo · 16:00 lanche · 19:00 estudo 1 h · 21:30 olhar o amanhã · 22:30 dormir. Fim de semana: 07:00 acordar · 08:00 praia ou caminhada · 09:00 café · 09:30 leitura · 10:00 estudo · 11:15 Duolingo · 12:30 almoço · 21:30 · 22:30.

**Como as tarefas entram hoje:** pela própria página, ou pelo chat do Claude ("anota: …"). Aí o Claude grava em `tarefas` com `origem: "chat"`.

### Banco (db do artifact)

| Coleção | Documento | Campos |
|---|---|---|
| `meta/agenda` | — | regra; util, fds e d0..d6 (dia específico): listas de {h, id, titulo, detalhe, tipo ("trabalho" ou "estudo"), tarefas} |
| `registro` | AAAA-MM-DD | data, habitos {id do bloco: true/false} |
| `habitos` | — | versão anterior, não é mais usada pela página |
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
