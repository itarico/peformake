-- Perguntas respondidas podem ser editadas (Italo, 17/11). Só o texto muda: quem respondeu (cliente/equipe),
-- a data e os anexos ficam. "Áudio para ouvir" sai (a equipe já transcreveu/resumiu).
create or replace function public.client_question_edit_answer(_id uuid, _answer text)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if nullif(trim(coalesce(_answer, '')), '') is null then raise exception 'Escreva a resposta.' using errcode = 'PF006'; end if;
  update public.client_questions
     set answer = trim(left(_answer, 4000)), audio_pending = false
   where id = _id and status = 'respondida';
  if not found then raise exception 'Registro não encontrado' using errcode = 'PF004'; end if;
end $$;
revoke execute on function public.client_question_edit_answer(uuid, text) from public, anon;
grant execute on function public.client_question_edit_answer(uuid, text) to authenticated;
