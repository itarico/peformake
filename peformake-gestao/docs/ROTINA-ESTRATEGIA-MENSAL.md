# Rotina: estratégia completa do mês seguinte (pronta até o dia 15)

Decisão do Italo (12/11/2026): as estratégias e os relatórios são feitos pelo **agente do Claude** (não pelo motor da API do sistema), e os PDFs sobem na **pasta do cliente** (Arquivos → Estratégia / Social media / Audiovisual / Relatórios). Regra do Italo: **tudo pronto 16 dias antes do mês começar** (até o dia 15). A rotina roda dos dias 11 a 15 e cada dia continua a fila de onde parou.

## Fila
- Clientes ativos (não perdidos, não desativados) com serviço ativo de consultoria, tráfego, social/design ou audiovisual: `select c.id, c.name from clients c where c.is_active and not c.is_lost and (public.client_in_area(c.id,'trafego') or public.client_in_area(c.id,'social') or public.client_in_area(c.id,'audiovisual') or public.client_in_area(c.id,'consultoria'))`.
- Já feito no mês: existe em `client_assets` (source = 'agente', folder = 'estrategia') um arquivo com o nome do mês seguinte. Pule esses.
- No máximo **8 clientes por dia** (custo e qualidade). Prioridade: quem tem mais serviços contratados.

## Um estudo, três documentos (+ relatório)
Para cada cliente, um estudo só, no design aprovado (o mesmo da apresentação "estrategia-nov-dez" do Paulo: identidade Peformake; audiovisual Ellcazo com fundo verde-limão/branco e preto só nos detalhes). Siga as regras do CLAUDE.md.
1. **Estratégia do mês** (pasta `estrategia`): diagnóstico embutido e objetivo (1–3 páginas com números), tese do mês, ofertas e vendas, tráfego em resumo, decisões e próximos passos. Poucas páginas.
2. **Planejamento de social media** (pasta `social`): pilares, ritmo, calendário do mês, peças com título, objetivo, copy e direção de arte. Só se o cliente tem social/design.
3. **Planejamento de audiovisual** (pasta `audiovisual`): estudo pela comunicação do cliente, até 10 vídeos, uma página por vídeo com a prévia (miniatura real) e o link da referência, 3 ideias de abordagem por vídeo, quem fala/quem grava, dia de gravação. Gastronomia: pouca fala, muito desejo. Só se o cliente tem audiovisual.
4. **Estratégia de tráfego** (pasta `trafego`): o que aplicar no mês seguinte: campanhas, públicos, criativos (ligados às peças e vídeos do mês), verba em opções, testes A/B, metas e calendário de subida/pausa. Só se o cliente tem tráfego. É o que aparece no cartão Tráfego.
5. **Relatório do mês** (pasta `relatorios`): estilo Reportei, um por conta, do mês fechado. Só se o cliente tem tráfego. Aparece só na aba Relatórios (nunca no cartão Tráfego).

## Dados
- Supabase `wkkzcjnxyylrqoolmmhi` (só leitura): `consult_docs` (diagnóstico), `client_brand_guides`, `client_brand_voice`, `client_services`, `client_questions` respondidas, `client_scan` e `monthly_scan_extra`, `content_items`, `av_projects`, `traffic_daily_metrics`, `ad_accounts`, `client_directions` (direcionamento da equipe tem prioridade).
- Meta (só leitura; nunca alterar nada): contas de anúncio e Biblioteca de Anúncios pelos conectores ADS.
- Firecrawl (scrapecreators: tiktok/search-videos, instagram/search-reels, instagram/user-posts) para concorrentes e o que está viralizando; teto de 40 créditos por cliente.

## Subir os PDFs
1. Token (vale 2 h): `insert into public.agent_upload_tokens (token) values (encode(extensions.gen_random_bytes(24),'hex')) returning token;`
2. Enviar: POST `https://wkkzcjnxyylrqoolmmhi.supabase.co/functions/v1/agent-upload` com JSON `{token, client_id, folder, name, file (base64), mime}`. Nome: "Estratégia · <mês ano>.pdf", "Planejamento de social media · <mês ano>.pdf", "Planejamento de audiovisual · <mês ano>.pdf", "Estratégia de tráfego · <mês ano>.pdf", "Relatório de tráfego · <mês ano>.pdf".
3. Avisar a equipe: `select public.notify(...)` para o responsável de cada área do cliente (client_team) com link `/clientes/<id>?aba=arquivos`. Nunca mandar nada ao cliente (o envio é sempre de um humano).

## Fim
Uma linha no topo de `peformake-gestao/docs/rotina-diario.md` com os clientes feitos e os que ficaram para o dia seguinte.
