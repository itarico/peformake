# Rotina: estratégia completa do mês seguinte (pronta até o dia 15)

Decisão do Italo (12/11/2026): as estratégias e os relatórios são feitos pelo **agente do Claude** (não pelo motor da API do sistema), e os PDFs sobem na **pasta do cliente** (Arquivos → Estratégia / Social media / Audiovisual / Relatórios). Regra do Italo: **tudo pronto 16 dias antes do mês começar** (até o dia 15). A rotina roda dos dias 11 a 15 e cada dia continua a fila de onde parou.

**Método:** siga a skill `.claude/skills/peformake-estudo-mes/SKILL.md` (3 etapas: diagnóstico e estudo → estratégia mensal → peças: social, design, audiovisual, tráfego e venda). Este arquivo cuida da fila, dos dados e do upload.

## Fila
- Clientes ativos (não perdidos, não desativados) com serviço ativo de consultoria, tráfego, social/design ou audiovisual: `select c.id, c.name from clients c where c.is_active and not c.is_lost and (public.client_in_area(c.id,'trafego') or public.client_in_area(c.id,'social') or public.client_in_area(c.id,'audiovisual') or public.client_in_area(c.id,'consultoria'))`.
- Já feito no mês: existe em `client_assets` (source = 'agente', folder = 'estrategia') um arquivo com o nome do mês seguinte. Pule esses.
- No máximo **8 clientes por dia** (custo e qualidade). Prioridade: quem tem mais serviços contratados.

## Um estudo, três documentos (+ relatório)
Para cada cliente, um estudo só, no design aprovado (o mesmo da apresentação "estrategia-nov-dez" do Paulo: identidade Peformake; audiovisual Ellcazo com fundo verde-limão/branco e preto só nos detalhes). Siga as regras do CLAUDE.md.
1. **Estratégia do mês** (pasta `estrategia`): diagnóstico embutido e objetivo (1–3 páginas com números), tese do mês, ofertas e vendas, tráfego em resumo, decisões e próximos passos. Poucas páginas.
2. **Planejamento de social media** (pasta `social`): pilares, ritmo, calendário do mês, peças com título, objetivo, copy e direção de arte. Só se o cliente tem social/design.
3. **Planejamento de audiovisual** (pasta `audiovisual`): estudo pela comunicação do cliente, até 10 vídeos, uma página por vídeo com a prévia (miniatura real) e o link da referência, 3 ideias de abordagem por vídeo, quem fala/quem grava, dia de gravação. Gastronomia: pouca fala, muito desejo. Só se o cliente tem audiovisual.
   **Regra do Italo (13/11/2026): o audiovisual nasce da Estratégia do mês, nunca solto.** Escreva a estratégia primeiro e só então o audiovisual (e o social), usando os MESMOS parâmetros: tese, ofertas com data, metas, cases e calendário. Cada vídeo declara: qual oferta ou tese serve, o papel no funil (atrair, provar, quebrar objeção, converter) e a meta que mede (views, conversas, pedidos). Proibido vídeo que não sirva a uma oferta ou à tese (bastidor e humor só como embalagem de um desses papéis).
   Antes de escrever os roteiros, o estudo preenche 6 blocos (vai numa página "Estudo do audiovisual" no início do PDF):
   1. **Mercado e anúncios:** os 10 anúncios ativos há mais tempo do nicho na cidade (Biblioteca de Anúncios): promessa, gancho dos 3 primeiros segundos, prova, oferta e chamada. O que todos dizem × o espaço vazio.
   2. **Tendência e momento:** o que viraliza nos últimos 30 dias no nicho (formatos, ganchos, áudios, temas de data) e o que já cansou. Referências com muitas views e de quem vende o mesmo tipo de produto/serviço, nunca escolhidas só pelo título.
   3. **Comunicação:** como o cliente fala hoje, como o público fala (comentários, avaliações, perguntas no WhatsApp) e o tom da marca.
   4. **Narrativa do período:** herói (o público), problema, vilão, virada e prova, ligada à tese da estratégia.
   5. **Estrutura e objetivo:** a distribuição dos vídeos por papel no funil (ex.: 3 atrair, 3 provar, 2 objeção, 2 converter) com a meta de cada um.
   6. **Escopo:** quantos vídeos, diárias, quem fala, quem grava, o que cabe na equipe.
   Cada vídeo sai com: storytelling (gancho, conflito, virada, chamada), storyboard cena a cena (o que aparece, enquadramento, fala, texto na tela, duração), a referência real com o porquê dela funcionar, e as 3 ideias de abordagem como variações do mesmo objetivo.
