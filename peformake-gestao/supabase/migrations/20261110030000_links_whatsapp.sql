-- Menu: Conversas, Pedidos, Sugestões e Satisfação saíram do Comercial para a área WhatsApp (/whatsapp/...).
-- Atualiza os links gravados pelas funções do banco (avisos e listas). Os endereços antigos continuam abrindo (MovedTo).
do $$
declare _f text; _def text;
begin
  foreach _f in array array['commercial_notify_on_suggestion', 'commercial_notify_on_contact', 'nps_on_message', 'client_requests_history', 'client_requests_feed'] loop
    for _def in select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = _f loop
      execute replace(replace(replace(replace(_def,
        '/comercial/sugestoes', '/whatsapp/sugestoes'), '/comercial/conversas', '/whatsapp/conversas'),
        '/comercial/satisfacao', '/whatsapp/satisfacao'), '/comercial/pedidos', '/whatsapp/pedidos');
    end loop;
  end loop;
end $$;
