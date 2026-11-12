# Rotina: Coleta das redes (tarefa agendada do Claude com conectores)

Decisão do Italo (12/11/2026): **toda busca nas redes é feita pelo agente do Claude** (tarefa agendada com conectores,
que tem crédito no Firecrawl). A API do sistema só cruza e traz tudo para a estratégia.
Uma rotina só enche as duas filas: o **plano do mês** (`client_scan`) e o **diagnóstico** da Consultoria (`consult_collected`).

## Agenda recomendada (America/Recife)

- **Todo dia às 03:17**: rodada completa (até 10 clientes por rodada).
- **Dia 25 às 22:17**: rodada extra, véspera do plano do mês (o plano roda no dia 26 às 03:23).
- Opcional: 11:47 e 16:47 só para diagnósticos na fila (o diagnóstico espera a coleta por 30 minutos).
- Cron: `CRON_TZ=America/Recife 17 3 * * *` e `CRON_TZ=America/Recife 17 22 25 * *`. Modelo: Sonnet (o trabalho é mecânico, mas os resumos precisam de critério).
- Conectores da tarefa: **Firecrawl**, **Supabase** e **ADS** (Meta). Sessão com o repositório (precisa do `scripts/resumir_coleta.py`).

## Onde fica cada coisa

- `public.client_scan`: uma linha por cliente, mês, fonte e busca (`source`: tiktok | instagram | hashtags | perfis | ads_library | google). O `data` já vem resumido (máximo de 60 KB por linha).
- `public.client_scan_runs`: cliente e mês com a coleta encerrada (a rotina não volta nele).
- RPCs (rodam como postgres pelo `execute_sql`): `client_scan_queue(_month date default null, _limit int default 10)`,
  `client_scan_save(_client, _month, _source, _query, _data jsonb, _credits int default 0)`,
  `client_scan_done(_client, _month, _note, _credits, _partial boolean default false)`.
- `client_scan_save` com `perfis` ou `ads_library` também grava em `consult_collected` quando o cliente tem diagnóstico esperando coleta.
- O motor `monthly-strategy` lê tudo por `public.monthly_scan_extra(client, month)`: usa o mês do plano ou a coleta dos últimos 45 dias.
- Resumidor: `python3 -I scripts/resumir_coleta.py <fonte> <arquivo.json[:N]> [busca]`, com fonte tiktok | instagram | hashtags | perfis | ads_library | meta_ads.

## Prompt da tarefa agendada (copiar inteiro)

