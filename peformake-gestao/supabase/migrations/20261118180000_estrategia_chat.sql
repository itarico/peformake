-- Estratégia interativa: pedir pelo chat (acréscimo do Italo, 16/11).
-- As regras e o formato de saída ficam em agent_instructions('estrategia-interativa'): a fila do agente e qualquer chat
-- usam o MESMO texto. Com o conector do Supabase o chat lê o briefing (strategy_brief_context) e grava (strategy_chat_submit);
-- sem conector, o pedido completo leva tudo e a tela importa o JSON colado (strategy_import / strategy_import_card).

-- Quem pode: equipe (admin/head) pela tela, ou o agente/chat pelo SQL direto (sem usuário do app).
create or replace function public.strategy_can()
returns boolean language sql stable security definer set search_path to '' as $$
  select coalesce(auth.role(), '') not in ('anon', 'authenticated') or public.consult_can()
$$;

-- Tudo que a geração precisa, curto: briefing, mês, perguntas, reunião, regras, o que funcionou, não repetir, contrato.
create or replace function public.strategy_brief_context(_client uuid, _month date)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare m date := date_trunc('month', _month)::date;
begin
  if not public.strategy_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  return jsonb_build_object(
    'cliente', (select jsonb_build_object('id', c.id, 'nome', c.name, 'segmento', c.segment, 'nicho', c.niche, 'descricao', left(coalesce(c.description, ''), 500), 'instagram', c.instagram, 'site', c.website, 'endereco', c.address) from public.clients c where c.id = _client),
    'mes', to_char(m, 'YYYY-MM'),
    'briefing', coalesce((select data from public.client_briefs where client_id = _client), '{}'::jsonb),
    'briefing_do_mes', coalesce((select data from public.client_brief_months where client_id = _client and month = m), '{}'::jsonb),
    'perguntas_do_mes', coalesce((select jsonb_agg(jsonb_build_object('pergunta', q.question, 'resposta', case when q.status = 'respondida' then q.answer else 'sem resposta' end, 'por', q.answered_via))
      from public.client_questions q where q.client_id = _client and q.pack = 'briefing_mes' and q.focus = to_char(m, 'YYYY-MM')), '[]'::jsonb),
    'anotacoes_da_reuniao', coalesce((select jsonb_agg(left(n.body, 400) order by n.created_at desc) from public.client_meeting_notes n where n.client_id = _client and n.done_at is null), '[]'::jsonb),
    'direcionamento', coalesce((select jsonb_agg(d.area || ': ' || left(d.body, 400)) from public.client_directions d where d.client_id = _client and (d.month is null or d.month = m)), '[]'::jsonb),
    'voz_da_marca', (select to_jsonb(v) - 'client_id' - 'updated_at' from public.client_brand_voice v where v.client_id = _client),
    'regras_de_conteudo_recusas', coalesce((select jsonb_agg(r.rule order by r.created_at desc) from public.content_rules r where r.client_id = _client or r.client_id is null), '[]'::jsonb),
    'o_que_funcionou', (select jsonb_build_object('periodo', t.period_start || ' a ' || t.period_end, 'resumo', left(coalesce(t.summary, ''), 700)) from public.traffic_reports t where t.client_id = _client and t.kind = 'monthly' order by t.period_end desc limit 1),
    'ja_feito_nao_repetir', coalesce((select jsonb_agg(to_char(s.month, 'YYYY-MM') || ' ' || s.tab || ': ' || s.title) from (select * from public.strategy_cards where client_id = _client and month < m and status <> 'recusado' order by month desc limit 60) s), '[]'::jsonb),
    'contrato_so_referencia', coalesce((select jsonb_agg(jsonb_build_object('servico', sv.name, 'area', sv.area, 'qtd', coalesce(cs.deliver_qty, cs.quantity * sv.delivery_qty))) from public.client_services cs join public.services sv on sv.id = cs.service_id where cs.client_id = _client and cs.is_active), '[]'::jsonb),
    'faltou_no_briefing', coalesce((select missing from public.strategy_boards where client_id = _client and month = m), '[]'::jsonb)
  );
end $$;
grant execute on function public.strategy_brief_context(uuid, date) to authenticated;

-- Grava a estratégia vinda do chat (com conector): cria o quadro do mês se faltar.
create or replace function public.strategy_chat_submit(_client uuid, _month date, _cards jsonb, _novos jsonb default '{}'::jsonb)
returns integer language plpgsql security definer set search_path to '' as $$
declare _id uuid;
begin
  if not public.strategy_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if jsonb_typeof(_cards) <> 'array' or jsonb_array_length(_cards) = 0 then raise exception 'Nenhum card' using errcode = 'PF006'; end if;
  insert into public.strategy_boards (client_id, month, status, engine) values (_client, date_trunc('month', _month)::date, 'gerando', 'agente')
  on conflict (client_id, month) do update set status = 'gerando', updated_at = now()
  returning id into _id;
  return public.strategy_agent_submit(_id, _cards, coalesce(_novos, '{}'::jsonb));
end $$;
revoke execute on function public.strategy_chat_submit(uuid, date, jsonb, jsonb) from public, anon;

