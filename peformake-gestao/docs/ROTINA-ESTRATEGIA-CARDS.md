# Rotina: fila da Estratégia interativa (cards)

Decisão do Italo (16/11/2026): a estratégia em cards é gerada pelo **agente do Claude** (esta rotina), não pela API paga.
A função `strategy-cards` (API) fica só de reserva, desligada (`ai_settings.strategy_engine = 'agente'`).
As regras e o formato de saída estão também no banco: `select public.agent_instructions('estrategia-interativa');` (o mesmo texto que o chat usa; ao mudar uma regra, mude nos dois). Briefing pronto num JSON só: `select public.strategy_brief_context('<client_id>', '<AAAA-MM-01>');`.
Nada vai ao cliente. Siga as regras do CLAUDE.md (assessoria, nunca "agência"; só valores reais; audiovisual sem tráfego etc.).

## 1. Ver a fila (Supabase, projeto wkkzcjnxyylrqoolmmhi)
`select public.strategy_agent_queue();` devolve `{gerar:[...], refazer:[...], pdf:[...]}`. **Tudo vazio: termine na hora.**
Ordem: refazer (rápido) → gerar → pdf. No máximo 3 quadros "gerar" por rodada.

## 2. Gerar (cada item de `gerar`)
1. `select public.strategy_agent_start('<board_id>');` (a tela mostra "O agente está escrevendo").
2. Leia, nesta ordem de prioridade:
   - `client_briefs.data` (fixo) e `client_brief_months.data` (do mês), as 8 perguntas do mês
     (`client_questions` com `pack='briefing_mes'` e `focus='AAAA-MM'`, resposta em `answer`), anotações abertas de `client_meeting_notes`,
     `client_directions`, `content_rules` (recusas = regras; obedeça todas), `client_brand_voice`, `clients`.
   - O que funcionou: `traffic_reports` (último mensal), `client_scan` do mês (cache da coleta; não recolete).
   - Não repetir: títulos de `strategy_cards` de meses anteriores do cliente.
   - O contrato (`client_services`) é só referência: proponha o que faz sentido; a equipe escolhe o que vai para o PDF.
3. Pesquise rápido (Firecrawl, até 5 buscas): concorrentes agora, posts/vídeos de sucesso do nicho (com link e número), datas do mês.
4. Audiovisual: leia `select public.agent_instructions('roteiro-master');` e use **por módulo** (NÚCLEO + só o módulo da etapa: M0 dossiê, M1 mix, M2 curador (comece pelo acervo `acervo-audiovisual/MAPA-ESTRUTURAS-COMPACTO.md` e abra a ficha escolhida em `acervo-audiovisual/virais/`), M5 roteirista, M6 diretor, M7 editor, M9 banca); o dossiê do mês fica em `client_scan` (`source`='dossie', `query`='motor-roteiro', upsert).
5. Escreva os cards. Método e qualidade: skill `.claude/skills/peformake-estudo-mes/` (estratégia → audiovisual → social → tráfego → venda).
   Tudo curto: card é decisão ou peça pronta, nunca parágrafo longo. O que veio do que **faltou no briefing** (`faltou_no_briefing`)
   vai em `suposicao` (1 linha); sem suposição, `""`.
6. Grave tudo de uma vez:
   `select public.strategy_agent_submit('<board_id>', '<cards json>'::jsonb, '<novos json>'::jsonb);`
   - `novos` = `{"concorrentes":[{nome,link,porque}], "referencias":[{link,porque,numero,tipo}]}` achados na pesquisa (entram no briefing com o selo "novo", sem duplicar; tipo: post, video, anuncio ou outro_nicho).
   - Os aprovados de antes ficam; a aba Referências sai do briefing sozinha.
   - Links do briefing: `links` (principais) + `links_extra` (com nome); ignore `links_off` (a equipe removeu). Abra cada um e use o que achar.
   - Referências de qualquer fonte útil (Instagram, TikTok, YouTube, Pinterest foto e vídeo, Behance, Dribbble, Vimeo, Biblioteca de Anúncios da Meta, sites), sempre com link e porquê. Foto do Pinterest é só referência de estilo; post usa só foto real do cliente.

