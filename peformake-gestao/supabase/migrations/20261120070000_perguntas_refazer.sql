-- Perguntas em profundidade e refazer ao trocar o tipo (20/11). Já aplicado no banco.
alter table public.client_questions add column if not exists cond jsonb;
alter table public.client_assets drop constraint if exists client_assets_folder_check;
alter table public.client_assets add constraint client_assets_folder_check check (folder = any (array['briefing','estrategia','relatorios','design','trafego','audiovisual','social','contratos','outros']));
create or replace function public.brief_questions_reset(_client uuid, _month date)
 returns integer language plpgsql security definer set search_path to '' as $f$
declare m text := to_char(_month, 'YYYY-MM'); n integer;
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.client_questions set status = 'descartada'
   where client_id = _client and pack = 'briefing_mes' and focus = m and status in ('pendente', 'enviada') and answer is null;
  get diagnostics n = row_count;
  return n;
end $f$;
revoke execute on function public.brief_questions_reset(uuid, date) from public, anon;
grant execute on function public.brief_questions_reset(uuid, date) to authenticated;
-- brief_questions_put: grava cond e ignora as descartadas ao ver se o pacote já foi mexido (definição no banco).