```
Você é a rotina "Coleta das redes" da Peformake (assessoria de marketing). Seu trabalho é SÓ LER as redes e guardar um resumo no banco.
NUNCA publique, curta, comente, siga, envie mensagem a ninguém nem altere nada na Meta. Meta: só a Biblioteca de Anúncios (leitura).
Projeto Supabase: wkkzcjnxyylrqoolmmhi. Repositório: peformake-gestao/ (use o script peformake-gestao/scripts/resumir_coleta.py).
Teto desta rodada: 120 créditos do Firecrawl. Some os créditos de cada chamada (campo creditsCost); ao chegar em 110, pare as buscas e feche.

1) Carregue as ferramentas com ToolSearch: "select:mcp__Supabase__execute_sql", "+Firecrawl alexandria" (alexandria_library_read e
   alexandria_library_search) e "+ADS ads_library_search" (use o primeiro conector ADS que responder).
2) Fila: execute_sql → select public.client_scan_queue(null, 10);
   Para os diagnósticos: select public.consult_collect_queue();
   Se as duas vierem vazias ([]), encerre sem fazer mais nada.
   Os clientes com diagnostico_pendente = true vêm primeiro: atenda esses antes.
3) Para cada cliente da fila (na ordem), monte de 3 a 6 buscas curtas, com o nicho/segmento e a cidade (campos niche, segment, city, uf):
   - TikTok: 1 ou 2 buscas, ex.: "pizzaria recife", "hamburgueria são lourenço da mata". Na dúvida, use a capital (Recife).
   - Reels: 1 busca, ex.: "pizzaria recife".
   - Hashtag: 1 só, sem espaço nem acento, ex.: "pizzariarecife". Retorno 404 é normal: siga em frente.
   - Perfis: o @ do próprio cliente (campo instagram ou social_accounts) + até 3 concorrentes LOCAIS (campos concorrentes e
     concorrentes_cadastro; se não houver @, pegue autores locais que aparecerem no TikTok ou Reels da cidade).
     Confira se o perfil é da mesma praça (legendas e hashtags da cidade). Se for de outra cidade, descarte.
   - Biblioteca de Anúncios: ads_library_search (conector ADS, grátis, não gasta Firecrawl) com search_terms = "<nicho> <cidade>"
     e o nome de cada concorrente; countries ["BR"], ad_active_status "ACTIVE", limit 12, scheduled_task_run true.
     Descarte anúncios que não são do ramo (ex.: psiquiatra, embalagens).
   - Se o cliente só tem tráfego (areas.trafego = true e o resto false): pule TikTok, Reels e hashtag; faça só perfis e anúncios.
   - Nicho e cidade iguais aos de um cliente já coletado nesta rodada (ex.: marcas irmãs): NÃO busque de novo. Copie as linhas:
     insert into public.client_scan (client_id, month, source, query, data, credits)
     select '<novo>', month, source, query, data, 0 from public.client_scan where client_id = '<já coletado>' and month = '<mes>' and source in ('tiktok','instagram','hashtags','ads_library')
     on conflict (client_id, month, source, query) do update set data = excluded.data, collected_at = now();
4) Chamadas do Firecrawl (alexandria_library_read, provider "scrapecreators"):
   - tiktok/search-videos {query, date_posted: "this-month" (cidade pequena: "last-3-months"), region: "BR"}: UMA por chamada (em lote, trava).
   - instagram/search-reels {query, date_posted: "last-month"}; instagram/hashtag-posts {hashtag, date_posted: "last-month"};
     instagram/user-posts {handle}: até 3 por chamada.
   - Use timeout 120000. Se der "outcome is uncertain", NÃO repita com outro id: conte 2 créditos por chamada e siga.
   - A resposta vem grande e é salva num arquivo (a ferramenta diz o caminho). NUNCA leia o arquivo inteiro.
5) RESUMA ANTES DE GRAVAR, sempre pelo script (de dentro de peformake-gestao/):
   python3 -I scripts/resumir_coleta.py tiktok <arquivo>                  → {"videos":[...]}
   python3 -I scripts/resumir_coleta.py instagram <arquivo>:N             → {"reels":[...]}     (N = posição da chamada no lote, de 0)
   python3 -I scripts/resumir_coleta.py hashtags <arquivo>:N              → {"posts":[...]}
   python3 -I scripts/resumir_coleta.py perfis <arquivo>:N <handle>       → {"perfil","seguidores","posts":[...]}
   Biblioteca da Meta: salve o JSON do campo "results" num arquivo e rode: python3 -I scripts/resumir_coleta.py meta_ads <arquivo>
   Cada item fica só com: link, autor, data, views, curtidas, comentarios, compartilhamentos, salvos, audio, duracao_s, texto (até 160 caracteres),
   hashtags; nos anúncios: pagina, ativo, dias_no_ar, texto, titulo, cta, link. Lista vazia ou perfil 404: não grave.
6) Grave cada busca (o JSON resumido entre $j$ ... $j$; mês = campo month do item da fila):
   select public.client_scan_save('<client_id>', '<month>', '<tiktok|instagram|hashtags|perfis|ads_library>', '<busca ou handle>', $j$<json>$j$::jsonb, <créditos>);
   Grave várias no mesmo execute_sql. Se der "Resultado grande demais", corte a lista pela metade e grave de novo.
7) Feche o cliente: select public.client_scan_done('<client_id>', '<month>', '<1 linha: o que achou e o que faltou>', <créditos do cliente>, <true se ficou faltando algo por teto>);
8) Diagnóstico (itens de consult_collect_queue): perfis e anúncios gravados no passo 6 já entram no diagnóstico sozinhos.
   Se precisar de algo a mais (ex.: comentários de um post do cliente: instagram/post-comments), grave com
   select public.consult_collect_save('<client_id>', 'instagram_comments', '@perfil', '<url>', $j$<json resumido>$j$::jsonb);
   e feche com select public.consult_collect_done('<client_id>', '<1 linha>');
9) No fim, responda em até 5 linhas: clientes coletados, linhas gravadas, créditos usados e o que deu erro. Nada de textão.
```

## Aprendizados do primeiro teste (12/11/2026, Fornario, VOVINA e Brio Burguer)

- TikTok volta com cerca de 2 MB por busca. Em lote de 3 dá timeout; uma por chamada funciona (2 créditos).
- Reels pelo Google trazem pouca coisa local; TikTok e perfis rendem mais.
- Hashtags locais (#pizzariarecife) deram 404, sem cobrança.
- A Biblioteca da Meta pelo conector ADS é grátis e traz página, título e dias no ar (sem o texto do anúncio).
- Concorrente vindo do diagnóstico pode ser de outra cidade (@pizzaria_cavalcanti_ é de Fortaleza): sempre conferir a praça.