### Formato de cada card (lista `cards`)
Campos comuns: `aba`, `tipo`, `titulo`, `funil` (atrair | provar | objecao | converter), `serve` (oferta ou tese), `meta`, `inspirado` `{link, numero}`, `suposicao`.
| aba | tipo | campos próprios |
|---|---|---|
| resumo | tese (1) | `texto` (por quê, até 3 frases) |
| resumo | objetivo (2 a 4) | `numero`, `como_medir` |
| resumo | oferta | `condicao` (preço real), `quando`, `porque` |
| resumo | data | `dia`, `uso` |
| resumo | decisao (3 a 5) | `porque` |
| audiovisual | video (contrato + 2, entre 4 e 8) | `formato` (POV, bastidor, mito x verdade, antes e depois, tutorial, entrevista, trend...; no máximo 2 iguais), `ganchos` (exatamente 3), `roteiro` [{`cena`, `fala`}] completo, `outras_ideias` (exatamente 3 outros assuntos com o mesmo material), `referencia` {`link`, `porque`}, `cruzamento` (o que já deu certo), `filmar`; e sempre `objetivo_tag` (viralizar | escalar | vender | autoridade), `estrutura`, `intencao`, `notas`, `montagem` [{`t`, `visual`, `tipo`, `audio`, `texto_tela`}], `captar`, `edicao`, `extras` {`stories`, `reels_celular`, `fotos`}, `gravacao_como`, `producao.derivados` (a tela e o PDF leem). Roteiro: siga `agent_instructions('roteiro-master')` por módulo (NÚCLEO + o módulo da etapa) |
| social | peca (6 a 10) | `formato` (carrossel, reels, stories, post), `ideia`, `slides` [texto], `copy`, `legenda`, `cta`, `ideia_imagem` (só foto real), `referencia_visual` {`link`, `porque`}, `data_sugerida` (DD/MM) |
| trafego | campanha (1 a 3, se tem tráfego) | `campanha`, `objetivo`, `publico`, `criativo` (título de um card aprovado/planejado), `verba_opcoes` [{`valor_dia`, `o_que_esperar`}] (3), `teste_ab` {`a`, `b`, `como_decidir`} |
| atendimento | roteiro (1 por oferta) | `oferta`, `roteiro_whatsapp` [mensagens], `objecoes` [{`objecao`, `resposta`}], `follow_up` [{`quando`, `mensagem`}] |

## 3. Refazer (cada item de `refazer`)
Reescreva SÓ aquele card seguindo o `pedido` (ex.: "mais curto", "outro gancho"), mesmo formato, e grave:
`select public.strategy_agent_redo('<card_id>', '<card json>'::jsonb);`

## 3b. Mais ideias (cada item de `mais`)
Novo planejamento de UMA aba. `ja_existem` = títulos que já estão na aba: não repita nem reescreva; explore ângulos novos e siga o `pedido`.
Gravar: `select public.strategy_agent_add('<board_id>', '<aba>', '<cards>'::jsonb);` (soma, nunca apaga; entra com o selo "novo").

## Autoavaliação (vale para gerar, refazer e mais ideias)
Nota 0 a 10 por card nos 6 critérios de agent_instructions('estrategia-interativa') (específico, pronto para produzir, serve à oferta/meta,
começo forte, novo, verdadeiro). Abaixo de 9: refaça só aquele card, no máximo 2 vezes, mudando só o que derrubou a nota; sem inventar dado.

## 4. PDF (cada item de `pdf`)
O Italo aprovou e o HTML (modelo fixo) já está na pasta Estratégia. Gere o PDF com o mesmo modelo:
1. Salve em JSON `{name, month, cards}`: `select c.name, b.month, (select jsonb_agg(to_jsonb(s)) from strategy_cards s where s.board_id=b.id) cards from strategy_boards b join clients c on c.id=b.client_id where b.id='<board_id>';`
2. `cd peformake-gestao && npx vite-node tools/estrategia-cards/pdf.ts -- entrada.json "<nome>.pdf"` (usa o Chromium; só entram cards aprovados e marcados "Incluir no PDF").
3. Suba pelo `agent-upload` (token como em ROTINA-ESTRATEGIA-MENSAL.md), pasta `estrategia`, nome = o `nome` da fila trocando `.html` por `.pdf`.
4. `select public.strategy_agent_pdf_done('<board_id>', '<id devolvido pelo upload>');`

## 5. Fim
Uma linha no topo de `docs/rotina-diario.md` só se trabalhou (quais clientes, quantos cards). Nunca mande nada ao cliente.