-- "Colar resultado" na tela (chat sem conector): {cards:[...], novos:{...}}.
create or replace function public.strategy_import(_client uuid, _month date, _payload jsonb)
returns integer language plpgsql security definer set search_path to '' as $$
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  return public.strategy_chat_submit(_client, _month, coalesce(_payload->'cards', '[]'::jsonb), coalesce(_payload->'novos', '{}'::jsonb));
end $$;
grant execute on function public.strategy_import(uuid, date, jsonb) to authenticated;

-- Um card só (refazer pelo chat).
create or replace function public.strategy_import_card(_card uuid, _c jsonb)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.strategy_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if not exists (select 1 from public.strategy_cards where id = _card) then raise exception 'Registro não encontrado' using errcode = 'PF004'; end if;
  perform public.strategy_agent_redo(_card, _c);
end $$;
grant execute on function public.strategy_import_card(uuid, jsonb) to authenticated;

insert into public.agent_instructions (name, body, updated_at) values ('estrategia-interativa', $body$# Estratégia interativa (cards): regras e formato

Você é o estrategista sênior da Peformake, assessoria de marketing de Recife (nunca diga "agência").
Monte a ESTRATÉGIA DO MÊS de UM cliente em CARDS curtos que viram ação. Nada de texto longo: cada card é uma decisão ou uma peça pronta.

## Entrada
- Com o conector do Supabase (projeto wkkzcjnxyylrqoolmmhi): `select public.strategy_brief_context('<client_id>', '<AAAA-MM-01>');`
- Sem conector: o briefing veio junto no pedido (bloco <briefing>).
O briefing vale mais que a sua leitura e que a pesquisa. Pesquise rápido (até 5 buscas) concorrentes agora, posts/vídeos de sucesso do nicho (link e número) e datas do mês.

## Regras de conteúdo (obrigatórias)
- Específico deste cliente: produtos, preços REAIS do briefing, bairros, datas, concorrentes pelo nome. Proibido conselho genérico.
- Só valores reais. Sem preço no briefing: escreva sem o preço e marque em "suposicao". O que veio do que faltou no briefing vai em "suposicao" (1 linha); sem suposição, "".
- Texto autêntico, na voz da marca; nunca copie frases do guia nem das referências.
- Audiovisual sem conteúdo de tráfego (nada de anúncio, impulsionar, campanha no roteiro).
- Só fotos reais do cliente; nunca frame de vídeo como foto; nada de imagem por IA.
- "Peformake", nunca "agência". Nunca falar mal do tráfego pago (o vilão é o marketing "no automático").
- Saúde: regras do conselho da profissão, sem promessa de resultado; antes e depois só com autorização no briefing.
- Obedeça os PROIBIDOS do briefing e as regras_de_conteudo_recusas. Não repita ja_feito_nao_repetir.
- O contrato é só referência: proponha o que faz sentido; a equipe escolhe o que vai para o PDF.
- Português do Brasil, frases curtas. Copy e roteiro são para publicar: texto final.

## Saída: JSON {"cards": [...], "novos": {"concorrentes": [{nome, link, porque}], "referencias": [{link, porque, numero, tipo}]}}
Todo card: aba, tipo, titulo, funil (atrair | provar | objecao | converter), serve (oferta ou tese), meta, inspirado {link, numero}, suposicao. Mais:
- resumo/tese (1): texto (por quê, até 3 frases)
- resumo/objetivo (2 a 4): numero, como_medir
- resumo/oferta: condicao (preço real), quando, porque
- resumo/data: dia, uso
- resumo/decisao (3 a 5): porque
- audiovisual/video (contrato + 2, entre 4 e 8): formato (POV, bastidor, mito x verdade, antes e depois, tutorial, entrevista, trend...; no máximo 2 iguais), ganchos (exatamente 3), roteiro [{cena, fala}] completo, outras_ideias (exatamente 3 outros assuntos com o mesmo material), referencia {link, porque}, cruzamento (o que já deu certo), filmar
- social/peca (6 a 10, foco em ganhar seguidores): formato (carrossel | reels | stories | post), ideia, slides [texto], copy, legenda, cta, ideia_imagem (foto real), referencia_visual {link, porque}, data_sugerida (DD/MM)
- trafego/campanha (1 a 3, se tem tráfego): campanha, objetivo, publico, criativo (título de um card planejado), verba_opcoes [{valor_dia, o_que_esperar}] (3), teste_ab {a, b, como_decidir}
- atendimento/roteiro (1 por oferta): oferta, roteiro_whatsapp [mensagens], objecoes [{objecao, resposta}], follow_up [{quando, mensagem}]
A aba Referências sai do briefing sozinha (os "novos" entram nele com o selo novo, sem duplicar).

## Gravar
- Com conector: `select public.strategy_chat_submit('<client_id>', '<AAAA-MM-01>', '<cards>'::jsonb, '<novos>'::jsonb);` Os aprovados de antes ficam.
- Um card só (refazer): `select public.strategy_import_card('<card_id>', '<card>'::jsonb);`
- Sem conector: devolva SÓ o JSON, num bloco de código; a equipe cola em "Colar resultado".
Nunca envie nada ao cliente.
$body$, now())
on conflict (name) do update set body = excluded.body, updated_at = now();
