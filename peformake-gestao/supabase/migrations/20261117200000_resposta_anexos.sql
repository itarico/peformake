-- Resposta pela equipe com anexos (foto, arquivo, áudio) e correção de resposta do cliente sem trocar a autoria (Italo, 17/11).
create or replace function public.brief_question_answer(_id uuid, _answer text, _attachments jsonb default null)
returns void language plpgsql security definer set search_path to '' as $function$
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.client_questions set
    answer = nullif(trim(left(coalesce(_answer, ''), 4000)), ''),
    attachments = case when _attachments is null then attachments else coalesce(attachments, '[]'::jsonb) || _attachments end,
    audio_pending = false,
    status = case when nullif(trim(coalesce(_answer, '')), '') is null then (case when sent_to_portal_at is null then 'pendente' else 'enviada' end) else 'respondida' end,
    answered_at = case when status = 'respondida' and answered_via = 'cliente' then answered_at else now() end,
    answered_by = case when status = 'respondida' and answered_via = 'cliente' then answered_by else auth.uid() end,
    answered_via = case when status = 'respondida' and answered_via = 'cliente' then 'cliente' else 'equipe' end,
    updated_at = now()
  where id = _id;
  if not found then raise exception 'Registro não encontrado' using errcode = 'PF004'; end if;
end $function$;
