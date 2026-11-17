-- "Gerar mais ideias" (Italo, 17/11): um novo planejamento de UMA aba (ex.: mais peças de social) que SOMA cards novos,
-- sem apagar os existentes e sem repetir o que já foi feito. Pedido fica no quadro; o agente atende na fila (chave "mais").
alter table public.strategy_boards add column if not exists more_requests jsonb not null default '[]'::jsonb;

create or replace function public.strategy_request_more(_board uuid, _tab text, _pedido text default null)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if _tab not in ('audiovisual', 'social', 'trafego', 'atendimento') then raise exception 'Aba inválida' using errcode = 'PF006'; end if;
  update public.strategy_boards set more_requests = coalesce(more_requests, '[]'::jsonb)
      || jsonb_build_array(jsonb_build_object('aba', _tab, 'pedido', nullif(trim(coalesce(_pedido, '')), ''), 'em', now())), updated_at = now()
   where id = _board and status in ('pronto', 'aprovado')
     and not exists (select 1 from jsonb_array_elements(coalesce(more_requests, '[]'::jsonb)) e where e->>'aba' = _tab);
  if not found then raise exception 'Já tem um pedido de mais ideias desta aba na fila, ou a estratégia ainda não está pronta' using errcode = 'PF005'; end if;
end $$;
revoke execute on function public.strategy_request_more(uuid, text, text) from public, anon;
grant execute on function public.strategy_request_more(uuid, text, text) to authenticated;

-- O agente grava os cards novos: soma (nunca apaga), pula título repetido, marca "novo" e tira o pedido da fila.
create or replace function public.strategy_agent_add(_board uuid, _tab text, _cards jsonb)
returns integer language plpgsql security definer set search_path to '' as $$
declare _b public.strategy_boards; _x jsonb; _r jsonb; _n integer := 0; _pos integer;
begin
  if not public.strategy_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  select * into _b from public.strategy_boards where id = _board;
  if not found then raise exception 'Quadro não encontrado'; end if;
  select coalesce(max(position), 0) + 1 into _pos from public.strategy_cards where board_id = _board;
  for _x in select * from jsonb_array_elements(coalesce(_cards, '[]'::jsonb)) loop
    _r := public.strategy_card_row(_x || jsonb_build_object('aba', _tab));
    if not exists (select 1 from public.strategy_cards where board_id = _board and tab = _tab and lower(title) = lower(_r->>'title')) then
      insert into public.strategy_cards (board_id, client_id, month, tab, kind, position, title, data, funnel, serves, goal, inspired, assumed, is_new)
      values (_board, _b.client_id, _b.month, _tab, _r->>'kind', _pos, _r->>'title', coalesce(_r->'data', '{}'::jsonb), _r->>'funnel', _r->>'serves', _r->>'goal', _r->'inspired', _r->>'assumed', true);
      _pos := _pos + 1; _n := _n + 1;
    end if;
  end loop;
  update public.strategy_boards set more_requests = coalesce((select jsonb_agg(e) from jsonb_array_elements(more_requests) e where e->>'aba' <> _tab), '[]'::jsonb),
    status = case when status = 'aprovado' then 'pronto' else status end, updated_at = now()
   where id = _board;
  return _n;
end $$;
revoke execute on function public.strategy_agent_add(uuid, text, jsonb) from public, anon;

-- Fila do agente com a chave "mais" (o que já existe na aba vai junto para não repetir).
create or replace function public.strategy_agent_queue()
returns jsonb language sql stable security definer set search_path to '' as $function$
  select jsonb_build_object(
    'gerar', coalesce((select jsonb_agg(jsonb_build_object('board_id', b.id, 'client_id', b.client_id, 'cliente', c.name, 'mes', to_char(b.month, 'YYYY-MM'), 'faltou_no_briefing', b.missing, 'pedido_em', b.requested_at) order by b.requested_at)
      from public.strategy_boards b join public.clients c on c.id = b.client_id where b.engine = 'agente' and b.status in ('na_fila', 'gerando')), '[]'::jsonb),
    'refazer', coalesce((select jsonb_agg(jsonb_build_object('card_id', s.id, 'client_id', s.client_id, 'cliente', c.name, 'mes', to_char(s.month, 'YYYY-MM'), 'aba', s.tab, 'tipo', s.kind, 'pedido', s.redo_pedido, 'card', jsonb_build_object('titulo', s.title, 'funil', s.funnel, 'serve', s.serves, 'meta', s.goal, 'inspirado', s.inspired, 'suposicao', s.assumed) || s.data) order by s.redo_requested_at)
      from public.strategy_cards s join public.clients c on c.id = s.client_id where s.redo_requested_at is not null), '[]'::jsonb),
    'mais', coalesce((select jsonb_agg(jsonb_build_object('board_id', b.id, 'client_id', b.client_id, 'cliente', c.name, 'mes', to_char(b.month, 'YYYY-MM'), 'aba', e->>'aba', 'pedido', e->>'pedido',
        'ja_existem', (select jsonb_agg(s.title) from public.strategy_cards s where s.board_id = b.id and s.tab = e->>'aba')))
      from public.strategy_boards b join public.clients c on c.id = b.client_id, jsonb_array_elements(b.more_requests) e), '[]'::jsonb),
    'pdf', coalesce((select jsonb_agg(jsonb_build_object('board_id', b.id, 'client_id', b.client_id, 'cliente', c.name, 'mes', to_char(b.month, 'YYYY-MM'), 'nome', b.doc_name, 'html_path', b.html_path) order by b.pdf_requested_at)
      from public.strategy_boards b join public.clients c on c.id = b.client_id where b.pdf_requested_at is not null), '[]'::jsonb))
$function$;

-- Instruções do agente: fila "mais" e autoavaliação (nota mínima 9, no máximo 2 refações, sem inventar dado) — aplicado em 17/11
-- direto em agent_instructions('estrategia-interativa') (texto completo lá).
