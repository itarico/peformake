-- Estratégia do mês: link público para o cliente (/apresentacao/mes/:token), como o do diagnóstico.
-- O link só leva o que o cliente pode ver: nada de roteiro/briefing, cargos da equipe, custo, ideias, ajuste, "a confirmar".
-- Frases com recado interno ("a confirmar", "a fechar com", "suposição"...) saem do texto; leituras com recado interno saem inteiras.
-- Só create or replace / if not exists.

alter table public.monthly_strategies add column if not exists share_token text;
alter table public.monthly_strategies add column if not exists share_created_at timestamptz;
create unique index if not exists monthly_strategies_share_token on public.monthly_strategies (share_token) where share_token is not null;

/** Tira as frases que são recado interno. */
create or replace function public.monthly_clean(_t text) returns text
language sql immutable set search_path to '' as $$
  select nullif(trim(coalesce(string_agg(s, ' '), '')), '')
  from regexp_split_to_table(coalesce(_t, ''), '(?<=[.!?])\s+') as s
  where s !~* '(a confirmar|confirmar com|a fechar com|se o cliente confirmar|n[ãa]o ouvid|ouvir o [áa]udio|sem pre[çc]o divulgado antes|suposi[çc][ãa]o|\[confirmar)'
$$;

create or replace function public.monthly_public_payload(_id uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select jsonb_build_object(
    'name', trim(c.name), 'logo_path', c.logo_path, 'month', s.month, 'status', s.status,
    'doc', jsonb_build_object(
      'titulo', s.doc->>'titulo', 'gerado_em', s.doc->>'gerado_em',
      'meta', jsonb_build_object('numero', public.monthly_clean(s.doc#>>'{meta,numero}'), 'texto', public.monthly_clean(s.doc#>>'{meta,texto}')),
      'leitura', coalesce((select jsonb_agg(l) from jsonb_array_elements(coalesce(s.doc->'leitura', '[]')) l
        where (l->>'fato') || ' ' || (l->>'decisao') || ' ' || (l->>'numero') !~* '(a confirmar|confirmar com|a fechar com|n[ãa]o ouvid|ouvir o [áa]udio|suposi[çc][ãa]o)'), '[]'::jsonb),
      'metas_area', coalesce(s.doc->'metas_area', '[]'::jsonb),
      'semanas', coalesce((select jsonb_agg(jsonb_build_object('semana', w->'semana', 'tema', w->>'tema', 'objetivo', public.monthly_clean(w->>'objetivo'), 'datas', coalesce(w->'datas', '[]'::jsonb)))
        from jsonb_array_elements(coalesce(s.doc->'semanas', '[]')) w), '[]'::jsonb),
      'ofertas', coalesce((select jsonb_agg(jsonb_build_object('nome', f->>'nome', 'condicao', public.monthly_clean(f->>'condicao'), 'porque', public.monthly_clean(f->>'porque')))
        from jsonb_array_elements(coalesce(s.doc->'ofertas', '[]')) f), '[]'::jsonb),
      'riscos', coalesce((select jsonb_agg(jsonb_build_object('risco', r->>'risco', 'plano_b', public.monthly_clean(r->>'plano_b')))
        from jsonb_array_elements(coalesce(s.doc->'riscos', '[]')) r where (r->>'risco') !~* '(a confirmar|confirmar com)'), '[]'::jsonb),
      'perguntas', coalesce(s.doc->'perguntas', '[]'::jsonb)
    ),
    'actions', coalesce((select jsonb_agg(jsonb_build_object(
        'id', a.id, 'week', a.week, 'area', a.area, 'title', a.title, 'due_date', a.due_date, 'status', a.status,
        'owner_role', case when lower(trim(coalesce(a.owner_role, ''))) = 'cliente' then 'cliente' else null end
      ) order by a.week, a.position, a.created_at)
      from public.monthly_strategy_actions a where a.strategy_id = s.id and a.status <> 'recusada'), '[]'::jsonb)
  )
  from public.monthly_strategies s join public.clients c on c.id = s.client_id where s.id = _id
$$;
revoke all on function public.monthly_public_payload(uuid) from public, anon, authenticated;

/** Cria (uma vez) o código do link. Só com a estratégia pronta. */
create or replace function public.monthly_share_create(_strategy uuid) returns text
language plpgsql security definer set search_path to '' as $$
declare _t text;
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.monthly_strategies set
    share_token = coalesce(share_token, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')),
    share_created_at = coalesce(share_created_at, now())
  where id = _strategy and status in ('pronto', 'aprovado')
  returning share_token into _t;
  if _t is null then raise exception 'A estratégia ainda não está pronta' using errcode = 'PF005'; end if;
  return _t;
end $$;
revoke all on function public.monthly_share_create(uuid) from public, anon;
grant execute on function public.monthly_share_create(uuid) to authenticated;

/** Abre o link (sem login). Enquanto a IA refaz, mostra "atualizando". */
create or replace function public.monthly_public(_token text) returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare _s public.monthly_strategies;
begin
  if _token is null or length(_token) < 40 then raise exception 'Link inválido' using errcode = 'PF004'; end if;
  select * into _s from public.monthly_strategies where share_token = _token;
  if not found then raise exception 'Link inválido' using errcode = 'PF004'; end if;
  if _s.status not in ('pronto', 'aprovado') then return jsonb_build_object('updating', true); end if;
  return public.monthly_public_payload(_s.id);
end $$;
revoke all on function public.monthly_public(text) from public;
grant execute on function public.monthly_public(text) to anon, authenticated;
