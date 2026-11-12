-- Consultoria: documento que deu erro temporário volta sozinho para a fila (até 2 vezes, 15 min depois).
-- Recusa da IA não volta (precisa de alguém olhar). Nunca fica preso em "gerando": a fila retoma quem parou.
alter table public.consult_docs add column if not exists auto_retries int not null default 0;

create or replace function public.consult_claim()
 returns public.consult_docs
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare _row public.consult_docs; _cap numeric;
begin
  -- 0) Erro temporário volta para a fila (até 2 vezes por geração, 15 min depois).
  update public.consult_docs set status = 'gerando', attempts = 0, busy_until = null,
         auto_retries = auto_retries + 1, error = 'Tentando de novo sozinho depois de uma falha.'
   where status = 'erro' and auto_retries < 2 and coalesce(error, '') not like 'A IA recusou%'
     and coalesce(updated_at, now()) < now() - interval '15 minutes';
  -- 1) Continua quem já está gerando e ninguém está mexendo agora (ou o trabalhador anterior caiu).
  select * into _row from public.consult_docs
   where status = 'gerando' and (busy_until is null or busy_until < now())
   order by queued_at limit 1 for update skip locked;
  if not found then
    -- 2) Começa um novo, se houver vaga e dinheiro.
    if (select count(*) from public.consult_docs where status = 'gerando') >= 2 then return null; end if;
    select monthly_cap_usd into _cap from public.ai_settings where id;
    if public.ai_month_spend() >= coalesce(_cap, 90) then
      update public.consult_docs set status = 'limite' where status = 'na_fila';
      return null;
    end if;
    select * into _row from public.consult_docs d
     where d.status in ('na_fila', 'limite') and public.ai_generation_allowed(d.client_id, 'consultoria')
     order by d.queued_at limit 1 for update skip locked;
    if not found then return null; end if;
    insert into public.ai_generations (client_id, area, kind, section)
    values (_row.client_id, 'consultoria', case when _row.stage = 'redo' then 'secao' else 'completa' end, _row.redo_section);
    _row.status := 'gerando';
    _row.attempts := 0;
    _row.auto_retries := 0;
    _row.started_at := coalesce(_row.started_at, now());
  end if;
  _row.attempts := _row.attempts + 1;
  if _row.attempts > 3 then
    update public.consult_docs set status = 'erro', busy_until = null,
      error = coalesce(nullif(error, 'Tentando de novo sozinho depois de uma falha.'), 'A etapa não terminou depois de 3 tentativas.') where id = _row.id;
    return null;
  end if;
  update public.consult_docs set status = _row.status, attempts = _row.attempts, auto_retries = _row.auto_retries, started_at = _row.started_at,
    busy_until = now() + interval '170 seconds' where id = _row.id;
  _row.busy_until := now() + interval '170 seconds';
  return _row;
end $function$;