4. **Estratégia de tráfego** (pasta `trafego`): o que aplicar no mês seguinte: campanhas, públicos, criativos (ligados às peças e vídeos do mês), verba em opções, testes A/B, metas e calendário de subida/pausa. Só se o cliente tem tráfego. É o que aparece no cartão Tráfego.
5. **Relatório do mês** (pasta `relatorios`): estilo Reportei, um por conta, do mês fechado. Só se o cliente tem tráfego. Aparece só na aba Relatórios (nunca no cartão Tráfego).

## Dados
- **Primeiro, as anotações da reunião** (`client_meeting_notes` com `done_at` nulo): são pedidos do cliente e têm prioridade sobre tudo. Depois de aplicar no documento, marque `done_at = now()`.
- Supabase `wkkzcjnxyylrqoolmmhi` (só leitura): `consult_docs` (diagnóstico), `client_brand_guides`, `client_brand_voice`, `client_services`, `client_questions` respondidas, `client_scan` e `monthly_scan_extra`, `content_items`, `av_projects`, `traffic_daily_metrics`, `ad_accounts`, `client_directions` (direcionamento da equipe tem prioridade).
- Meta (só leitura; nunca alterar nada): contas de anúncio e Biblioteca de Anúncios pelos conectores ADS.
- Firecrawl (scrapecreators: tiktok/search-videos, instagram/search-reels, instagram/user-posts) para concorrentes e o que está viralizando; teto de 40 créditos por cliente.

## Subir os PDFs
1. Token (vale 2 h): `insert into public.agent_upload_tokens (token) values (encode(extensions.gen_random_bytes(24),'hex')) returning token;`
2. Enviar: POST `https://wkkzcjnxyylrqoolmmhi.supabase.co/functions/v1/agent-upload` com JSON `{token, client_id, folder, name, file (base64), mime}`. Nome: "Estratégia · <mês ano>.pdf", "Planejamento de social media · <mês ano>.pdf", "Planejamento de audiovisual · <mês ano>.pdf", "Estratégia de tráfego · <mês ano>.pdf", "Relatório de tráfego · <mês ano>.pdf".
   **Cada PDF sobe junto com o .html de mesmo nome** (mesma pasta, `name` igual trocando `.pdf` por `.html`, `mime: "text/html"`; uma página por `<section class="pg ...">` com o título em `<h1>`). É ele que abre na **Apresentação** (/documento/:id), onde a equipe revisa página a página (OK, Recusar, Virar tarefa). Sem o .html, o botão Apresentação fica desabilitado.
3. O PDF novo chega na lista como "Para aprovar" (o upload zera a aprovação). Quando o Italo toca em **Aprovar e enviar**, a mensagem com o link sai sozinha pelo Wasender (função `agent_doc_approve`). Nunca aprovar no lugar dele.
4. Avisar a equipe: `select public.notify(...)` para o responsável de cada área do cliente (client_team) com link `/clientes/<id>?aba=arquivos`. Nunca mandar nada ao cliente (o envio é sempre de um humano).

## Fim
Uma linha no topo de `peformake-gestao/docs/rotina-diario.md` com os clientes feitos e os que ficaram para o dia seguinte.
