-- Audiovisual só entra no quadro com gravação agendada (Italo, 12/11/2026).
-- O criador automático de "Vídeos do mês" vazios deixa de criar projetos: o projeto nasce no agendamento.
create or replace function public.av_ensure_month(_month date)
returns integer language plpgsql security definer set search_path to '' as $$
begin
  if not public.can_manage_av() then raise exception 'Sem permissao' using errcode = '42501'; end if;
  return 0;
end $$;
