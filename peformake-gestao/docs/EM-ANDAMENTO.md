# Em andamento (passagem de bastão entre PC e nuvem)

Este arquivo aparece sozinho ao abrir qualquer sessão. Quem parar no meio de uma tarefa escreve aqui
o próximo passo exato, faz commit e push. Quem terminar a tarefa apaga o item.

## Pendências técnicas (dossiê, campos do roteiro, telas, domínio)
- Onde parou: só levantamento, nada alterado no código nem no banco (nuvem, 19/11).
- Próximo passo: seguir `peformake-gestao/docs/PROMPT-PENDENCIAS-TECNICAS.md` do item 1 ao 4.
- Domínio: em 19/11 o peformake.com ainda apontava para a Lovable. Não trocar links antes de conferir.

## Estratégia do mês + Plano de vendas (20/11, pela metade)
- FEITO (tela e PDF): aba Resumo virou "Estratégia" (novo tipo `acao`: o_que, como, quando, oferta, como_medir, opcoes[{nome, link, porque}]); aba Atendimento virou "Plano de vendas" (novo tipo `plano`: meta, ticket, quem_vende, canais[], etapas[{etapa, o_que_fazer, quem}], semanas[{semana, meta, foco}]) + roteiros de WhatsApp. Ordem das abas: Estratégia, Vídeos, Social, Plano de vendas, Tráfego.
- FALTA: 1) `supabase/functions/strategy-cards/index.ts`: CORE_SCHEMA ganhar `acoes` (3 a 5, ex.: chamar influenciador com 5 opções reais e a oferta) e `plano_vendas`; cardsOf grava `acao` (resumo, pos 30+i) e `plano` (atendimento, pos 0; roteiros 10+i); redo mapeia acao→acoes e plano; Social só `post`/`carrossel` (tirar reels/stories dos enums e do texto). Publicar a função. 2) `agent_instructions('estrategia-interativa')` e `docs/ROTINA-ESTRATEGIA-CARDS.md` com os dois tipos novos e o Social só post/carrossel. 3) Cards antigos de Social com formato reels continuam até gerar de novo.

## Perguntas do briefing em conversa (pedido do Italo, 20/11, NÃO começado)
- Trocar as perguntas fixas por um chat estilo WhatsApp que vai preenchendo o briefing e a ficha do cliente: cada pergunta nasce da resposta anterior (nada padronizado por cliente), cruzando briefing, ficha, histórico, relatórios e o que está acontecendo no mercado no mês.
- Sugere opções tocáveis (ex.: "Italo, este mês está acontecendo X. Para a Peformake, o que acha destas 5 opções?"), aceita toque, texto e áudio (transcrição), e avança até ter tudo que a estratégia precisa (mês, fixas, comunicação). Ao fim grava nos campos do briefing e da ficha.
- Base: `QuestionsPanel.tsx`, `BriefingView.tsx`, `strategy_brief_context`, chat da Bete (`GoalsChat.tsx`) como modelo visual. IA pela API (registrar em ai_usage_log, respeitar teto).
