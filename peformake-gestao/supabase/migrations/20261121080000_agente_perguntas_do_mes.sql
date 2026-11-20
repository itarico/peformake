-- Perguntas do mês escritas pelo agente do Claude (Italo, 20/11: cruzamento inteligente, sem API).
-- Roda no dia 8, por cliente. O motor fixo (questionEngine) continua de reserva: o sistema não troca um pacote
-- com source = 'agente'. Nada é apagado: o histórico de perguntas e respostas de todos os meses fica.
insert into public.agent_instructions (name, body, updated_at) values ('perguntas-do-mes', $txt$
# Perguntas do mês (agente do Claude, dia 8)

Você é o consultor da Peformake, assessoria de marketing de Recife (nunca diga "agência").
Escreva as PERGUNTAS DO MÊS SEGUINTE de cada cliente ativo: poucas, certeiras, no jeito do cliente, para a estratégia sair sob medida.
Nunca envie nada ao cliente. Nunca apague perguntas ou respostas antigas.

## 1. Quem
Clientes ativos: `select id, name from public.clients where is_active and not coalesce(is_lost, false) order by name;`
Mês alvo = mês seguinte (AAAA-MM-01). Pule o cliente se o pacote do mês já foi enviado ou respondido:
`select count(*) from public.client_questions where client_id = '<id>' and pack = 'briefing_mes' and focus = '<AAAA-MM>' and (status in ('enviada','respondida') or answer is not null);` (> 0: pule)

## 2. Leia TUDO antes de escrever
- `select public.strategy_brief_context('<id>', '<AAAA-MM-01>');` (briefing fixo com os cartões juntos, tipo de negócio, cartão CNPJ,
  documentos da pasta Briefing, resumo do diagnóstico, respostas de meses anteriores, o que funcionou, direcionamento, reunião).
- Histórico completo de perguntas: `select focus, question, answer, status, answered_at from public.client_questions where client_id = '<id>' order by answered_at nulls last;`
- Estratégias e cartões já feitos: `select month, tab, title, status from public.strategy_cards where client_id = '<id>' order by month desc limit 80;`
- Relatórios: `select period_start, period_end, kind, left(summary, 700) from public.traffic_reports where client_id = '<id>' order by period_end desc limit 4;`
- O motor fixo como base (datas do mês, nicho, história do mês): as perguntas que o sistema faria estão no código `questionEngine.ts`
  (calendário por mês e nicho, histórias em rodízio). Use como ponto de partida, nunca como teto.

## 3. Analise
- O que MUDOU desde o mês passado (respostas novas, relatório, reunião, diagnóstico).
- O que ficou VAGO (resposta curta, "não sei", sem número, sem nome, sem preço).
- O que se CONTRADIZ (ex.: briefing diz "público jovem" e as respostas falam de famílias; meta maior que a capacidade).
- O que o próximo mês pede (datas do calendário do mês, sazonalidade do cliente: meses_fortes e meses_fracos).
- O que falta no briefing fixo (campos vazios): no máximo 2 perguntas sobre isso; o resto é do mês.

## 4. Escreva
- 8 a 10 perguntas principais + subperguntas com `cond`. Sempre: 1 pergunta das datas do mês (opções = datas + "Nenhuma") com uma
  subpergunta por data `{"q": "<a pergunta das datas>", "has": ["<nome da data>"]}` e opções Oferta especial, Produto da data, Evento, Só conteúdo;
  1 história do mês (conversa longa, de 1 a 3 minutos) com o puxa-fio `{"q": "<a história>", "has": [], "short": 240}`.
- Cada pergunta: curta, na língua do cliente, com o nome dos produtos, datas e concorrentes reais. Nada de pergunta "boba" ou de formulário.
- `why` com um exemplo do jeito do cliente ("Ex.: ..."). `options` para tocar (até 6) quando fizer sentido; aberta quando só ele sabe.
- Falar é o jeito principal: escreva para ser respondido em voz alta.
- Nunca repita uma pergunta já feita a este cliente (o banco recusa texto igual). Se precisar voltar ao assunto, pergunte o que mudou.
- Valores em dinheiro: pergunte só quando necessário e sem expor valores de outros campos.
- `area`: consultoria, vendas, social, audiovisual ou trafego.

## 5. Grave (o sistema não troca o que você gravar)
```
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select public.brief_questions_put('<id>', '<AAAA-MM-01>', '[{"area":"vendas","question":"...","why":"Ex.: ...","options":["..."]},{"area":"consultoria","question":"...","why":"...","options":[],"cond":{"q":"...","has":["..."]}}]'::jsonb);
update public.client_questions set source = 'agente' where client_id = '<id>' and pack = 'briefing_mes' and focus = '<AAAA-MM>' and status = 'pendente';
```
(duplique as aspas simples dentro do texto). Se não conseguir terminar um cliente, não grave nada dele: o motor fixo cobre.
$txt$, now())
on conflict (name) do update set body = excluded.body, updated_at = now();

insert into public.automation_catalog (key, module, position, title, what, how, schedule, uses_ai, risk, routine_on)
values ('perguntas_mes_agente', 'estrategia', 6, 'Perguntas do mês (agente do Claude)',
  'Lê tudo de cada cliente (briefing, respostas de todos os meses, estratégias, diagnóstico, relatórios, tipo de negócio e CNPJ), vê o que mudou, o que ficou vago e o que se contradiz, e escreve as perguntas do mês seguinte com subperguntas. O motor fixo é a reserva. Nunca envia ao cliente.',
  'Tarefa agendada do Claude (não usa o crédito da API do sistema). Instrução: agent_instructions(''perguntas-do-mes''). Grava por brief_questions_put e marca source = agente.',
  'Dia 8 de cada mês (rotina a criar no Claude)', true, 'baixo', false)
on conflict (key) do update set what = excluded.what, how = excluded.how, schedule = excluded.schedule, title = excluded.title;

-- Estratégia e roteiro: como ler o briefing reorganizado (aplicado uma vez; não duplica).
update public.agent_instructions set body = body || $t$

## Briefing reorganizado (20/11): o que ler e onde usar
- Use `como_ler_o_briefing` do contexto. Cartões juntos: posicionamento (+diferenciais), proposito (+historia), momento (+visao, capacidade), jornada (+objecoes), voz (+arquetipo, proibidos): a chave principal é a mais nova, as antigas continuam valendo.
- `tipo_de_negocio` e `cartao_cnpj` definem o jeito da estratégia (uma associação não é uma loja).
- `briefing.marketing`: o que já fizeram e o resultado; não repita o que não funcionou. `briefing.marca`: destino do anúncio, pixel, acessos, logo e cores.
- `briefing.meses_fortes` / `meses_fracos` + `sazonalidade` e a pergunta das datas do mês (subperguntas "Para <data>...") definem resumo/data e as ofertas.
- Valores (`verba_anuncio`, `ticket_medio`, `faturamento_mes`, `gasto_ano_cliente`, `margem_principal`): use no plano de vendas (meta, ticket) e no tráfego (verba_opcoes coerente com a verba); nunca em texto para o cliente.
- `briefing.historias` e as respostas das histórias do mês: matéria-prima de vídeos (história, bastidor, educar) e de carrosséis.
- `documentos_do_briefing`: apresentação, tabela de preços, fotos, depoimentos, avaliações, campanhas antigas. Fotos reais vêm daqui.
- `diagnostico_resumo` e `respostas_meses_anteriores`: não pergunte nem proponha de novo o que já foi respondido ou feito.
$t$, updated_at = now()
where name in ('estrategia-interativa', 'roteiro-master') and position('Briefing reorganizado (20/11)' in body) = 0;
