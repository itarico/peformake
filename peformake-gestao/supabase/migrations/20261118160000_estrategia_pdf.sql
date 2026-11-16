-- Estratégia interativa, fase 4: o PDF. "Aprovar e gerar PDF" aprova o quadro, sobe o HTML (modelo fixo, sem IA) na pasta
-- Estratégia do cliente (client_assets) e pede ao agente o PDF (Chromium), que sai com o mesmo nome.
alter table public.strategy_boards add column if not exists pdf_requested_at timestamptz, add column if not exists doc_name text, add column if not exists html_path text;

create or replace function public.strategy_save_html(_board uuid, _path text, _name text, _size bigint)
returns void language plpgsql security definer set search_path to '' as $$
declare _b public.strategy_boards;
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  select * into _b from public.strategy_boards where id = _board;
  if not found or _b.status <> 'aprovado' then raise exception 'A estratégia ainda não está aprovada' using errcode = 'PF005'; end if;
  if _path not like (_b.client_id::text || '/estrategia/%') then raise exception 'Caminho inválido' using errcode = 'PF006'; end if;
  insert into public.client_assets (client_id, folder, name, bucket, path, mime, size_bytes, source, created_by)
  values (_b.client_id, 'estrategia', left(_name, 200), 'client-assets', _path, 'text/html', _size, 'agente', auth.uid())
  on conflict (bucket, path) do update set name = excluded.name, size_bytes = excluded.size_bytes, created_at = now(), approved_at = null, sent_at = null;
  update public.strategy_boards set pdf_requested_at = now(), doc_name = left(_name, 200), html_path = _path, updated_at = now() where id = _board;
end $$;
grant execute on function public.strategy_save_html(uuid, text, text, bigint) to authenticated;

-- A fila do agente ganha os PDFs pedidos.
create or replace function public.strategy_agent_queue()
returns jsonb language sql stable security definer set search_path to '' as $$
  select jsonb_build_object(
    'gerar', coalesce((select jsonb_agg(jsonb_build_object('board_id', b.id, 'client_id', b.client_id, 'cliente', c.name, 'mes', to_char(b.month, 'YYYY-MM'), 'faltou_no_briefing', b.missing, 'pedido_em', b.requested_at) order by b.requested_at)
      from public.strategy_boards b join public.clients c on c.id = b.client_id where b.engine = 'agente' and b.status in ('na_fila', 'gerando')), '[]'::jsonb),
    'refazer', coalesce((select jsonb_agg(jsonb_build_object('card_id', s.id, 'client_id', s.client_id, 'cliente', c.name, 'mes', to_char(s.month, 'YYYY-MM'), 'aba', s.tab, 'tipo', s.kind, 'pedido', s.redo_pedido, 'card', jsonb_build_object('titulo', s.title, 'funil', s.funnel, 'serve', s.serves, 'meta', s.goal, 'inspirado', s.inspired, 'suposicao', s.assumed) || s.data) order by s.redo_requested_at)
      from public.strategy_cards s join public.clients c on c.id = s.client_id where s.redo_requested_at is not null), '[]'::jsonb),
    'pdf', coalesce((select jsonb_agg(jsonb_build_object('board_id', b.id, 'client_id', b.client_id, 'cliente', c.name, 'mes', to_char(b.month, 'YYYY-MM'), 'nome', b.doc_name, 'html_path', b.html_path) order by b.pdf_requested_at)
      from public.strategy_boards b join public.clients c on c.id = b.client_id where b.pdf_requested_at is not null), '[]'::jsonb))
$$;
revoke execute on function public.strategy_agent_queue() from public, anon, authenticated;

-- O agente avisa que o PDF subiu (agent-upload devolve o id do client_assets).
create or replace function public.strategy_agent_pdf_done(_board uuid, _asset uuid)
returns void language sql security definer set search_path to '' as $$
  update public.strategy_boards set pdf_asset_id = _asset, pdf_requested_at = null, updated_at = now() where id = _board;
$$;
revoke execute on function public.strategy_agent_pdf_done(uuid, uuid) from public, anon, authenticated;
