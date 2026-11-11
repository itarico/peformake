-- Consultoria: nova parte "Tom e comunicação" + "Experiência do cliente" (referência da Benitius, docs/ESTUDO-ESTRATEGIA-AREAS.md seção 9).
-- Vira uma etapa própria da geração (entre o diagnóstico e o plano) e pode ser refeita sozinha.
alter table public.consult_docs drop constraint if exists consult_docs_stage_check;
alter table public.consult_docs add constraint consult_docs_stage_check check (stage in ('research', 'diagnostico', 'comunicacao', 'plano', 'resumo', 'redo', 'done'));
alter table public.consult_docs drop constraint if exists consult_docs_redo_section_check;
alter table public.consult_docs add constraint consult_docs_redo_section_check check (redo_section in ('resumo', 'diagnostico', 'comunicacao', 'plano', 'riscos', 'do_cliente'));

create or replace function public.consult_redo(_client uuid, _section text) returns void
language plpgsql security definer set search_path to '' as $$
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if _section not in ('resumo', 'diagnostico', 'comunicacao', 'plano', 'riscos', 'do_cliente') then raise exception 'Formato invalido' using errcode = 'PF006'; end if;
  if not public.ai_generation_allowed(_client, 'consultoria') then
    raise exception 'Próxima geração liberada amanhã' using errcode = 'PF012';
  end if;
  update public.consult_docs set status = 'na_fila', stage = 'redo', redo_section = _section, attempts = 0, busy_until = null, error = null, queued_at = now()
   where client_id = _client and status in ('pronto', 'aprovado', 'enviado', 'erro') and research is not null;
  if not found then raise exception 'O diagnóstico ainda não está pronto' using errcode = 'PF005'; end if;
end $$;
grant execute on function public.consult_redo(uuid, text) to authenticated;
