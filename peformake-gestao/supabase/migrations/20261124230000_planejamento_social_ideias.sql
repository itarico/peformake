-- Planejamento do cliente no Social Media (pedido do Italo, 24/11/2026): ideias para fazer com o cliente, conteúdo
-- "faça você mesmo" que o próprio cliente grava e melhorias de desempenho. Quem escreve: o agente do Claude (pedido
-- agent_instructions 'ideias-social') ou a social media à mão. Cada uma vira tarefa, arte ou é recusada.
create table if not exists public.social_ideas (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  month date not null,
  kind text not null check (kind in ('ideia', 'diy', 'desempenho')),
  title text not null check (length(trim(title)) between 3 and 200),
  body text check (length(body) <= 2000),
  source text not null default 'manual' check (source in ('manual', 'agente')),
  status text not null default 'aberta' check (status in ('aberta', 'tarefa', 'arte', 'recusada')),
  routed_id uuid,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists social_ideas_client_month on public.social_ideas (client_id, month);
alter table public.social_ideas enable row level security;
create policy social_ideas_select on public.social_ideas for select to authenticated using ((select public.can_plan_content()));

create or replace function public.social_idea_add(_client uuid, _kind text, _title text, _body text, _month date default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare _id uuid;
begin
  if not public.can_plan_content() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  insert into public.social_ideas (client_id, month, kind, title, body)
  values (_client, coalesce(_month, date_trunc('month', now() at time zone 'America/Sao_Paulo')::date), _kind, trim(_title), nullif(trim(coalesce(_body, '')), ''))
  returning id into _id;
  return _id;
end $$;
revoke execute on function public.social_idea_add(uuid, text, text, text, date) from public, anon;
grant execute on function public.social_idea_add(uuid, text, text, text, date) to authenticated;

-- Decidir: 'tarefa' cria a tarefa da social media; 'arte' só marca (a arte nasce pelo pop-up do briefing); 'recusada'.
create or replace function public.social_idea_decide(_id uuid, _to text)
returns uuid language plpgsql security definer set search_path to '' as $$
declare _i public.social_ideas; _task uuid;
begin
  if not public.can_plan_content() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if _to not in ('tarefa', 'arte', 'recusada') then raise exception 'Opção inválida' using errcode = 'PF006'; end if;
  select * into _i from public.social_ideas where id = _id and status = 'aberta';
  if not found then raise exception 'Já decidida' using errcode = 'PF028'; end if;
  if _to = 'tarefa' then
    insert into public.social_tasks (client_id, title, description, source, network, created_by)
    values (_i.client_id, left(_i.title, 200), _i.body, case when _i.source = 'agente' then 'agente' else 'manual' end, 'instagram', auth.uid())
    returning id into _task;
  end if;
  update public.social_ideas set status = _to, routed_id = _task, decided_at = now() where id = _id;
  return _task;
end $$;
revoke execute on function public.social_idea_decide(uuid, text) from public, anon;
grant execute on function public.social_idea_decide(uuid, text) to authenticated;

-- Estratégia do mês para a aba: foco e o mix de conteúdo da estratégia mensal aprovada ou pronta.
create or replace function public.social_client_strategy(_client uuid, _month date)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
begin
  if not public.can_plan_content() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  return (select jsonb_build_object('foco', s.doc ->> 'foco', 'mix', coalesce(s.doc -> 'plano' -> 'mix', '[]'::jsonb), 'status', s.status)
    from public.monthly_strategies s where s.client_id = _client and s.month = _month and s.doc is not null
    order by s.updated_at desc limit 1);
end $$;
revoke execute on function public.social_client_strategy(uuid, date) from public, anon;
grant execute on function public.social_client_strategy(uuid, date) to authenticated;

insert into public.agent_instructions (name, body) values ('ideias-social',
'Planejamento do Social Media por cliente (aba Planejamento dentro do cliente). Para cada cliente com social media ativo, no mês que vem, escreva em public.social_ideas (client_id, month = 1º dia do mês, source = ''agente''):
- kind ''ideia'': 3 a 5 ideias de ação para a assessoria fazer com o cliente (bastidor, parceria, enquete, evento, collab). Título curto e o que fazer em até 3 linhas.
- kind ''diy'': 3 a 5 conteúdos que o próprio cliente pode gravar com o celular (roteiro em até 4 linhas: abertura, o que mostrar, fala, chamada).
- kind ''desempenho'': 2 a 4 melhorias a partir dos números do Instagram (public.ig_insights do cliente): formato que mais alcança, horário, frequência, cliques no link.
Use o guia de marca e a estratégia do mês (monthly_strategies) do cliente. Português simples, sem jargão. Não repita ideia já existente no mês (mesmo título).')
on conflict (name) do update set body = excluded.body, updated_at = now();
