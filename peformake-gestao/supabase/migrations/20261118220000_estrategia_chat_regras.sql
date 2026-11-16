-- "Copiar pedido completo" (chat sem conector): a tela lê as regras da geração (agent_instructions 'estrategia-interativa').
create or replace function public.strategy_chat_rules()
returns text language plpgsql stable security definer set search_path to '' as $$
begin
  if not public.consult_can() then raise exception 'Sem permissão' using errcode = '42501'; end if;
  return (select body from public.agent_instructions where name = 'estrategia-interativa');
end $$;
grant execute on function public.strategy_chat_rules() to authenticated;
